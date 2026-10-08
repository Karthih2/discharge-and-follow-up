"""Plan assembly shared by the patient and caregiver views, plus .ics export."""
import re
from datetime import timedelta

from sqlmodel import Session, select

from ..agents import med_template
from ..agents.escalation import run_escalation
from ..agents.triage import DOSE
from ..db import get_setting, sim_now, sim_today
from ..models import (CallbackRequest, CaregiverAlert, Document, Item, ItemText, Provider, ProviderMatch,
                      ReviewQueue, SourceLine, Task, User)

SAFE = "Your care team will confirm this"


APPT = {"appointment", "test", "referral", "rehab", "wound_care"}

# Patient safe wording for each reason code. Never includes clinical text.
PLAIN = {
    "MISSING_DOSE": "The dose is not written in the summary.",
    "VAGUE_WORDING": "The wording is not clear.",
    "MED_CHANGE": "The instruction may start, stop or change a medicine.",
    "MISSING_DATE": "The date is missing or unclear.",
    "SYMPTOM": "This describes a symptom or warning sign.",
    "CONFLICT": "Two instructions may not agree.",
    "LOW_CONFIDENCE": "The system is not sure it read this correctly.",
    "QUOTE_MISMATCH": "The system could not match this to the summary.",
    "MODEL_FLAG": "A safety check asked a doctor to look at this.",
    "PATIENT_FLAG": "A doctor was asked to check this.",
    "OVERDUE": "This task is overdue.",
}


def med_card(i: Item) -> dict | None:
    """Fixed medicine card fields: name, dose, timing, duration, special instructions."""
    if i.category != "medication":
        return None
    f = i.approved_fields or {}
    parsed = med_template.parse(i.title, i.original_text, i.time_of_day) or {}
    m = DOSE.search(i.original_text)
    dose = f.get("dose") or (m.group(0) if m else None)
    drug = re.sub(r"\s+", " ", DOSE.sub("", i.title)).strip() or i.title
    slots = f.get("timing") or [s for s in ("morning", "afternoon", "night") if s in (i.time_of_day or "")]
    return {"drug": drug, "dose": dose, "timing": slots, "frequency": f.get("frequency") or parsed.get("freq"),
            "duration_days": f.get("duration_days") or (int(parsed["days"]) if parsed.get("days") else None),
            "food": parsed.get("food"), "special": f.get("instructions")}


def build_plan(s: Session, doc: Document, lang: str = "en", escalate: bool = True, scope: str = "full", role: str = "patient") -> dict:
    if escalate:
        run_escalation(s, doc.id)
    items = s.exec(select(Item).where(Item.document_id == doc.id).order_by(Item.id)).all()
    tasks = s.exec(select(Task).where(Task.document_id == doc.id).order_by(Task.due_at)).all()
    lines = {l.id: l.line_no for l in s.exec(select(SourceLine).where(SourceLine.document_id == doc.id))}
    texts: dict[int, dict[str, ItemText]] = {}
    for t in s.exec(select(ItemText).where(ItemText.item_id.in_([i.id for i in items] or [0]))):
        texts.setdefault(t.item_id, {})[t.language] = t
    matches: dict[int, list] = {}
    providers = {p.id: p for p in s.exec(select(Provider))}
    for m in s.exec(select(ProviderMatch).where(ProviderMatch.item_id.in_([i.id for i in items] or [0]))
                    .order_by(ProviderMatch.score.desc())):
        p = providers.get(m.provider_id)
        if p:
            matches.setdefault(m.item_id, []).append({
                "provider": provider_dict(p), "score": m.score, "reasons": m.reasons, "selected": m.selected})
    cb_state: dict[int, str] = {}
    for c in s.exec(select(CallbackRequest).where(CallbackRequest.document_id == doc.id).order_by(CallbackRequest.id)):
        cb_state[c.item_id] = c.state
    owner = s.get(User, doc.owner_id)
    first_task = {}
    for t in tasks:
        first_task.setdefault(t.item_id, t)
    out_items = []
    for i in items:
        if i.status == "Rejected":
            continue
        by = texts.get(i.id, {})
        chosen = by.get(lang)
        shown_lang = lang
        if not chosen or not chosen.numbers_verified:
            chosen, shown_lang = by.get("en"), "en"
        visible = i.status != "Needs Review"
        t = first_task.get(i.id)
        if scope == "reminders" or (scope == "appointments" and i.category not in APPT):
            continue
        hide = (not visible) and role in ("manager", "family")  # family sees a locked card with no details
        out_items.append({
            "id": i.id, "category": i.category, "title": "Waiting for doctor review" if hide else i.title,
            "original_text": "" if hide else i.original_text,
            "codes": [] if hide else (i.review_codes or []),
            "reason_plain": None if (visible or hide) else " ".join(PLAIN.get(c, "") for c in (i.review_codes or [])).strip() or "A doctor needs to check this.",
            "locked": not visible, "callback_state": cb_state.get(i.id), "med": None if hide else med_card(i),
            "source_line_nos": [lines[x] for x in i.source_line_ids if x in lines],
            "date_raw": i.date_raw, "date_resolved": i.date_resolved.isoformat() if i.date_resolved else None,
            "time_of_day": None if hide else i.time_of_day, "status": i.status, "review_reason": None if hide else i.review_reason,
            "simple_text": (chosen.simple_text if chosen else i.original_text) if visible else None,
            "shown_language": shown_lang, "safe_message": None if visible else SAFE,
            "task_id": t.id if t else None, "matches": matches.get(i.id, []), "reviewed": i.reviewed_by is not None,
        })
    now = sim_now(s)
    shown = {i["id"] for i in out_items}
    tasks = [t for t in tasks if scope == "full" or scope == "reminders" or t.item_id in shown]
    alerts = s.exec(select(CaregiverAlert).where(CaregiverAlert.document_id == doc.id).order_by(CaregiverAlert.created_at.desc())).all()
    return {
        "viewer": {"role": role, "scope": scope},
        "patient": {"name": owner.name if owner else "", "elderly": bool(owner and owner.elderly)},
        "document": doc_dict(doc),
        "today": sim_today(s).isoformat(),
        "items": out_items,
        "tasks": [{"id": t.id, "item_id": t.item_id, "title": t.title, "due_at": t.due_at.isoformat(),
                   "status": t.status, "overdue": t.status == "Pending" and t.due_at < now,
                   "completed_at": t.completed_at.isoformat() if t.completed_at else None} for t in tasks],
        "alerts": [alert_dict(a) for a in alerts] if scope != "appointments" and role != "doctor" else [],
        "open_reviews": len(s.exec(select(ReviewQueue).where(ReviewQueue.document_id == doc.id,
                                                             ReviewQueue.state == "open")).all()),
    }


def doc_dict(d: Document) -> dict:
    return {"id": d.id, "title": d.title, "patient_alias": d.patient_alias, "discharge_date": d.discharge_date.isoformat(),
            "city": d.city, "pincode": d.pincode, "preferred_language": d.preferred_language,
            "pii_check_passed": d.pii_check_passed, "created_at": d.created_at.isoformat()}


def alert_dict(a: CaregiverAlert) -> dict:
    return {"id": a.id, "task_id": a.task_id, "message": a.message, "level": a.level,
            "created_at": a.created_at.isoformat(), "acknowledged_at": a.acknowledged_at.isoformat() if a.acknowledged_at else None}


def provider_dict(p: Provider) -> dict:
    return {"id": p.id, "name": p.name, "type": p.type, "specialties": p.specialties.split(";"), "city": p.city,
            "pincode": p.pincode, "lat": p.lat, "lng": p.lng, "languages": p.languages.split(";"), "insurance": p.insurance.split(";"),
            "open_days": p.open_days, "phone": p.phone, "synthetic": p.synthetic}


def _esc(t: str) -> str:
    return t.replace("\\", "\\\\").replace(",", "\\,").replace(";", "\\;").replace("\n", "\\n")


def build_ics(s: Session, doc: Document, lang: str, scope: str = "full") -> str:
    plan = build_plan(s, doc, lang, escalate=False, scope=scope)
    out = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//CareBridge//Demo//EN", "CALSCALE:GREGORIAN"]
    for t in plan["tasks"]:
        from datetime import datetime
        start = datetime.fromisoformat(t["due_at"])
        end = start + timedelta(minutes=30)
        out += ["BEGIN:VEVENT", f"UID:carebridge-task-{t['id']}@demo", f"DTSTAMP:{start:%Y%m%dT%H%M%S}",
                f"DTSTART:{start:%Y%m%dT%H%M%S}", f"DTEND:{end:%Y%m%dT%H%M%S}",
                f"SUMMARY:{_esc(t['title'])}", "DESCRIPTION:Made by CareBridge from a synthetic summary. Your care team confirms details.",
                "BEGIN:VALARM", "ACTION:DISPLAY", f"DESCRIPTION:{_esc(t['title'])}", "TRIGGER:-PT30M", "END:VALARM",
                "END:VEVENT"]
    out.append("END:VCALENDAR")
    return "\r\n".join(out) + "\r\n"
