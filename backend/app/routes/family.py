"""Family hub, consent, notifications, providers and the demo clock."""
from datetime import date as Date
from datetime import datetime, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlmodel import Session, select

from .. import routing
from ..agents.escalation import run_escalation
from ..auth import current_user, hash_password, require
from ..db import audit, set_setting, sim_today, get_session
from ..models import (CaregiverAlert, Consent, Document, FamilyHub, HubMember, Item, Notification, Provider, User)
from ..seed import DEMO_PASSWORD
from .auth_routes import user_dict
from .plans import doc_dict, provider_dict

router = APIRouter(prefix="/api")
SCOPES = ("full", "appointments", "reminders", "none")


def _hub_of(s: Session, u: User) -> FamilyHub | None:
    m = s.exec(select(HubMember).where(HubMember.user_id == u.id)).first()
    return s.get(FamilyHub, m.hub_id) if m else None


@router.get("/hub")
def my_hub(u: User = Depends(require("patient", "manager", "family")), s: Session = Depends(get_session)):
    hub = _hub_of(s, u)
    if not hub:
        return {"hub": None, "members": []}
    members = []
    for m in s.exec(select(HubMember).where(HubMember.hub_id == hub.id)):
        mu = s.get(User, m.user_id)
        row = {"member_id": mu.id, "name": mu.name, "email": mu.email, "role": m.role}
        if u.role == "patient" and m.role in ("manager", "family"):
            c = s.exec(select(Consent).where(Consent.patient_id == u.id, Consent.member_id == mu.id)).first()
            row["scope"] = c.scope if c else "none"
        members.append(row)
    return {"hub": {"id": hub.id, "name": hub.name}, "members": members}


class MemberIn(BaseModel):
    name: str
    email: str
    role: str  # patient, family, manager


@router.post("/hub/members")
def add_member(body: MemberIn, u: User = Depends(require("manager")), s: Session = Depends(get_session)):
    hub = _hub_of(s, u)
    if not hub:
        raise HTTPException(404, "No hub yet")
    if body.role not in ("patient", "family", "manager"):
        raise HTTPException(422, "Role must be patient, family or manager")
    email = body.email.strip().lower()
    mu = s.exec(select(User).where(User.email == email)).first()
    if not mu:
        mu = User(name=body.name.strip(), email=email, password_hash=hash_password(DEMO_PASSWORD), role=body.role)
        s.add(mu)
        s.commit()
        s.refresh(mu)
    elif mu.role != body.role:
        raise HTTPException(409, f"This email already belongs to a {mu.role}")
    if s.exec(select(HubMember).where(HubMember.hub_id == hub.id, HubMember.user_id == mu.id)).first():
        raise HTTPException(409, "Already in the hub")
    s.add(HubMember(hub_id=hub.id, user_id=mu.id, role=body.role))
    s.commit()
    audit(s, None, f"user:{u.id}", "hub_member_added", {"member": mu.id, "role": body.role})
    routing.notify(s, mu.id, None, f"{u.name} added you to the {hub.name} hub")
    return user_dict(mu)


class ConsentIn(BaseModel):
    member_id: int
    scope: str


@router.put("/consent")
def set_consent(body: ConsentIn, u: User = Depends(require("patient")), s: Session = Depends(get_session)):
    if body.scope not in SCOPES:
        raise HTTPException(422, "scope must be full, appointments, reminders or none")
    hub = _hub_of(s, u)
    ok = hub and s.exec(select(HubMember).where(HubMember.hub_id == hub.id, HubMember.user_id == body.member_id,
                                                 HubMember.role.in_(["manager", "family"]))).first()
    if not ok:
        raise HTTPException(404, "That person is not in your hub")
    c = s.exec(select(Consent).where(Consent.patient_id == u.id, Consent.member_id == body.member_id)).first()
    if not c:
        c = Consent(patient_id=u.id, member_id=body.member_id)
    c.scope, c.updated_at = body.scope, datetime.now()
    s.add(c)
    s.commit()
    audit(s, None, f"user:{u.id}", "consent_changed", {"member": body.member_id, "scope": body.scope})
    routing.notify(s, body.member_id, None, f"{u.name} changed what they share with you: {body.scope}")
    return {"member_id": body.member_id, "scope": body.scope}


@router.get("/family/patients")
def family_patients(u: User = Depends(require("manager", "family")), s: Session = Depends(get_session)):
    out = []
    for c in s.exec(select(Consent).where(Consent.member_id == u.id, Consent.scope != "none")):
        p = s.get(User, c.patient_id)
        docs = s.exec(select(Document).where(Document.owner_id == p.id).order_by(Document.id.desc())).all()
        ids = [d.id for d in docs]
        alerts = s.exec(select(CaregiverAlert).where(CaregiverAlert.document_id.in_(ids or [0]),
                                                      CaregiverAlert.acknowledged_at == None)).all() if c.scope != "appointments" else []  # noqa: E711
        out.append({"patient": {"id": p.id, "name": p.name}, "scope": c.scope, "documents": [doc_dict(d) for d in docs],
                    "open_alerts": len(alerts)})
    return out


@router.post("/alerts/{alert_id}/ack")
def ack_alert(alert_id: int, u: User = Depends(require("manager")), s: Session = Depends(get_session)):
    a = s.get(CaregiverAlert, alert_id)
    doc = s.get(Document, a.document_id) if a else None
    c = s.exec(select(Consent).where(Consent.patient_id == doc.owner_id, Consent.member_id == u.id)).first() if doc else None
    if not a or not c or c.scope not in ("full", "reminders"):
        raise HTTPException(404, "Alert not found")
    a.acknowledged_at = datetime.now()
    s.add(a)
    s.commit()
    audit(s, a.document_id, f"user:{u.id}", "alert_acknowledged", {"alert_id": a.id})
    return {"id": a.id}


# ---------- notifications ----------
@router.get("/notifications")
def notifications(u: User = Depends(current_user), s: Session = Depends(get_session)):
    rows = s.exec(select(Notification).where(Notification.user_id == u.id).order_by(Notification.id.desc()).limit(30)).all()
    return [{"id": n.id, "message": n.message, "level": n.level, "document_id": n.document_id, "read": n.read,
             "created_at": n.created_at.isoformat()} for n in rows]


@router.post("/notifications/read")
def mark_read(u: User = Depends(current_user), s: Session = Depends(get_session)):
    for n in s.exec(select(Notification).where(Notification.user_id == u.id, Notification.read == False)):  # noqa: E712
        n.read = True
        s.add(n)
    s.commit()
    return {"ok": True}


# ---------- providers and demo clock ----------
@router.get("/providers")
def providers(city: Optional[str] = None, type: Optional[str] = None, q: Optional[str] = None,
              _: User = Depends(current_user), s: Session = Depends(get_session)):
    rows = s.exec(select(Provider)).all()
    if city:
        rows = [p for p in rows if p.city.lower() == city.lower()]
    if type:
        rows = [p for p in rows if p.type == type]
    if q:
        rows = [p for p in rows if q.lower() in (p.name + " " + p.specialties).lower()]
    return [provider_dict(p) for p in rows]


class ClockIn(BaseModel):
    days: Optional[int] = None
    date: Optional[Date] = None


@router.get("/demo/clock")
def get_clock(_: User = Depends(current_user), s: Session = Depends(get_session)):
    return {"today": sim_today(s).isoformat()}


@router.post("/demo/clock")
def move_clock(body: ClockIn, u: User = Depends(current_user), s: Session = Depends(get_session)):
    new = body.date or (sim_today(s) + timedelta(days=body.days or 0))
    set_setting(s, "simulated_today", new.isoformat())
    counts = run_escalation(s)
    audit(s, None, f"user:{u.id}", "clock_moved", {"today": new.isoformat(), **counts})
    return {"today": new.isoformat(), "escalation": counts}
