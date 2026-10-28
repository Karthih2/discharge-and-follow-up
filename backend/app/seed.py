"""Synthetic demo accounts. Every person, email and phone number here is invented."""
import os
from contextlib import contextmanager
from datetime import date

from sqlmodel import Session, select

from .agents.samples import DEPARTMENT
from .auth import hash_password
from .models import Consent, Doctor, Document, FamilyHub, HubMember, User  # noqa: F401

DEMO_PASSWORD = "demo1234"  # shown on the sign in page for the demo only

# key, name, email, role, language
# key, name, email, role, language, mobile
USERS = [
    ("ramesh", "Ramesh Iyer", "ramesh@code2care.test", "patient", "ta", "+91 90000 00001"),
    ("sunita", "Sunita Verma", "sunita@code2care.test", "patient", "hi", "+91 90000 00002"),
    ("karthik", "Karthik Subramanian", "karthik@code2care.test", "patient", "en", "+91 90000 00003"),
    ("lakshmi", "Lakshmi Narayanan", "lakshmi@code2care.test", "patient", "ta", "+91 90000 00004"),
    ("priya", "Priya Iyer (hub manager)", "priya@code2care.test", "manager", "en", "+91 90000 00005"),
    ("arun", "Arun Iyer (family viewer)", "arun@code2care.test", "family", "en", "+91 90000 00006"),
    ("meera", "Dr. Meera Nair", "meera@code2care.test", "doctor", "en", None),
    ("arjun", "Dr. Arjun Rao", "arjun@code2care.test", "doctor", "en", None),
    ("sana", "Dr. Sana Khan", "sana@code2care.test", "doctor", "en", None),
    ("vikram", "Dr. Vikram Shah", "vikram@code2care.test", "doctor", "en", None),
    ("admin", "Management Admin", "admin@code2care.test", "management", "en", None),
]
DOCTORS = {"meera": ("cardiology", "044-5550-0201"), "arjun": ("general medicine", "044-5550-0202"),
           "sana": ("diabetology", "044-5550-0203"), "vikram": ("orthopaedics", "011-5550-0204")}
SAMPLE_OWNER = {"a": "ramesh", "b": "sunita", "c": "karthik", "d": "lakshmi"}


def _is_demo() -> bool:
    return os.getenv("DEMO", "0") == "1"


def seed_users(s: Session) -> None:
    if s.exec(select(User)).first():
        return
    if _is_demo():
        _seed_demo_users(s)
    else:
        _seed_admin_from_env(s)


def _seed_admin_from_env(s: Session) -> None:
    email = os.getenv("ADMIN_EMAIL", "").strip().lower()
    password = os.getenv("ADMIN_PASSWORD", "")
    if not email:
        raise RuntimeError("ADMIN_EMAIL is required when DEMO is not set")
    if len(password) < 12:
        raise RuntimeError("ADMIN_PASSWORD must be at least 12 characters")
    u = User(name="Admin", email=email, password_hash=hash_password(password), role="management")
    s.add(u)
    s.commit()


def _seed_demo_users(s: Session) -> None:
    ids = {}
    pw = hash_password(DEMO_PASSWORD)
    for key, name, email, role, lang, mobile in USERS:
        u = User(name=name, email=email, password_hash=pw, role=role, language=lang, mobile=mobile)
        s.add(u)
        s.commit()
        s.refresh(u)
        ids[key] = u.id
    for key, (spec, phone) in DOCTORS.items():
        s.add(Doctor(user_id=ids[key], specialty=spec, phone=phone))
    hub = FamilyHub(name="Iyer and Narayanan family", created_by=ids["priya"])
    s.add(hub)
    s.commit()
    s.refresh(hub)
    for key, role in [("priya", "manager"), ("arun", "family"), ("ramesh", "patient"), ("lakshmi", "patient")]:
        s.add(HubMember(hub_id=hub.id, user_id=ids[key], role=role))
    for patient, member, scope in [("ramesh", "priya", "full"), ("ramesh", "arun", "appointments"),
                                   ("lakshmi", "priya", "full"), ("lakshmi", "arun", "none")]:
        s.add(Consent(patient_id=ids[patient], member_id=ids[member], scope=scope))
    s.commit()


@contextmanager
def _fast_fixtures():
    """Demo plans always load from the built-in fixtures: instant, offline, same every time."""
    old = {k: os.environ.get(k) for k in ("MOCK_LLM", "PIPELINE_DELAY")}
    os.environ["MOCK_LLM"], os.environ["PIPELINE_DELAY"] = "1", "0"
    try:
        yield
    finally:
        for k, v in old.items():
            if v is None:
                os.environ.pop(k, None)
            else:
                os.environ[k] = v


def load_demo_data(s: Session) -> list[int]:
    """Runs the pipeline for samples a and d so every role has something to look at."""
    with _fast_fixtures():
        return _load(s)


def _load(s: Session) -> list[int]:
    from .agents.pipeline import run_pipeline
    from .agents.samples import sample_index, sample_text

    out = []
    for key in ("a", "d"):
        owner = s.exec(select(User).where(User.email == f"{SAMPLE_OWNER[key]}@code2care.test")).first()
        if s.exec(select(Document).where(Document.owner_id == owner.id)).first():
            continue
        meta = next(m for m in sample_index() if m["key"] == key)
        doc = Document(owner_id=owner.id, title=meta["title"], patient_alias=meta["patient_alias"],
                       discharge_date=date.fromisoformat(meta["discharge_date"]), city=meta["city"],
                       pincode=meta["pincode"], preferred_language=owner.language, raw_text=sample_text(key),
                       department=DEPARTMENT[key], pii_check_passed=True)
        s.add(doc)
        s.commit()
        s.refresh(doc)
        for _ in run_pipeline(doc.id):
            pass
        out.append(doc.id)
    return out
