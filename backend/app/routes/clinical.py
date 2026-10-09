"""Doctor review queue, availability and callbacks."""
import re
from datetime import datetime, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Response
from pydantic import BaseModel
from sqlalchemy import String, case, cast, func, or_
from sqlmodel import Session, select

from .. import routing
from ..agents.planner import plan_item, plan_medicines
from ..agents import med_template
from ..agents.simplifier import translate_edit
from ..agents.triage import triage_rules
from .plans import PLAIN
from ..auth import require
from ..db import audit, clock_now, get_session, pairs, get_setting, sim_now
from ..models import CallbackRequest, Doctor, Document, Item, ItemText, ReviewQueue, SourceLine, Task, User

router = APIRouter(prefix="/api")

def entries(s: Session, rows: list[ReviewQueue], full: bool = True) -> list[dict]:
    """Queue rows as dicts. Related rows are loaded in four queries for the whole list, not four per row."""
    items = {i.id: i for i in s.exec(select(Item).where(Item.id.in_({r.item_id for r in rows} or {0})))}
    docs = {d.id: d for d in s.exec(select(Document).where(Document.id.in_({r.document_id for r in rows} or {0})))}
    uids = {x for r in rows for x in (r.assigned_doctor_id, r.fallback_doctor_id) if x} | {d.owner_id for d in docs.values()}
    users = {u.id: u for u in s.exec(select(User).where(User.id.in_(uids or {0})))}
    now = clock_now()
    line_ids = {x for it in items.values() for x in (it.source_line_ids or [])} if full else set()
    line_no = {l.id: l.line_no for l in s.exec(select(SourceLine).where(SourceLine.id.in_(line_ids or {0})))}
    out = []
    for r in rows:
        it, doc = items.get(r.item_id), docs.get(r.document_id)
        ad, fd = users.get(r.assigned_doctor_id), users.get(r.fallback_doctor_id)
        d = {"id": r.id, "item_id": r.item_id, "document_id": r.document_id, "patient_alias": doc.patient_alias if doc else "",
             "department": doc.department if doc else "", "reason": r.reason, "severity": r.severity, "state": r.state,
             "reviewer_note": r.reviewer_note,
             "assigned_doctor": {"id": ad.id, "name": ad.name} if ad else None,
             "fallback_doctor": {"id": fd.id, "name": fd.name} if fd else None,
             "codes": r.codes or [], "reason_plain": [PLAIN.get(c, c) for c in (r.codes or [])],
             "age_hours": round(((r.resolved_at or now) - r.created_at).total_seconds() / 3600, 1),
             "created_at": r.created_at.isoformat(), "resolved_at": r.resolved_at.isoformat() if r.resolved_at else None}
        if it:
            d["item"] = {"category": it.category, "status": it.status, "confidence": it.confidence}
            if full:  # management sees the queue but no clinical text: no title, no wording, no values
                d["item"].update({"title": it.title, "approved_fields": it.approved_fields or {}, "date_raw": it.date_raw,
                                  "date_resolved": it.date_resolved.isoformat() if it.date_resolved else None, "time_of_day": it.time_of_day})
                d["item"]["original_text"] = it.original_text
                d["item"]["source_line_nos"] = sorted(line_no[x] for x in (it.source_line_ids or []) if x in line_no)
        if doc and full and doc.owner_id in users:
            d["patient_language"] = users[doc.owner_id].language
        out.append(d)
    return out


def entry_dict(s: Session, r: ReviewQueue, full: bool = True) -> dict:
    return entries(s, [r], full)[0]


def review_filter(q, *, state: str = "open", document_id: Optional[int] = None):
    if document_id:
        q = q.where(ReviewQueue.document_id == document_id)
    if state != "all":
        q = q.where(ReviewQueue.state == state)
    return q


def page(s: Session, q, response: Response, limit: int, offset: int):
    """Runs a list query with a limit and offset. The full count goes in the X-Total-Count header."""
    total = s.exec(select(func.count()).select_from(q.subquery())).one()
    response.headers["X-Total-Count"] = str(total)
    return s.exec(q.limit(max(1, min(limit, 500))).offset(max(0, offset))).all()


@router.get("/review")
def review_queue(response: Response, document_id: Optional[int] = None, state: str = "open", code: Optional[str] = None,
                 q: Optional[str] = None, limit: int = 100, offset: int = 0,
                 u: User = Depends(require("doctor", "management")), s: Session = Depends(get_session)):
    """Doctors: their own queue, oldest first. Filter by plan, reason code or a search word (patient or item title)."""
    stmt = review_filter(select(ReviewQueue), state=state, document_id=document_id)
    if u.role == "doctor":
        stmt = stmt.where(or_(ReviewQueue.assigned_doctor_id == u.id, ReviewQueue.fallback_doctor_id == u.id))
    if q:
        like = f"%{q.strip().lower()}%"
        stmt = (stmt.join(Item, Item.id == ReviewQueue.item_id).join(Document, Document.id == ReviewQueue.document_id)
                .where(or_(func.lower(Item.title).like(like), func.lower(Document.patient_alias).like(like))))
    if code:
        stmt = stmt.where(cast(ReviewQueue.codes, String).like(f'%"{code}"%'))
    if u.role == "doctor":
        stmt = stmt.order_by(ReviewQueue.created_at, ReviewQueue.id)  # oldest first
    else:
        stmt = stmt.order_by(case((ReviewQueue.severity == "high", 0), (ReviewQueue.severity == "medium", 1), else_=2), ReviewQueue.id)
    return entries(s, page(s, stmt, response, limit, offset), full=u.role == "doctor")


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
    r.reviewer_note, r.resolved_at = body.note, clock_now()
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
    backup = s.get(User, d.backup_user_id) if d.backup_user_id else None
    return {"name": u.name, "specialty": d.specialty, "available": d.available,
            "backup": {"id": backup.id, "name": backup.name} if backup else None}


@router.get("/doctor/home")
def doctor_home(u: User = Depends(require("doctor")), s: Session = Depends(get_session)):
    """The four numbers on My day."""
    mine = or_(ReviewQueue.assigned_doctor_id == u.id, ReviewQueue.fallback_doctor_id == u.id)
    late = clock_now() - timedelta(hours=float(get_setting(s, "reviewer_threshold_hours")))
    open_q = select(func.count()).select_from(ReviewQueue).where(ReviewQueue.assigned_doctor_id == u.id, ReviewQueue.state == "open")
    docs = select(ReviewQueue.document_id).where(mine)
    return {
        **doctor_me(u, s),
        "open_reviews": s.exec(open_q).one(),
        "overdue_reviews": s.exec(open_q.where(ReviewQueue.created_at < late)).one(),
        "callbacks_waiting": s.exec(select(func.count()).select_from(CallbackRequest).where(
            CallbackRequest.doctor_id == u.id, CallbackRequest.state.in_(OPEN_CALLS))).one(),
        "patients_overdue": s.exec(select(func.count(func.distinct(Task.document_id))).where(
            Task.document_id.in_(docs), Task.status == "Pending", Task.due_at < sim_now(s))).one(),
    }


@router.get("/doctor/patients")
def doctor_patients(response: Response, q: Optional[str] = None, limit: int = 50, offset: int = 0,
                    u: User = Depends(require("doctor")), s: Session = Depends(get_session)):
    """Plans that have review items assigned to this doctor, with the counts a doctor wants at a glance."""
    mine = or_(ReviewQueue.assigned_doctor_id == u.id, ReviewQueue.fallback_doctor_id == u.id)
    stmt = select(Document).where(Document.id.in_(select(ReviewQueue.document_id).where(mine)))
    if q:
        stmt = stmt.where(func.lower(Document.patient_alias).like(f"%{q.strip().lower()}%"))
    docs = page(s, stmt.order_by(Document.discharge_date.desc()), response, limit, offset)
    ids = [d.id for d in docs] or [0]
    open_by = pairs(s, select(ReviewQueue.document_id, func.count()).where(
        mine, ReviewQueue.state == "open", ReviewQueue.document_id.in_(ids)).group_by(ReviewQueue.document_id))
    done_by = pairs(s, select(ReviewQueue.document_id, func.count()).where(
        mine, ReviewQueue.state != "open", ReviewQueue.document_id.in_(ids)).group_by(ReviewQueue.document_id))
    late_by = pairs(s, select(Task.document_id, func.count()).where(
        Task.document_id.in_(ids), Task.status == "Pending", Task.due_at < sim_now(s)).group_by(Task.document_id))
    return [{"document_id": d.id, "patient_alias": d.patient_alias, "title": d.title, "department": d.department,
             "discharge_date": d.discharge_date.isoformat(), "open_reviews": open_by.get(d.id, 0),
             "reviewed": done_by.get(d.id, 0), "overdue_tasks": late_by.get(d.id, 0)} for d in docs]


# ---------- callbacks ----------
OPEN_CALLS = ("requested", "scheduled", "connecting")  # connecting = call in progress


def callback_rows(s: Session, rows: list[CallbackRequest]) -> list[dict]:
    items = {i.id: i for i in s.exec(select(Item).where(Item.id.in_({c.item_id for c in rows} or {0})))}
    docs = {d.id: d for d in s.exec(select(Document).where(Document.id.in_({c.document_id for c in rows} or {0})))}
    drs = {x.id: x for x in s.exec(select(User).where(User.id.in_({c.doctor_id for c in rows if c.doctor_id} or {0})))}
    return [{"id": c.id, "document_id": c.document_id, "patient_alias": docs[c.document_id].patient_alias,
             "department": docs[c.document_id].department, "item_title": items[c.item_id].title if c.item_id in items else "",
             "masked_number": c.patient_number, "state": c.state, "note": c.note, "call_notes": c.call_notes,
             "doctor": {"id": c.doctor_id, "name": drs[c.doctor_id].name} if c.doctor_id in drs else None,
             "scheduled_for": c.scheduled_for.isoformat() if c.scheduled_for else None,
             "created_at": c.created_at.isoformat()} for c in rows]


@router.get("/doctor/callbacks")
def callbacks(response: Response, state: Optional[str] = None, limit: int = 100, offset: int = 0,
              u: User = Depends(require("doctor")), s: Session = Depends(get_session)):
    stmt = select(CallbackRequest).where(CallbackRequest.doctor_id == u.id)
    if state:
        stmt = stmt.where(CallbackRequest.state == state)
    return callback_rows(s, page(s, stmt.order_by(CallbackRequest.id.desc()), response, limit, offset))


class CallbackAct(BaseModel):
    action: str  # complete, no_answer, reschedule, notes
    call_notes: Optional[str] = None
    scheduled_for: Optional[datetime] = None


@router.post("/doctor/callbacks/{cid}")
def callback_act(cid: int, body: CallbackAct, u: User = Depends(require("doctor")), s: Session = Depends(get_session)):
    c = s.get(CallbackRequest, cid)
    if not c or c.doctor_id != u.id:
        raise HTTPException(404, "Callback not found")
    if body.action not in ("complete", "no_answer", "reschedule", "notes"):
        raise HTTPException(422, "action must be complete, no_answer, reschedule or notes")
    if body.action != "notes" and c.state not in OPEN_CALLS:
        raise HTTPException(409, "This callback is already closed")
    if body.call_notes is not None:
        c.call_notes = body.call_notes.strip() or None
    if body.action == "complete":
        c.state = "completed"
    elif body.action == "no_answer":
        c.state = "no_answer"
    elif body.action == "reschedule":
        if not body.scheduled_for:
            raise HTTPException(422, "Pick a new time")
        c.state, c.scheduled_for = "scheduled", body.scheduled_for
    s.add(c)
    s.commit()
    audit(s, c.document_id, f"user:{u.id}", f"callback_{body.action}", {"callback_id": c.id})
    doc = s.get(Document, c.document_id)
    msg = {"complete": "Your callback is done", "no_answer": "We could not reach you. A doctor will try again",
           "reschedule": "Your callback was moved to a new time"}.get(body.action)
    if msg:
        routing.notify(s, doc.owner_id, doc.id, msg)
    return callback_rows(s, [c])[0]
