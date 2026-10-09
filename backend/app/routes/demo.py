"""Demo mode helpers. Only active when DEMO=1 (set by run_demo.bat). Never enabled in a normal run."""
import os

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlmodel import Session, SQLModel, select

from .. import settings
from ..auth import make_token
from ..db import engine, get_session, init_db, new_session
from ..models import User
from ..seed import load_demo_data, seed_users
from ..seed_demo import seed_demo_extras
from .auth_routes import user_dict

router = APIRouter(prefix="/api")

# key, email, portal, path, one line for the presenter
PERSONAS = [
    ("ramesh", "ramesh@code2care.test", "patient", "/patient", "Patient. Heart attack plan, Tamil by default."),
    ("lakshmi", "lakshmi@code2care.test", "patient", "/patient", "Patient. The unclear summary, many items held for a doctor."),
    ("priya", "priya@code2care.test", "manager", "/family", "Hub manager. Full plan, can tick tasks, gets alerts."),
    ("arun", "arun@code2care.test", "family", "/family", "Family viewer. Appointments only, grey locked cards."),
    ("meera", "meera@code2care.test", "doctor", "/doctor/", "Doctor. Cardiology review queue."),
    ("arjun", "arjun@code2care.test", "doctor", "/doctor/", "Doctor. General medicine queue."),
    ("kavya", "kavya@code2care.test", "doctor", "/doctor/", "Doctor. Neurology queue."),
    ("deepak", "deepak@code2care.test", "patient", "/patient", "Patient in Bengaluru. COPD plan, partly shared with a hub."),
    ("sanjay", "sanjay@code2care.test", "manager", "/family", "Hub manager for the Hegde family."),
    ("admin", "admin@code2care.test", "management", "/management/", "Management. Assign, fallback, callbacks, audit."),
]


def demo_on() -> bool:
    return os.getenv("DEMO", "0") == "1"


def need_demo():
    if not demo_on():
        raise HTTPException(404, "Not found")


@router.get("/meta")
def meta():
    return {"hospital": "Code2Care", "demo": demo_on(), "mock_llm": settings.mock_llm()}


@router.get("/demo/personas", dependencies=[Depends(need_demo)])
def personas(s: Session = Depends(get_session)):
    names = {u.email: u.name for u in s.exec(select(User))}
    return [{"key": k, "name": names.get(e, k), "role": r, "path": p, "blurb": b} for k, e, r, p, b in PERSONAS]


class PickIn(BaseModel):
    key: str


@router.post("/demo/login", dependencies=[Depends(need_demo)])
def demo_login(body: PickIn, s: Session = Depends(get_session)):
    row = next((p for p in PERSONAS if p[0] == body.key), None)
    u = s.exec(select(User).where(User.email == row[1])).first() if row else None
    if not u:
        raise HTTPException(404, "Unknown persona")
    return {"token": make_token(u), "user": user_dict(u), "path": row[3]}


@router.post("/demo/reset", dependencies=[Depends(need_demo)])
def demo_reset():
    """Wipes the demo database and loads it again, so a run can start clean."""
    SQLModel.metadata.drop_all(engine)
    init_db()
    with new_session() as s:
        seed_users(s)
        load_demo_data(s)
        seed_demo_extras(s)
    return {"ok": True}
