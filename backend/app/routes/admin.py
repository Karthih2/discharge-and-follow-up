"""Management view: monitor the queue, assign reviewers, handle fallback. No clinical edits."""
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlmodel import Session, select

from .. import routing
from ..auth import hash_password, require
from ..db import audit, get_session, sim_now
from ..models import (AuditLog, CallbackRequest, CaregiverAlert, Doctor, Document, Item, ReviewQueue, Task, User)
from ..seed import DEMO_PASSWORD, load_demo_data
from .auth_routes import user_dict
from .clinical import AvailIn, entry_dict, set_availability

router = APIRouter(prefix="/api/admin", dependencies=[Depends(require("management"))])


@router.get("/overview")
def overview(s: Session = Depends(get_session)):
    now = sim_now(s)
    reviews = s.exec(select(ReviewQueue)).all()
    open_r = [r for r in reviews if r.state == "open"]
    tasks = s.exec(select(Task)).all()
    return {
        "patients": len(s.exec(select(User).where(User.role == "patient")).all()),
        "plans": len(s.exec(select(Document)).all()),
        "items": len(s.exec(select(Item)).all()),
        "reviews_open": len(open_r),
        "reviews_high": sum(r.severity == "high" for r in open_r),
        "reviews_unassigned": sum(r.assigned_doctor_id is None for r in open_r),
        "reviews_resolved": len(reviews) - len(open_r),
        "tasks_pending": sum(t.status == "Pending" for t in tasks),
        "tasks_completed": sum(t.status == "Completed" for t in tasks),
        "tasks_overdue": sum(t.status == "Pending" and t.due_at < now for t in tasks),
        "alerts_open": len(s.exec(select(CaregiverAlert).where(CaregiverAlert.acknowledged_at == None)).all()),  # noqa: E711
        "callbacks_open": len(s.exec(select(CallbackRequest).where(CallbackRequest.state == "requested")).all()),
    }


@router.get("/queue")
def queue(state: str = "open", s: Session = Depends(get_session)):
    q = select(ReviewQueue)
    if state != "all":
        q = q.where(ReviewQueue.state == state)
    sev = {"high": 0, "medium": 1, "low": 2}
    rows = sorted(s.exec(q).all(), key=lambda r: (sev.get(r.severity, 3), r.id))
    return [entry_dict(s, r, full=False) for r in rows]


@router.get("/doctors")
def doctors(s: Session = Depends(get_session)):
    out = []
    open_r = s.exec(select(ReviewQueue).where(ReviewQueue.state == "open")).all()
    for d in s.exec(select(Doctor)):
        u = s.get(User, d.user_id)
        out.append({"id": u.id, "name": u.name, "specialty": d.specialty, "available": d.available,
                    "open_items": sum(r.assigned_doctor_id == u.id for r in open_r)})
    return out


@router.put("/doctors/{user_id}/availability")
def doctor_availability(user_id: int, body: AvailIn, s: Session = Depends(get_session)):
    return set_availability(s, user_id, body.available, "management")


class AssignIn(BaseModel):
    doctor_id: int


@router.post("/queue/{rid}/assign")
def assign(rid: int, body: AssignIn, s: Session = Depends(get_session)):
    r = s.get(ReviewQueue, rid)
    d = s.exec(select(Doctor).where(Doctor.user_id == body.doctor_id)).first()
    if not r or not d:
        raise HTTPException(404, "Not found")
    if r.state != "open":
        raise HTTPException(409, "Already resolved")
    r.assigned_doctor_id = body.doctor_id
    _, r.fallback_doctor_id = routing.pick(s, "", {body.doctor_id})
    s.add(r)
    s.commit()
    routing.notify(s, body.doctor_id, r.document_id, "Management assigned a review item to you", "warning")
    audit(s, r.document_id, "management", "assigned", {"review_id": r.id, "doctor": body.doctor_id})
    return {"id": r.id}


@router.get("/audit")
def audit_all(limit: int = 100, s: Session = Depends(get_session)):
    rows = s.exec(select(AuditLog).order_by(AuditLog.id.desc()).limit(min(limit, 500))).all()
    return [{"id": r.id, "document_id": r.document_id, "actor": r.actor, "action": r.action, "detail": r.detail,
             "created_at": r.created_at.isoformat()} for r in rows]


@router.get("/users")
def users(s: Session = Depends(get_session)):
    return [user_dict(u) for u in s.exec(select(User))]


class DoctorIn(BaseModel):
    name: str
    email: str
    password: str
    specialty: str = "general medicine"


@router.post("/doctors")
def add_doctor(body: DoctorIn, s: Session = Depends(get_session)):
    email = body.email.strip().lower()
    if len(body.password) < 8:
        raise HTTPException(422, "Password needs 8 or more characters")
    if s.exec(select(User).where(User.email == email)).first():
        raise HTTPException(409, "This email already has an account")
    u = User(name=body.name.strip(), email=email, password_hash=hash_password(body.password), role="doctor")
    s.add(u)
    s.commit()
    s.refresh(u)
    s.add(Doctor(user_id=u.id, specialty=body.specialty.strip().lower(), phone="044-5550-0299"))
    s.commit()
    audit(s, None, "management", "doctor_added", {"doctor": u.id})
    return user_dict(u)


@router.post("/demo-data")
def demo_data(s: Session = Depends(get_session)):
    return {"loaded": load_demo_data(s)}


@router.get("/callbacks")
def callbacks(s: Session = Depends(get_session)):
    out = []
    for c in s.exec(select(CallbackRequest).order_by(CallbackRequest.id.desc())):
        it, doc, dr = s.get(Item, c.item_id), s.get(Document, c.document_id), s.get(User, c.doctor_id) if c.doctor_id else None
        out.append({"id": c.id, "patient_alias": doc.patient_alias, "item_title": it.title if it else "", "state": c.state,
                    "masked_number": c.patient_number, "doctor": dr.name if dr else None, "created_at": c.created_at.isoformat()})
    return out


def _move_callback(s: Session, cid: int, frm: str, to: str) -> dict:
    c = s.get(CallbackRequest, cid)
    if not c or c.state != frm:
        raise HTTPException(409, f"Callback must be {frm} first")
    c.state = to
    s.add(c)
    s.commit()
    audit(s, c.document_id, "management", f"callback_{to}", {"callback_id": c.id})
    doc = s.get(Document, c.document_id)
    msg = "Your callback is connecting through a masked line" if to == "connecting" else "Callback completed"
    routing.notify(s, doc.owner_id, doc.id, msg)
    return {"id": c.id, "state": c.state}


@router.post("/callbacks/{cid}/start")
def callback_start(cid: int, s: Session = Depends(get_session)):
    return _move_callback(s, cid, "requested", "connecting")


@router.post("/callbacks/{cid}/complete")
def callback_complete(cid: int, s: Session = Depends(get_session)):
    return _move_callback(s, cid, "connecting", "completed")
