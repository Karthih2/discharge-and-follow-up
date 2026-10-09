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
from ..auth import current_user, get_doc_for, require
from ..voices import speak_text
from ..db import audit, clock_now, get_session, sim_today
from ..models import (AuditLog, CallbackRequest, Document, Item, ItemText, ProviderMatch, ReviewQueue, SourceLine,
                      Task, User)
from .plans import build_ics, build_plan, doc_dict

router = APIRouter(prefix="/api")
LANG_PAT = "^(en|ta|hi|te|kn|ml)$"


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
    data = await file.read()
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


@router.get("/documents/{doc_id}/run")
def run(doc_id: int, u: User = Depends(require("patient")), s: Session = Depends(get_session)):
    doc, _ = get_doc_for(s, u, doc_id)

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
    """user:7 becomes 'Priya Iyer (manager)'."""
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
    """Reads already approved text aloud. Never creates new wording."""
    item, doc, scope = _item_for(s, u, item_id)
    if item.status == "Needs Review":
        raise HTTPException(409, "This item is waiting for doctor review, so it cannot be read aloud yet")
    texts = {t.language: t for t in s.exec(select(ItemText).where(ItemText.item_id == item.id))}
    t = texts.get(lang) if texts.get(lang) and texts[lang].numbers_verified else texts.get("en")
    spoken = t.language if t else "en"  # the voice matches the language of the text that is actually read
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
    """Simulated masked call: only invented numbers are used and no real call is made."""
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
    """The patient (or an allowed hub manager) asks a doctor to check an item. The item locks until they do."""
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
