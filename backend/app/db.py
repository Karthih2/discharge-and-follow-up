import csv
import logging
from datetime import date, datetime

from sqlmodel import Session, SQLModel, create_engine, select

from . import settings
from .models import AuditLog, Provider, Setting

log = logging.getLogger("carebridge.db")
engine = create_engine(settings.DB_URL, connect_args={"check_same_thread": False})


def get_session():
    with Session(engine) as session:
        yield session


def get_setting(session: Session, key: str) -> str:
    row = session.get(Setting, key)
    return row.value if row else settings.DEFAULT_SETTINGS[key]


def set_setting(session: Session, key: str, value: str) -> None:
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


def init_db() -> None:
    _reset_if_old_schema()
    SQLModel.metadata.create_all(engine)
    with Session(engine) as session:
        for k, v in settings.DEFAULT_SETTINGS.items():
            if not session.get(Setting, k):
                session.add(Setting(key=k, value=v))
        session.commit()
        if not session.exec(select(Provider)).first():
            n = load_providers(session)
            log.info("Seeded %d synthetic providers", n)
