import json
import os
import re
from datetime import date, datetime
from typing import Optional


from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile
from fastapi.responses import Response, StreamingResponse
from pydantic import BaseModel
from sqlmodel import Session, select

from .. import routing
from ..agents import samples
from ..agents.dates import resolve_date
from ..agents.ingest import pdf_to_text
from ..agents.pipeline import run_pipeline
from ..agents.privacy import mask_pii
from ..auth import create_stream_ticket, current_user, get_doc_for, require, verify_stream_ticket
from ..voices import speak_text
from ..db import audit, clock_now, get_session, sim_today
from ..models import (AuditLog, CallbackRequest, Document, HealthReading, Item, ItemText, ProviderMatch, ReviewQueue,
                      ShareLink, SourceLine, Task, TaskSkip, User)
from .plans import build_ics, build_plan, doc_dict

router = APIRouter(prefix="/api")
LANG_PAT = "^(en|ta|hi|te|kn|ml)$"
MAX_PDF_BYTES = 5 * 1024 * 1024  # 5 MB
MAX_TEXT_CHARS = 30_000


class DocIn(BaseModel):
    sample_key: Optional[str] = None
    text: Optional[str] = None
    title: Optional[str] = None
    patient_alias: Optional[str] = None
    discharge_date: Optional[date] = None
    city: Optional[str] = None
    pincode: Optional[str] = None
    preferred_language: Optional[str] = None


def _guess(text: str, today: date) -> dict:
    m = re.search(r"discharge:\s*(\d{1,2}\s+\w{3}\w*\s+\d{4})", text, re.I)
    p = re.search(r"Patient:\s*(.+)", text)
    city = "Delhi" if "delhi" in text.lower() else "Chennai"
    return {"discharge_date": (m and resolve_date(m[1], today)) or today,
            "patient_alias": p[1].strip() if p else "Patient (synthetic)",
            "city": city, "pincode": "110001" if city == "Delhi" else "600017"}


def _create(s: Session, user: User, body: DocIn) -> dict:
    meta: dict = {}
    if body.sample_key:
        try:
            meta = next(x for x in samples.sample_index() if x["key"] == body.sample_key)
        except StopIteration:
            raise HTTPException(404, "Unknown sample")
        text = samples.sample_text(body.sample_key)
    elif body.text and body.text.strip():
        text = body.text
        if len(text) > MAX_TEXT_CHARS:
            raise HTTPException(422, f"Text is too long. Maximum {MAX_TEXT_CHARS} characters.")
    else:
        raise HTTPException(422, "Provide text or a sample_key")
    guess = _guess(text, sim_today(s))
    masked, found = mask_pii(text)
    doc = Document(
        owner_id=user.id,
        title=body.title or meta.get("title") or "Discharge summary",
        patient_alias=body.patient_alias or meta.get("patient_alias") or guess["patient_alias"],
        discharge_date=body.discharge_date or (date.fromisoformat(meta["discharge_date"]) if meta else guess["discharge_date"]),
        city=body.city or meta.get("city") or guess["city"],
        pincode=body.pincode or meta.get("pincode") or guess["pincode"],
        preferred_language=body.preferred_language or user.language,
        department=meta.get("department") or samples.DEPARTMENT.get(body.sample_key or "") or routing.guess_department(text),
        raw_text=masked, pii_check_passed=True)
    s.add(doc)
    s.commit()
    s.refresh(doc)
    audit(s, doc.id, f"user:{user.id}", "uploaded", {"masked": [{"kind": f["kind"], "masked": f["masked"]} for f in found]})
    return {"document": doc_dict(doc), "masked": [{"kind": f["kind"], "original": f["original"], "masked": f["masked"]} for f in found]}


@router.get("/samples")
def list_samples(_: User = Depends(current_user)):
    return samples.sample_index()


@router.post("/documents")
def create_document(body: DocIn, u: User = Depends(require("patient")), s: Session = Depends(get_session)):
    return _create(s, u, body)


@router.post("/documents/pdf")
async def create_from_pdf(file: UploadFile = File(...), preferred_language: str = "en",
                          u: User = Depends(require("patient")), s: Session = Depends(get_session)):
    header = await file.read(5)
    if not header.startswith(b"%PDF"):
        raise HTTPException(422, "File does not look like a PDF")
    rest = await file.read(MAX_PDF_BYTES - 5)
    if await file.read(1):
        raise HTTPException(422, f"PDF is too large. Maximum {MAX_PDF_BYTES // (1024 * 1024)} MB.")
    data = header + rest
    try:
        text = pdf_to_text(data)
    except Exception:
        raise HTTPException(422, "Could not read this PDF")
    if not text.strip():
        raise HTTPException(422, "No text found in this PDF")
    return _create(s, u, DocIn(text=text, title=file.filename, preferred_language=preferred_language))


@router.get("/documents")
def list_documents(u: User = Depends(require("patient")), s: Session = Depends(get_session)):
    docs = s.exec(select(Document).where(Document.owner_id == u.id).order_by(Document.id.desc())).all()
    out = []
    for d in docs:
        items = s.exec(select(Item).where(Item.document_id == d.id)).all()
        out.append({**doc_dict(d), "items": len(items), "needs_review": sum(i.status == "Needs Review" for i in items)})
    return out


@router.get("/documents/{doc_id}")
def read_document(doc_id: int, u: User = Depends(current_user), s: Session = Depends(get_session)):
    doc, _ = get_doc_for(s, u, doc_id)
    return doc_dict(doc)


@router.post("/documents/{doc_id}/run-ticket")
def run_ticket(doc_id: int, u: User = Depends(require("patient")), s: Session = Depends(get_session)):
    doc, _ = get_doc_for(s, u, doc_id)
    ticket = create_stream_ticket(s, u, doc.id)
    return {"ticket": ticket}


@router.get("/documents/{doc_id}/run")
def run(doc_id: int, ticket: str = Query(...), s: Session = Depends(get_session)):
    user = verify_stream_ticket(s, ticket, doc_id)
    doc = s.get(Document, doc_id)
    if not doc or doc.owner_id != user.id:
        raise HTTPException(404, "Plan not found")

    def gen():
        for ev in run_pipeline(doc.id):
            yield f"data: {json.dumps(ev)}\n\n"

    return StreamingResponse(gen(), media_type="text/event-stream",
                             headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})


@router.get("/documents/{doc_id}/plan")
def plan(doc_id: int, lang: str = Query("en", pattern=LANG_PAT), u: User = Depends(current_user),
         s: Session = Depends(get_session)):
    doc, scope = get_doc_for(s, u, doc_id)
    if doc.owner_id != u.id:
        audit(s, doc.id, f"user:{u.id}", "viewed_plan", {"role": u.role, "scope": scope})
    return build_plan(s, doc, lang, scope=scope, role=u.role)


@router.get("/documents/{doc_id}/source")
def source(doc_id: int, u: User = Depends(current_user), s: Session = Depends(get_session)):
    doc, scope = get_doc_for(s, u, doc_id)
    if scope != "full":
        raise HTTPException(403, "The patient shared only part of this plan with you")
    rows = s.exec(select(SourceLine).where(SourceLine.document_id == doc.id).order_by(SourceLine.line_no)).all()
    return [{"line_no": r.line_no, "text": r.text} for r in rows]


@router.get("/documents/{doc_id}/audit")
def audit_log(doc_id: int, u: User = Depends(require("patient", "doctor", "management")), s: Session = Depends(get_session)):
    if u.role == "management":
        doc = s.get(Document, doc_id)
        if not doc:
            raise HTTPException(404, "Plan not found")
    else:
        doc, _ = get_doc_for(s, u, doc_id)
    rows = s.exec(select(AuditLog).where(AuditLog.document_id == doc.id).order_by(AuditLog.id)).all()
    return [{"id": r.id, "actor": _who(s, r.actor), "action": r.action, "detail": r.detail,
             "created_at": r.created_at.isoformat()} for r in rows]


def _who(s: Session, actor: str) -> str:
    if actor.startswith("user:"):
        u = s.get(User, int(actor[5:]))
        if u:
            return f"{u.name} ({u.role})"
    return actor


@router.get("/documents/{doc_id}/ics")
def ics(doc_id: int, lang: str = Query("en", pattern=LANG_PAT), u: User = Depends(current_user),
        s: Session = Depends(get_session)):
    doc, scope = get_doc_for(s, u, doc_id)
    return Response(build_ics(s, doc, lang, scope), media_type="text/calendar",
                    headers={"Content-Disposition": f'attachment; filename="carebridge-plan-{doc_id}.ics"'})


# ---------- tasks ----------
class TaskIn(BaseModel):
    status: str


class TaskSkipIn(BaseModel):
    reason: str


SKIP_REASONS = {"felt sick", "ran out", "forgot", "other"}


@router.patch("/tasks/{task_id}")
def patch_task(task_id: int, body: TaskIn, u: User = Depends(require("patient", "manager")), s: Session = Depends(get_session)):
    task = s.get(Task, task_id)
    if not task:
        raise HTTPException(404, "Task not found")
    doc, scope = get_doc_for(s, u, task.document_id)
    if u.role == "manager" and scope not in ("full", "reminders"):
        raise HTTPException(403, "You can mark tasks done only when the patient shared reminders with you")
    if body.status not in ("Pending", "Completed"):
        raise HTTPException(422, "status must be Pending or Completed")
    task.status = body.status
    task.completed_at = clock_now() if body.status == "Completed" else None
    s.add(task)
    s.commit()
    audit(s, task.document_id, f"user:{u.id}", "task_" + body.status.lower(), {"task_id": task.id, "title": task.title, "role": u.role})
    if u.role == "manager":
        verb = "marked done" if body.status == "Completed" else "reopened"
        routing.notify(s, doc.owner_id, doc.id, f"{u.name} {verb}: {task.title}")
    return {"id": task.id, "status": task.status}


@router.post("/tasks/{task_id}/skip")
def skip_task(task_id: int, body: TaskSkipIn, u: User = Depends(require("patient")), s: Session = Depends(get_session)):
    task = s.get(Task, task_id)
    if not task:
        raise HTTPException(404, "Task not found")
    doc, _ = get_doc_for(s, u, task.document_id)
    if body.reason not in SKIP_REASONS:
        raise HTTPException(422, f"reason must be one of: {', '.join(sorted(SKIP_REASONS))}")
    task.status = "Completed"
    task.completed_at = clock_now()
    s.add(task)
    s.add(TaskSkip(task_id=task.id, reason=body.reason, skipped_by=u.id))
    s.commit()
    audit(s, doc.id, f"user:{u.id}", "task_skipped", {"task_id": task.id, "reason": body.reason})
    return {"id": task.id, "status": "Completed", "skipped": True}


# ---------- item level: voice and callback ----------
def _item_for(s: Session, u: User, item_id: int):
    item = s.get(Item, item_id)
    if not item:
        raise HTTPException(404, "Item not found")
    doc, scope = get_doc_for(s, u, item.document_id)
    return item, doc, scope


@router.get("/items/{item_id}/audio")
def audio(item_id: int, lang: str = Query("en", pattern=LANG_PAT), u: User = Depends(current_user),
          s: Session = Depends(get_session)):
    item, doc, scope = _item_for(s, u, item_id)
    if item.status == "Needs Review":
        raise HTTPException(409, "This item is waiting for doctor review, so it cannot be read aloud yet")
    texts = {t.language: t for t in s.exec(select(ItemText).where(ItemText.item_id == item.id))}
    t = texts.get(lang) if texts.get(lang) and texts[lang].numbers_verified else texts.get("en")
    spoken = t.language if t else "en"
    text = t.simple_text if t else item.original_text
    try:
        data = speak_text(text, spoken)
    except Exception as e:
        raise HTTPException(502, f"Voice service failed: {type(e).__name__}")
    audit(s, doc.id, f"user:{u.id}", "listened", {"item_id": item.id, "lang": lang})
    return Response(data, media_type="audio/mpeg")


class CallbackIn(BaseModel):
    note: Optional[str] = None


@router.post("/items/{item_id}/callback")
def request_callback(item_id: int, body: CallbackIn, u: User = Depends(require("patient", "manager")),
                     s: Session = Depends(get_session)):
    item, doc, scope = _item_for(s, u, item_id)
    if scope != "full":
        raise HTTPException(403, "Callback needs full access to this plan")
    entry = s.exec(select(ReviewQueue).where(ReviewQueue.item_id == item.id, ReviewQueue.state == "open")).first()
    doctor_id = entry.assigned_doctor_id if entry else routing.pick(s, f"{item.title} {item.original_text}")[0]
    masked = f"+91 98XXX XX{(doc.owner_id * 137 + item.id * 31) % 900 + 100}"
    cb = CallbackRequest(item_id=item.id, document_id=doc.id, requested_by=u.id, patient_number=masked,
                         doctor_id=doctor_id, note=body.note)
    s.add(cb)
    s.commit()
    s.refresh(cb)
    routing.notify(s, doctor_id, doc.id, f"Callback requested about: {item.title}", "warning")
    audit(s, doc.id, f"user:{u.id}", "callback_requested", {"item_id": item.id, "callback_id": cb.id})
    return {"id": cb.id, "masked_number": masked, "doctor_id": doctor_id, "state": cb.state}


class FlagIn(BaseModel):
    note: Optional[str] = None


@router.post("/items/{item_id}/flag")
def flag_item(item_id: int, body: FlagIn, u: User = Depends(require("patient", "manager")), s: Session = Depends(get_session)):
    item, doc, scope = _item_for(s, u, item_id)
    if scope != "full":
        raise HTTPException(403, "Flagging needs full access to this plan")
    if item.status == "Needs Review":
        raise HTTPException(409, "A doctor is already checking this item")
    item.status = "Needs Review"
    item.review_codes = ["PATIENT_FLAG"]
    item.review_reason = f"Flagged by {u.name}" + (f": {body.note}" if body.note else "")
    s.add(item)
    entry = ReviewQueue(item_id=item.id, document_id=doc.id, reason=item.review_reason, severity="medium", codes=["PATIENT_FLAG"])
    s.add(entry)
    s.commit()
    s.refresh(entry)
    routing.assign(s, entry)
    audit(s, doc.id, f"user:{u.id}", "item_flagged", {"item_id": item.id, "note": body.note})
    return {"id": entry.id}


class ProviderPick(BaseModel):
    provider_id: int


@router.post("/items/{item_id}/provider")
def pick_provider(item_id: int, body: ProviderPick, u: User = Depends(require("patient")), s: Session = Depends(get_session)):
    item, doc, _ = _item_for(s, u, item_id)
    rows = s.exec(select(ProviderMatch).where(ProviderMatch.item_id == item.id)).all()
    if not any(r.provider_id == body.provider_id for r in rows):
        raise HTTPException(404, "That provider is not one of the suggestions")
    for r in rows:
        r.selected = r.provider_id == body.provider_id
        s.add(r)
    s.commit()
    audit(s, doc.id, f"user:{u.id}", "provider_selected", {"item_id": item.id, "provider_id": body.provider_id})
    return {"selected": body.provider_id}


# ---------- share links (B.3) ----------
import secrets
from datetime import timedelta as _td


class ShareIn(BaseModel):
    scope: str = "full"


@router.post("/documents/{doc_id}/share")
def create_share(doc_id: int, body: ShareIn, u: User = Depends(require("patient")), s: Session = Depends(get_session)):
    doc, _ = get_doc_for(s, u, doc_id)
    if body.scope not in ("full", "appointments", "reminders"):
        raise HTTPException(422, "scope must be full, appointments or reminders")
    token = secrets.token_urlsafe(32)
    link = ShareLink(patient_id=u.id, token=token, scope=body.scope,
                     expires_at=clock_now() + _td(days=30))
    s.add(link)
    s.commit()
    s.refresh(link)
    audit(s, doc.id, f"user:{u.id}", "share_created", {"link_id": link.id, "scope": body.scope})
    return {"id": link.id, "token": token, "scope": body.scope, "expires_at": link.expires_at.isoformat()}


@router.get("/share/{token}/plan")
def share_view(token: str, s: Session = Depends(get_session)):
    link = s.exec(select(ShareLink).where(ShareLink.token == token)).first()
    if not link or link.revoked:
        raise HTTPException(404, "Link not found or revoked")
    if link.expires_at < clock_now():
        raise HTTPException(410, "Link expired")
    docs = s.exec(select(Document).where(Document.owner_id == link.patient_id).order_by(Document.id.desc())).all()
    if not docs:
        raise HTTPException(404, "No plans found")
    doc = docs[0]
    from .plans import build_plan
    plan = build_plan(s, doc, "en", scope=link.scope, role="family")
    audit(s, doc.id, f"share:{link.id}", "share_viewed", {"scope": link.scope})
    return plan


@router.delete("/share/{link_id}")
def revoke_share(link_id: int, u: User = Depends(require("patient")), s: Session = Depends(get_session)):
    link = s.get(ShareLink, link_id)
    if not link or link.patient_id != u.id:
        raise HTTPException(404, "Link not found")
    link.revoked = True
    s.add(link)
    s.commit()
    audit(s, None, f"user:{u.id}", "share_revoked", {"link_id": link.id})
    return {"id": link.id, "revoked": True}


@router.get("/share/links")
def list_shares(u: User = Depends(require("patient")), s: Session = Depends(get_session)):
    links = s.exec(select(ShareLink).where(ShareLink.patient_id == u.id).order_by(ShareLink.id.desc())).all()
    return [{"id": l.id, "token": l.token, "scope": l.scope, "revoked": l.revoked,
             "expires_at": l.expires_at.isoformat(), "created_at": l.created_at.isoformat()} for l in links]


# ---------- health readings (B.6) ----------
READING_TYPES = {"bp", "sugar", "weight", "temperature", "pain"}


class ReadingIn(BaseModel):
    reading_type: str
    value: str


@router.post("/readings")
def add_reading(body: ReadingIn, u: User = Depends(require("patient")), s: Session = Depends(get_session)):
    if body.reading_type not in READING_TYPES:
        raise HTTPException(422, f"reading_type must be one of: {', '.join(sorted(READING_TYPES))}")
    if not body.value.strip():
        raise HTTPException(422, "value is required")
    r = HealthReading(patient_id=u.id, reading_type=body.reading_type, value=body.value.strip(),
                      recorded_at=clock_now())
    s.add(r)
    s.commit()
    s.refresh(r)
    return {"id": r.id, "reading_type": r.reading_type, "value": r.value, "recorded_at": r.recorded_at.isoformat()}


@router.get("/readings")
def list_readings(u: User = Depends(require("patient")), s: Session = Depends(get_session)):
    rows = s.exec(select(HealthReading).where(HealthReading.patient_id == u.id)
                  .order_by(HealthReading.recorded_at.desc()).limit(200)).all()
    return [{"id": r.id, "reading_type": r.reading_type, "value": r.value,
             "recorded_at": r.recorded_at.isoformat()} for r in rows]


@router.get("/patients/{patient_id}/readings")
def doctor_readings(patient_id: int, u: User = Depends(require("doctor")), s: Session = Depends(get_session)):
    from sqlalchemy import or_
    assigned = s.exec(select(ReviewQueue).join(Document, Document.id == ReviewQueue.document_id).where(
        Document.owner_id == patient_id,
        or_(ReviewQueue.assigned_doctor_id == u.id, ReviewQueue.fallback_doctor_id == u.id)
    )).first()
    if not assigned:
        raise HTTPException(404, "Patient not found")
    rows = s.exec(select(HealthReading).where(HealthReading.patient_id == patient_id)
                  .order_by(HealthReading.recorded_at.desc()).limit(200)).all()
    return [{"id": r.id, "reading_type": r.reading_type, "value": r.value,
             "recorded_at": r.recorded_at.isoformat()} for r in rows]


# ---------- B.5: Reminder settings (simulated) ----------
REMINDER_CHANNELS = {"in_app", "whatsapp_simulated", "voice_call_simulated"}


class ReminderSettingsIn(BaseModel):
    reminder_channel: str


def _get_reminder_channel(s: Session, user_id: int) -> str:
    from ..models import Setting
    row = s.get(Setting, f"reminder_channel_{user_id}")
    return row.value if row else "in_app"


@router.get("/settings/reminders")
def get_reminder_settings(u: User = Depends(require("patient")), s: Session = Depends(get_session)):
    return {"reminder_channel": _get_reminder_channel(s, u.id)}


@router.put("/settings/reminders")
def set_reminder_settings(body: ReminderSettingsIn, u: User = Depends(require("patient")), s: Session = Depends(get_session)):
    if body.reminder_channel not in REMINDER_CHANNELS:
        raise HTTPException(422, f"reminder_channel must be one of: {', '.join(sorted(REMINDER_CHANNELS))}")
    from ..models import Setting
    row = s.get(Setting, f"reminder_channel_{u.id}")
    if row:
        row.value = body.reminder_channel
    else:
        row = Setting(key=f"reminder_channel_{u.id}", value=body.reminder_channel)
    s.add(row)
    s.commit()
    audit(s, None, f"user:{u.id}", "reminder_settings", {"channel": body.reminder_channel})
    return {"reminder_channel": body.reminder_channel}


@router.get("/settings/messages")
def sent_messages(u: User = Depends(require("patient")), s: Session = Depends(get_session)):
    from ..models import Notification
    rows = s.exec(select(Notification).where(Notification.user_id == u.id)
                  .order_by(Notification.id.desc()).limit(50)).all()
    channel = _get_reminder_channel(s, u.id)
    return {"channel": channel, "messages": [
        {"id": n.id, "message": n.message, "level": n.level, "channel": channel,
         "created_at": n.created_at.isoformat()} for n in rows]}


# ---------- B.7: SOS config ----------
@router.get("/sos")
def sos_info(u: User = Depends(current_user), s: Session = Depends(get_session)):
    from ..models import HubMember, Item
    hospital_phone = "044-5550-0100"
    manager_phone = None
    manager_name = None

    hub_member = s.exec(select(HubMember).where(HubMember.user_id == u.id)).first()
    if hub_member:
        members = s.exec(select(HubMember).where(
            HubMember.hub_id == hub_member.hub_id, HubMember.role == "manager"
        )).all()
        if members:
            mgr = s.get(User, members[0].user_id)
            if mgr:
                manager_name = mgr.name
                manager_phone = mgr.mobile or "+91 90000 00005"

    warnings = []
    if u.role == "patient":
        docs = s.exec(select(Document).where(Document.owner_id == u.id).order_by(Document.id.desc()).limit(1)).all()
        if docs:
            items = s.exec(select(Item).where(
                Item.document_id == docs[0].id, Item.category == "warning_sign"
            )).all()
            warnings = [i.original_text for i in items if i.status != "Rejected"]

    return {
        "emergency": "108",
        "hospital_phone": hospital_phone,
        "manager": {"name": manager_name, "phone": manager_phone} if manager_name else None,
        "warning_signs": warnings,
    }
