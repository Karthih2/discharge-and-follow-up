"""Home screens: the patient's Today view and the family hub overview. One request each, batch queries only."""
from datetime import datetime, time, timedelta

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from ..auth import require
from ..voices import speak_text
from ..db import get_session, sim_now, sim_today
from ..models import (CallbackRequest, CaregiverAlert, Consent, Document, HubMember, Item, Provider, ProviderMatch, Task, User)
from .plans import PLAIN, alert_dict

router = APIRouter(prefix="/api")
SLOTS = ("morning", "afternoon", "night")
APPT = ("appointment", "test", "referral", "rehab", "wound_care")  # what an appointments-only share may show


def _slot(title: str) -> str | None:
    first = title.split(" ", 1)[0].lower()
    return first if first in SLOTS and " medicines:" in title else None


def _event(t: Task, doc: Document, item: Item | None, place: str | None) -> dict:
    return {"task_id": t.id, "item_id": t.item_id, "document_id": doc.id, "title": t.title, "due_at": t.due_at.isoformat(), "status": t.status,
            "category": item.category if item else None, "place": place or doc.city}


def _places(s: Session, item_ids: list[int]) -> dict[int, str]:
    """The provider the patient picked for an item, if any."""
    rows = s.exec(select(ProviderMatch, Provider).join(Provider, Provider.id == ProviderMatch.provider_id)
                  .where(ProviderMatch.item_id.in_(item_ids or [0]), ProviderMatch.selected == True)).all()  # noqa: E712
    return {m.item_id: f"{p.name}, {p.city}" for m, p in rows}


@router.get("/today")
def today(u: User = Depends(require("patient")), s: Session = Depends(get_session)):
    day, now = sim_today(s), sim_now(s)
    docs = s.exec(select(Document).where(Document.owner_id == u.id).order_by(Document.discharge_date.desc(), Document.id.desc())).all()
    by_id = {d.id: d for d in docs}
    ids = list(by_id)
    tasks = s.exec(select(Task).where(Task.document_id.in_(ids or [0])).order_by(Task.due_at)).all()
    items = {i.id: i for i in s.exec(select(Item).where(Item.document_id.in_(ids or [0])))}
    start, end = datetime.combine(day, time.min), datetime.combine(day, time.max)

    meds = {k: [] for k in SLOTS}
    for t in tasks:
        slot = _slot(t.title)
        if slot and start <= t.due_at <= end:
            meds[slot].append({"task_id": t.id, "document_id": t.document_id, "status": t.status, "due_at": t.due_at.isoformat(),
                               "medicines": [m.strip() for m in t.title.split(":", 1)[1].split(",")]})
    others = [t for t in tasks if not _slot(t.title)]
    places = _places(s, [t.item_id for t in others if t.status == "Pending" and t.due_at >= start])
    coming = [t for t in others if t.status == "Pending" and t.due_at >= start]
    next_event = _event(coming[0], by_id[coming[0].document_id], items.get(coming[0].item_id), places.get(coming[0].item_id)) if coming else None
    week = [_event(t, by_id[t.document_id], items.get(t.item_id), places.get(t.item_id)) for t in coming
            if t.due_at <= datetime.combine(day + timedelta(days=7), time.max)][:8]

    review = [{"item_id": i.id, "document_id": i.document_id, "title": i.title,
               "reason": " ".join(PLAIN.get(c, "") for c in (i.review_codes or [])).strip() or "A doctor needs to check this."}
              for i in items.values() if i.status == "Needs Review"]
    latest = docs[0] if docs else None
    mine = [t for t in tasks if latest and t.document_id == latest.id]
    due = [t for t in mine if t.due_at <= now]
    calls = s.exec(select(CallbackRequest).where(CallbackRequest.document_id.in_(ids or [0]),
                                                  CallbackRequest.state.in_(["requested", "scheduled", "connecting"]))).all()
    return {
        "today": day.isoformat(), "name": u.name,
        "plan": {"id": latest.id, "title": latest.title, "discharge_date": latest.discharge_date.isoformat()} if latest else None,
        "plans": len(docs), "medicines": meds, "next_event": next_event, "needs_review": review[:5], "needs_review_count": len(review),
        "progress": {"done": sum(t.status == "Completed" for t in due), "due": len(due),
                     "overdue": sum(t.status == "Pending" and t.due_at < now for t in mine), "total": len(mine)},
        "upcoming": week, "open_callbacks": len(calls),
    }


def _member_scopes(s: Session, u: User, with_unshared: bool = False) -> list[tuple[Consent, User]]:
    """(consent, patient) pairs. With with_unshared, patients in my hub who shared nothing yet show up with scope none."""
    q = select(Consent, User).join(User, User.id == Consent.patient_id).where(Consent.member_id == u.id)
    rows = [(c, p) for c, p in s.exec(q.order_by(User.name)).all() if c.scope != "none" or with_unshared]
    if with_unshared:
        mine = select(HubMember.hub_id).where(HubMember.user_id == u.id)
        have = {p.id for _, p in rows}
        for p in s.exec(select(User).join(HubMember, HubMember.user_id == User.id).where(HubMember.hub_id.in_(mine), HubMember.role == "patient")
                        .order_by(User.name)).all():
            if p.id not in have:
                rows.append((Consent(patient_id=p.id, member_id=u.id, scope="none"), p))
        rows.sort(key=lambda r: r[1].name)
    return rows


@router.get("/family/home")
def family_home(u: User = Depends(require("manager", "family")), s: Session = Depends(get_session)):
    """Each supported patient: today's status, overdue count, open alerts. Only what the consent scope allows."""
    day, now = sim_today(s), sim_now(s)
    start, end = datetime.combine(day, time.min), datetime.combine(day, time.max)
    pairs_ = _member_scopes(s, u, with_unshared=True)
    pids = [p.id for _, p in pairs_]
    docs = s.exec(select(Document).where(Document.owner_id.in_(pids or [0])).order_by(Document.discharge_date.desc())).all()
    by_owner: dict[int, list[Document]] = {}
    for d in docs:
        by_owner.setdefault(d.owner_id, []).append(d)
    dids = [d.id for d in docs]
    tasks = s.exec(select(Task).where(Task.document_id.in_(dids or [0]))).all()
    items = {i.id: i for i in s.exec(select(Item).where(Item.document_id.in_(dids or [0])))}
    alerts = s.exec(select(CaregiverAlert).where(CaregiverAlert.document_id.in_(dids or [0]),
                                                  CaregiverAlert.acknowledged_at.is_(None))).all()
    out = []
    for c, p in pairs_:
        mine = by_owner.get(p.id, [])
        mine_ids = {d.id for d in mine}
        t_mine = [t for t in tasks if t.document_id in mine_ids]
        entry = {"patient": {"id": p.id, "name": p.name}, "scope": c.scope, "plans": [{"id": d.id, "title": d.title} for d in mine[:3]],
                 "locked": {"status": c.scope == "appointments", "alerts": c.scope == "appointments"}}
        appts = [t for t in t_mine if t.status == "Pending" and t.due_at >= start and not _slot(t.title)
                 and (c.scope != "appointments" or (t.item_id in items and items[t.item_id].category in APPT))]
        entry["next_event"] = {"title": appts[0].title, "due_at": appts[0].due_at.isoformat()} if appts else None
        entry["locked"] = {"status": c.scope in ("appointments", "none"), "alerts": c.scope in ("appointments", "none")}
        if c.scope == "none":
            entry["plans"], entry["next_event"] = [], None
        if c.scope in ("full", "reminders"):
            today_t = [t for t in t_mine if start <= t.due_at <= end]
            entry["today"] = {"done": sum(t.status == "Completed" for t in today_t), "total": len(today_t)}
            entry["overdue"] = sum(t.status == "Pending" and t.due_at < now for t in t_mine)
            entry["open_alerts"] = sum(a.document_id in mine_ids for a in alerts)
        if c.scope == "full":
            entry["needs_review"] = sum(items[t_i].status == "Needs Review" for t_i in items if items[t_i].document_id in mine_ids)
        out.append(entry)
    return out


@router.get("/family/alerts")
def family_alerts(u: User = Depends(require("manager", "family")), s: Session = Depends(get_session)):
    """Open and recent alerts for patients who shared reminders (or everything), newest first."""
    pairs_ = [(c, p) for c, p in _member_scopes(s, u) if c.scope in ("full", "reminders")]
    pmap = {p.id: (c, p) for c, p in pairs_}
    docs = {d.id: d for d in s.exec(select(Document).where(Document.owner_id.in_(list(pmap) or [0])))}
    rows = s.exec(select(CaregiverAlert).where(CaregiverAlert.document_id.in_(list(docs) or [0]))
                  .order_by(CaregiverAlert.created_at.desc()).limit(60)).all()
    return [{**alert_dict(a), "patient": pmap[docs[a.document_id].owner_id][1].name, "document_id": a.document_id,
             "can_ack": u.role == "manager"} for a in rows]


@router.get("/calendar")
def calendar(month: str, u: User = Depends(require("patient", "manager", "family")), s: Session = Depends(get_session)):
    """Every task of one month in one place. A patient sees their own plans, family sees what each consent allows."""
    if month == "now":  # the demo clock's month
        month = sim_today(s).strftime("%Y-%m")
    try:
        y, m = (int(x) for x in month.split("-"))
        first = datetime(y, m, 1)
    except ValueError:
        raise HTTPException(422, "month must look like 2026-10")
    last = (first.replace(year=y + (m == 12), month=m % 12 + 1)) - timedelta(seconds=1)
    if u.role == "patient":
        scopes = {u.id: ("full", u)}
    else:
        scopes = {p.id: (c.scope, p) for c, p in _member_scopes(s, u)}
    docs = {d.id: d for d in s.exec(select(Document).where(Document.owner_id.in_(list(scopes) or [0])))}
    tasks = s.exec(select(Task).where(Task.document_id.in_(list(docs) or [0]), Task.due_at >= first, Task.due_at <= last).order_by(Task.due_at)).all()
    items = {i.id: i for i in s.exec(select(Item).where(Item.id.in_({t.item_id for t in tasks} or {0})))}
    now = sim_now(s)
    out = []
    for t in tasks:
        doc = docs[t.document_id]
        scope, owner = scopes[doc.owner_id]
        med = bool(_slot(t.title))
        cat = items[t.item_id].category if t.item_id in items else None
        if scope == "appointments" and (med or cat not in APPT):
            continue
        out.append({"id": t.id, "document_id": doc.id, "patient": owner.name, "title": t.title, "due_at": t.due_at.isoformat(),
                    "status": None if scope == "appointments" else t.status,
                    "overdue": False if scope == "appointments" else t.status == "Pending" and t.due_at < now, "kind": "medicine" if med else (cat or "other"),
                    "can_tick": u.role == "patient" or (u.role == "manager" and scope in ("full", "reminders"))})
    return {"month": month, "today": sim_today(s).isoformat(), "tasks": out}


# ---------- spoken day ----------
MONTHS = {
    "en": ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
    "ta": ["ஜனவரி", "பிப்ரவரி", "மார்ச்", "ஏப்ரல்", "மே", "ஜூன்", "ஜூலை", "ஆகஸ்ட்", "செப்டம்பர்", "அக்டோபர்", "நவம்பர்", "டிசம்பர்"],
    "hi": ["जनवरी", "फ़रवरी", "मार्च", "अप्रैल", "मई", "जून", "जुलाई", "अगस्त", "सितंबर", "अक्टूबर", "नवंबर", "दिसंबर"],
}
SAY = {
    "en": {"hello": "Hello {name}. Here is your plan for today.",
           "morning": "At 8 in the morning, take these medicines.", "afternoon": "At 1 in the afternoon, take these medicines.",
           "night": "At 9 at night, take these medicines.", "none": "You have no medicines left to take today.",
           "visit": "Your next visit.", "date": "That is {d} {m}, at {h}.", "end": "Take care."},
    "ta": {"hello": "வணக்கம் {name}. இன்றைய உங்கள் திட்டம் இது.",
           "morning": "காலை 8 மணிக்கு, இந்த மருந்துகளை எடுத்துக்கொள்ளுங்கள்.", "afternoon": "மதியம் 1 மணிக்கு, இந்த மருந்துகளை எடுத்துக்கொள்ளுங்கள்.",
           "night": "இரவு 9 மணிக்கு, இந்த மருந்துகளை எடுத்துக்கொள்ளுங்கள்.", "none": "இன்று எடுக்க வேண்டிய மருந்துகள் எதுவும் இல்லை.",
           "visit": "உங்கள் அடுத்த சந்திப்பு.", "date": "அது {m} {d}, {h} மணிக்கு.", "end": "உடல்நலத்தைப் பார்த்துக்கொள்ளுங்கள்."},
    "hi": {"hello": "नमस्ते {name}। यह आज की आपकी योजना है।",
           "morning": "सुबह 8 बजे, ये दवाइयां लें।", "afternoon": "दोपहर 1 बजे, ये दवाइयां लें।",
           "night": "रात 9 बजे, ये दवाइयां लें।", "none": "आज लेने के लिए कोई दवा बाकी नहीं है।",
           "visit": "आपकी अगली मुलाकात।", "date": "यानी {d} {m}, {h} बजे।", "end": "अपना ध्यान रखिए।"},
}


def _script(s: Session, u: User, lang: str, slot: str) -> list[str]:
    """What to say, in order, as natural sentences. Built only from the patient's own approved items."""
    from ..models import ItemText

    say_lang = lang if lang in SAY else "en"  # Telugu, Kannada and Malayalam read the English sentences until they are reviewed
    L, month = SAY[say_lang], MONTHS[say_lang]
    day = sim_today(s)
    start, end = datetime.combine(day, time.min), datetime.combine(day, time.max)
    docs = s.exec(select(Document).where(Document.owner_id == u.id)).all()
    ids = [d.id for d in docs]
    tasks = s.exec(select(Task).where(Task.document_id.in_(ids or [0])).order_by(Task.due_at)).all()
    items = s.exec(select(Item).where(Item.document_id.in_(ids or [0]))).all()
    by_title = {(i.document_id, i.title): i for i in items}
    texts: dict[int, dict[str, ItemText]] = {}
    for t in s.exec(select(ItemText).where(ItemText.item_id.in_([i.id for i in items] or [0]))):
        texts.setdefault(t.item_id, {})[t.language] = t

    def sentence(doc_id: int, name: str) -> str:
        it = by_title.get((doc_id, name))
        if not it or it.status == "Needs Review":
            return name  # held items are never explained, only named
        by = texts.get(it.id, {})
        pick = by.get(say_lang) if by.get(say_lang) and by[say_lang].numbers_verified else by.get("en")
        return pick.simple_text if pick else name

    out: list[str] = [] if slot != "all" else [L["hello"].format(name=u.name.split()[0])]
    spoke = False
    for sl in ("morning", "afternoon", "night"):
        if slot not in ("all", sl):
            continue
        todo = [(t.document_id, n.strip()) for t in tasks if _slot(t.title) == sl and t.status == "Pending" and start <= t.due_at <= end
                for n in t.title.split(":", 1)[1].split(",")]
        if todo:
            spoke = True
            out.append(L[sl])
            out += [sentence(d, n) for d, n in dict.fromkeys(todo)]
    if slot == "all":
        if not spoke:
            out.append(L["none"])
        nxt = next((t for t in tasks if not _slot(t.title) and t.status == "Pending" and t.due_at >= start), None)
        if nxt:
            hour = nxt.due_at.hour % 12 or 12
            out.append(L["visit"])
            out.append(sentence(nxt.document_id, nxt.title))
            out.append(L["date"].format(d=nxt.due_at.day, m=month[nxt.due_at.month - 1], h=hour))
        out.append(L["end"])
    return out


@router.get("/today/script")
def today_script(lang: str = "en", slot: str = "all", u: User = Depends(require("patient")), s: Session = Depends(get_session)):
    if slot not in ("all", "morning", "afternoon", "night"):
        raise HTTPException(422, "slot must be all, morning, afternoon or night")
    return {"lines": _script(s, u, lang, slot)}


@router.post("/today/speak")
def today_speak(body: dict, u: User = Depends(require("patient")), s: Session = Depends(get_session)):
    """The day read aloud by ElevenLabs. The server writes the sentences itself, so only the patient's own plan is ever spoken."""
    import os

    from fastapi.responses import Response as Raw

    from ..db import audit

    lang, slot = str(body.get("lang", "en")), str(body.get("slot", "all"))
    if lang not in ("en", "ta", "hi", "te", "kn", "ml") or slot not in ("all", "morning", "afternoon", "night"):
        raise HTTPException(422, "Unknown language or slot")
    text = " ".join(_script(s, u, lang, slot))[:2400]
    try:
        data = speak_text(text, lang if lang in SAY else "en")
    except Exception as e:
        raise HTTPException(502, f"Voice service failed: {type(e).__name__}")
    audit(s, None, f"user:{u.id}", "listened_day", {"lang": lang, "slot": slot})
    return Raw(data, media_type="audio/mpeg")
