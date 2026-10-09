import csv
import logging
import time
from datetime import date, datetime, timedelta

from sqlalchemy import event
from sqlmodel import Session, SQLModel, create_engine, select

from . import settings
from .models import AuditLog, Provider, Setting

log = logging.getLogger("carebridge.db")
engine = create_engine(settings.DB_URL, connect_args={"check_same_thread": False})


@event.listens_for(engine, "connect")
def _pragmas(conn, _):
    """WAL with NORMAL sync: many small writes (a pipeline run, the demo seed) stay fast and safe."""
    cur = conn.cursor()
    cur.execute("PRAGMA journal_mode=WAL")
    cur.execute("PRAGMA synchronous=NORMAL")
    cur.close()


def new_session() -> Session:
    """No expire on commit: objects stay readable after a save, so there is no re-read per row."""
    return Session(engine, expire_on_commit=False)


def get_session():
    with new_session() as session:
        yield session


_today: date | None = None  # cached demo clock, kept in step by set_setting
_t0 = time.monotonic()


def clock_now() -> datetime:
    """Simulated now: 07:00 on the simulated day plus the seconds since the clock was set. New rows are stamped with this."""
    global _today
    if _today is None:
        with new_session() as s:
            _today = date.fromisoformat(get_setting(s, "simulated_today"))
    return datetime.combine(_today, datetime.min.time()).replace(hour=7) + timedelta(seconds=min(time.monotonic() - _t0, 43200))


def pairs(s: Session, stmt) -> dict:
    """Rows of two columns as a dict."""
    return {a: b for a, b in s.exec(stmt).all()}


def get_setting(session: Session, key: str) -> str:
    row = session.get(Setting, key)
    return row.value if row else settings.DEFAULT_SETTINGS[key]


def set_setting(session: Session, key: str, value: str) -> None:
    global _today, _t0
    if key == "simulated_today":
        _today, _t0 = date.fromisoformat(value), time.monotonic()
    row = session.get(Setting, key)
    if row:
        row.value = value
    else:
        row = Setting(key=key, value=value)
    session.add(row)
    session.commit()


def sim_today(session: Session) -> date:
    return date.fromisoformat(get_setting(session, "simulated_today"))


def sim_now(session: Session) -> datetime:
    """Simulated 'now': 07:00 on the simulated today."""
    return datetime.combine(sim_today(session), datetime.min.time()).replace(hour=7)


def audit(session: Session, document_id, actor: str, action: str, detail: dict | None = None) -> None:
    session.add(AuditLog(document_id=document_id, actor=actor, action=action, detail=detail or {}))
    session.commit()


# Column aliases for an external "Care Provider Finder" dataset.
_ALIASES = {
    "name": ["name", "provider_name", "provider", "facility_name", "facility"],
    "type": ["type", "provider_type", "facility_type", "category"],
    "specialties": ["specialties", "specialty", "specialities", "speciality", "services"],
    "city": ["city", "district", "town"],
    "pincode": ["pincode", "pin", "pin_code", "zip", "postal_code"],
    "lat": ["lat", "latitude"],
    "lng": ["lng", "lon", "long", "longitude"],
    "languages": ["languages", "language"],
    "insurance": ["insurance", "insurance_accepted", "schemes"],
    "open_days": ["open_days", "days_open", "working_days", "opening_days"],
    "phone": ["phone", "contact", "phone_number", "telephone"],
}


def _provider_file():
    for p in settings.DATA_DIR.glob("*.csv"):
        n = p.name.lower().replace(" ", "").replace("_", "")
        if "careproviderfinder" in n:
            return p
    return settings.DATA_DIR / "providers.csv"


def load_providers(session: Session) -> int:
    path = _provider_file()
    if not path.exists():
        log.warning("No provider file at %s", path)
        return 0
    with open(path, newline="", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        cols = {c.lower().strip(): c for c in (reader.fieldnames or [])}
        mapping = {}
        for field, names in _ALIASES.items():
            for n in names:
                if n in cols:
                    mapping[field] = cols[n]
                    break
        unmapped = [c for c in cols.values() if c not in mapping.values()]
        if unmapped:
            log.warning("Provider file %s: unmapped columns %s", path.name, unmapped)
        count = 0
        for row in reader:
            def g(field, default=""):
                return (row.get(mapping.get(field, ""), "") or default).strip()
            try:
                session.add(Provider(
                    name=g("name"), type=g("type", "clinic").lower(), specialties=g("specialties"),
                    city=g("city"), pincode=g("pincode"), lat=float(g("lat", "0") or 0),
                    lng=float(g("lng", "0") or 0), languages=g("languages", "en"),
                    insurance=g("insurance"), open_days=g("open_days", "Mon-Sat"),
                    phone=g("phone"), synthetic=True,
                ))
                count += 1
            except ValueError:
                log.warning("Skipping provider row with bad numbers: %s", row)
        session.commit()
    return count


def _reset_if_old_schema() -> None:
    """Demo database from an older version has no users table: start fresh (synthetic data only)."""
    from sqlalchemy import inspect

    insp = inspect(engine)
    names = insp.get_table_names()

    def stale() -> bool:
        for table in SQLModel.metadata.sorted_tables:
            if table.name not in names:
                return True
            have = {c["name"] for c in insp.get_columns(table.name)}
            if {c.name for c in table.columns} - have:
                return True
        return False

    if names and stale():
        log.warning("Old demo database found. Recreating it (synthetic data only).")
        SQLModel.metadata.drop_all(engine)
        with engine.begin() as conn:
            for t in names:
                conn.exec_driver_sql(f'DROP TABLE IF EXISTS "{t}"')


# Every foreign key and every status or date column used in a filter. IF NOT EXISTS lets old databases pick them up.
INDEXES = {
    "documents": ["owner_id", "department", "discharge_date"],
    "items": ["document_id", "status"],
    "item_texts": ["item_id"],
    "tasks": ["document_id", "item_id", "status", "due_at"],
    "reminders": ["task_id"],
    "review_queue": ["document_id", "item_id", "state", "assigned_doctor_id", "fallback_doctor_id", "created_at", "resolved_at"],
    "audit_log": ["document_id", "actor", "action", "created_at"],
    "provider_matches": ["item_id", "provider_id"],
    "caregiver_alerts": ["document_id", "task_id", "acknowledged_at"],
    "pipeline_runs": ["document_id"],
    "hub_members": ["hub_id", "user_id"],
    "consents": ["patient_id", "member_id"],
    "doctors": ["user_id"],
    "notifications": ["user_id"],
    "callback_requests": ["document_id", "item_id", "doctor_id", "state", "created_at"],
    "source_lines": ["document_id"],
    "users": ["role"],
}


def create_indexes() -> None:
    with engine.begin() as conn:
        for table, cols in INDEXES.items():
            for c in cols:
                conn.exec_driver_sql(f'CREATE INDEX IF NOT EXISTS "ix_{table}_{c}" ON "{table}" ("{c}")')


def init_db() -> None:
    global _today, _t0
    _today, _t0 = None, time.monotonic()
    _reset_if_old_schema()
    SQLModel.metadata.create_all(engine)
    create_indexes()
    with new_session() as session:
        for k, v in settings.DEFAULT_SETTINGS.items():
            if not session.get(Setting, k):
                session.add(Setting(key=k, value=v))
        session.commit()
        if not session.exec(select(Provider)).first():
            n = load_providers(session)
            log.info("Seeded %d synthetic providers", n)
