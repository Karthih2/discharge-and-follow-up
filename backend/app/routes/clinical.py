"""Doctor review queue, availability and callbacks."""
import re
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlmodel import Session, select

from .. import routing
from ..agents.planner import plan_item, plan_medicines
from ..agents import med_template
from ..agents.simplifier import translate_edit
from ..agents.triage import triage_rules
from .plans import PLAIN
from ..auth import require
from ..db import audit, get_session, get_setting
from ..models import CallbackRequest, Doctor, Document, Item, ItemText, ReviewQueue, User

router = APIRouter(prefix="/api")
SEV = {"high": 0, "medium": 1, "low": 2}


def entry_dict(s: Session, r: ReviewQueue, full: bool = True) -> dict:
    it = s.get(Item, r.item_id)
    doc = s.get(Document, r.document_id)
    doc_user = s.get(User, doc.owner_id) if doc else None
    ad = s.get(User, r.assigned_doctor_id) if r.assigned_doctor_id else None
    fd = s.get(User, r.fallback_doctor_id) if r.fallback_doctor_id else None
    out = {"id": r.id, "item_id": r.item_id, "document_id": r.document_id, "patient_alias": doc.patient_alias if doc else "",
           "reason": r.reason, "severity": r.severity, "state": r.state, "reviewer_note": r.reviewer_note,
           "assigned_doctor": {"id": ad.id, "name": ad.name} if ad else None,
           "fallback_doctor": {"id": fd.id, "name": fd.name} if fd else None,
           "codes": r.codes or [], "reason_plain": [PLAIN.get(c, c) for c in (r.codes or [])],
           "age_hours": round((datetime.now() - r.created_at).total_seconds() / 3600, 1),
           "created_at": r.created_at.isoformat()}
    if it:
        out["item"] = {"category": it.category, "title": it.title, "approved_fields": it.approved_fields or {},
                       "date_raw": it.date_raw, "date_resolved": it.date_resolved.isoformat() if it.date_resolved else None,
                       "time_of_day": it.time_of_day, "status": it.status, "confidence": it.confidence}
        if full:  # management sees the queue but not the clinical text
            out["item"]["original_text"] = it.original_text
    if doc_user and full:
        out["patient_language"] = doc_user.language
    return out


@router.get("/review")
def review_queue(document_id: Optional[int] = None, state: str = "open", u: User = Depends(require("doctor", "management")),
                 s: Session = Depends(get_session)):
    q = select(ReviewQueue)
    if document_id:
        q = q.where(ReviewQueue.document_id == document_id)
    if state != "all":
        q = q.where(ReviewQueue.state == state)
    rows = s.exec(q).all()
    if u.role == "doctor":
        rows = [r for r in rows if u.id in (r.assigned_doctor_id, r.fallback_doctor_id)]
    if u.role == "doctor":
        rows.sort(key=lambda r: r.id)  # oldest first
    else:
        rows.sort(key=lambda r: (SEV.get(r.severity, 3), r.id))
    return [entry_dict(s, r, full=u.role == "doctor") for r in rows]


class Fields(BaseModel):
    """Missing medicine values a doctor fills in. The result is built from the fixed template."""
    dose: Optional[str] = None
    frequency: Optional[int] = None  # times a day: 1, 2 or 3
    timing: list[str] = []
    duration_days: Optional[int] = None
    instructions: Optional[str] = None  # for example "after food"


class ReviewIn(BaseModel):
    action: str  # approve, edit, reject
    note: Optional[str] = None
    edited_text: Optional[str] = None
    fields: Optional[Fields] = None


def _apply_fields(s: Session, item: Item, f: Fields) -> None:
    """Compose the corrected medicine line from the fields and run the safety gate on it again."""
    bad = [t for t in f.timing if t not in ("morning", "afternoon", "night")]
    if not f.dose or not f.frequency or f.frequency not in (1, 2, 3) or not f.timing or bad:
        raise HTTPException(422, "Dose, times a day (1 to 3) and at least one time of day are needed")
    drug = re.sub(r"\s+", " ", re.sub(r"\d+(?:\.\d+)?\s*(?:mg|ml|mcg|units?|iu|g)\b", "", item.title, flags=re.I)).strip() or item.title
    name = f"{drug} {f.dose.strip()}"
    food = "before" if f.instructions and re.search(r"before", f.instructions, re.I) else "after" if f.instructions and re.search(r"after", f.instructions, re.I) else None
    fields = {"name": name, "freq": f.frequency, "slots": f.timing, "food": food, "days": str(f.duration_days) if f.duration_days else None}
    texts = med_template.build(fields)
    composed = texts["en"] + (f" {f.instructions}" if f.instructions else "")
    flags = triage_rules([{"category": "medication", "original_text": composed, "date_raw": None, "date_resolved": None, "confidence": 1.0, "verify_reasons": []}])[0]
    if flags:
        raise HTTPException(422, "Still unclear: " + "; ".join(x.reason for x in flags))
    for t in s.exec(select(ItemText).where(ItemText.item_id == item.id)):
        s.delete(t)
    for lang, text in texts.items():
        s.add(ItemText(item_id=item.id, language=lang, simple_text=text, numbers_verified=True))
    item.title = name
    item.time_of_day = ",".join(f.timing)
    item.approved_fields = {"dose": f.dose.strip(), "frequency": f.frequency, "timing": f.timing,
                            "duration_days": f.duration_days, "instructions": f.instructions}
    s.add(item)


@router.post("/review/{rid}/resolve")
def resolve_review(rid: int, body: ReviewIn, u: User = Depends(require("doctor")), s: Session = Depends(get_session)):
    r = s.get(ReviewQueue, rid)
    if not r or u.id not in (r.assigned_doctor_id, r.fallback_doctor_id):
        raise HTTPException(404, "Review entry not found")
    if r.state != "open":
        raise HTTPException(409, "Already resolved")
    if body.action not in ("approve", "edit", "reject"):
        raise HTTPException(422, "action must be approve, edit, or reject")
    item = s.get(Item, r.item_id)
    doc = s.get(Document, r.document_id)
    needs = item.status == "Needs Review"
    if body.action == "edit" and body.fields and item.category == "medication" and needs:
        _apply_fields(s, item, body.fields)
    elif body.action == "edit":
        if not (body.edited_text or "").strip() or not needs:
            raise HTTPException(422, "edited_text or medicine fields are required, and only Needs Review items can be edited")
        english = body.edited_text.strip()
        for t in s.exec(select(ItemText).where(ItemText.item_id == item.id)):
            s.delete(t)
        s.add(ItemText(item_id=item.id, language="en", simple_text=english, numbers_verified=True))
        for lang, text in translate_edit(item.id, english, get_setting(s, "rewrite_model")).items():
            ok = set(re.findall(r"\d+(?:\.\d+)?", english)) == set(re.findall(r"\d+(?:\.\d+)?", text))
            s.add(ItemText(item_id=item.id, language=lang, simple_text=text, numbers_verified=ok))
    r.state = {"approve": "approved", "edit": "edited", "reject": "rejected"}[body.action]
    r.reviewer_note, r.resolved_at = body.note, datetime.now()
    s.add(r)
    if needs:
        item.status = "Rejected" if body.action == "reject" else "Pending"  # confirmed items go back to Pending
        item.reviewed_by = u.id if body.action != "reject" else None
        s.add(item)
    s.commit()
    if needs and item.status == "Pending":
        plan_item(s, item)
        if item.category == "medication":
            plan_medicines(s, doc)
    audit(s, r.document_id, f"user:{u.id}", f"review_{r.state}", {"review_id": r.id, "item_id": r.item_id, "note": body.note})
    msg = {"approved": "confirmed", "edited": "corrected and confirmed", "rejected": "removed"}[r.state]
    routing.notify(s, doc.owner_id, doc.id, f"{u.name} {msg}: {item.title}")
    return {"id": r.id, "state": r.state}


# ---------- availability ----------
class AvailIn(BaseModel):
    available: bool


def set_availability(s: Session, doctor_user_id: int, available: bool, actor: str) -> dict:
    d = s.exec(select(Doctor).where(Doctor.user_id == doctor_user_id)).first()
    if not d:
        raise HTTPException(404, "Doctor not found")
    d.available = available
    s.add(d)
    s.commit()
    moved = routing.reassign_unavailable(s)
    audit(s, None, actor, "availability_changed", {"doctor": doctor_user_id, "available": available, "moved": moved})
    return {"available": available, "moved": moved}


@router.put("/doctor/availability")
def my_availability(body: AvailIn, u: User = Depends(require("doctor")), s: Session = Depends(get_session)):
    return set_availability(s, u.id, body.available, f"user:{u.id}")


@router.get("/doctor/me")
def doctor_me(u: User = Depends(require("doctor")), s: Session = Depends(get_session)):
    d = s.exec(select(Doctor).where(Doctor.user_id == u.id)).first()
    return {"name": u.name, "specialty": d.specialty, "available": d.available}


# ---------- callbacks ----------
@router.get("/doctor/callbacks")
def callbacks(u: User = Depends(require("doctor")), s: Session = Depends(get_session)):
    out = []
    for c in s.exec(select(CallbackRequest).where(CallbackRequest.doctor_id == u.id).order_by(CallbackRequest.id.desc())):
        it, doc = s.get(Item, c.item_id), s.get(Document, c.document_id)
        out.append({"id": c.id, "patient_alias": doc.patient_alias, "item_title": it.title, "masked_number": c.patient_number,
                    "state": c.state, "note": c.note, "created_at": c.created_at.isoformat()})
    return out



