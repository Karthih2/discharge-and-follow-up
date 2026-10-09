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
USERS = [
    ("ramesh", "Ramesh Iyer", "ramesh@code2care.test", "patient", "ta"),
    ("sunita", "Sunita Verma", "sunita@code2care.test", "patient", "hi"),
    ("karthik", "Karthik Subramanian", "karthik@code2care.test", "patient", "en"),
    ("lakshmi", "Lakshmi Narayanan", "lakshmi@code2care.test", "patient", "ta"),
    ("priya", "Priya Iyer (hub manager)", "priya@code2care.test", "manager", "en"),
    ("arun", "Arun Iyer (family viewer)", "arun@code2care.test", "family", "en"),
    ("meera", "Dr. Meera Nair", "meera@code2care.test", "doctor", "en"),
    ("arjun", "Dr. Arjun Rao", "arjun@code2care.test", "doctor", "en"),
    ("sana", "Dr. Sana Khan", "sana@code2care.test", "doctor", "en"),
    ("vikram", "Dr. Vikram Shah", "vikram@code2care.test", "doctor", "en"),
    ("admin", "Management Admin", "admin@code2care.test", "management", "en"),
]
DOCTORS = {"meera": ("cardiology", "044-5550-0201"), "arjun": ("general medicine", "044-5550-0202"),
           "sana": ("diabetology", "044-5550-0203"), "vikram": ("orthopaedics", "011-5550-0204")}
SAMPLE_OWNER = {"a": "ramesh", "b": "sunita", "c": "karthik", "d": "lakshmi"}


def seed_users(s: Session) -> None:
    if s.exec(select(User)).first():
        return
    ids = {}
    pw = hash_password(DEMO_PASSWORD)  # one salt for every demo account: instant, and the demo password is public anyway
    for key, name, email, role, lang in USERS:
        u = User(name=name, email=email, password_hash=pw, role=role, language=lang)
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
    # Patients consent. Ramesh: Priya full, Arun appointments only. Lakshmi: Priya full, Arun none.
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
