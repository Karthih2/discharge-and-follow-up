"""Reviewer routing with fallback, plus in-app notifications."""
from sqlmodel import Session, select

from .db import audit
from .models import Consent, Doctor, Item, Notification, ReviewQueue, User

SPECIALTY_WORDS = {
    "cardiology": ["heart", "cardi", "aspirin", "clopidogrel", "metoprolol", "atorvastatin", "chest", "ecg", "angioplasty"],
    "diabetology": ["diabet", "insulin", "sugar", "hba1c", "glimepiride", "metformin"],
    "orthopaedics": ["knee", "ortho", "physio", "stitch", "wound", "walker", "calf", "bone"],
}


def notify(s: Session, user_id: int | None, document_id: int | None, message: str, level: str = "info") -> None:
    if user_id:
        s.add(Notification(user_id=user_id, document_id=document_id, message=message, level=level))
        s.commit()


def family_to_notify(s: Session, patient_id: int) -> list[int]:
    """Managers who have the patient's consent for reminders (full or reminders)."""
    ids = []
    for c in s.exec(select(Consent).where(Consent.patient_id == patient_id, Consent.scope.in_(["full", "reminders"]))):
        u = s.get(User, c.member_id)
        if u and u.role == "manager":
            ids.append(u.id)
    return ids


def available_doctors(s: Session) -> list[Doctor]:
    return list(s.exec(select(Doctor).where(Doctor.available == True)))  # noqa: E712


def pick(s: Session, text: str, exclude: set[int] | None = None) -> tuple[int | None, int | None]:
    """Primary = available doctor whose specialty fits best. Backup = next available doctor."""
    exclude = exclude or set()
    docs = [d for d in available_doctors(s) if d.user_id not in exclude]
    t = text.lower()

    def score(d: Doctor) -> int:
        return sum(w in t for w in SPECIALTY_WORDS.get(d.specialty, [])) * 2 + (1 if d.specialty == "general medicine" else 0)

    docs.sort(key=lambda d: (-score(d), d.id))
    primary = docs[0].user_id if docs else None
    backup = docs[1].user_id if len(docs) > 1 else None
    return primary, backup


def assign(s: Session, entry: ReviewQueue) -> None:
    item = s.get(Item, entry.item_id)
    text = f"{item.title} {item.original_text}" if item else ""
    entry.assigned_doctor_id, entry.fallback_doctor_id = pick(s, text)
    s.add(entry)
    s.commit()
    if entry.assigned_doctor_id:
        notify(s, entry.assigned_doctor_id, entry.document_id, f"New item to review: {item.title if item else ''}", "warning")
    audit(s, entry.document_id, "routing", "assigned", {"review_id": entry.id, "doctor": entry.assigned_doctor_id,
                                                         "fallback": entry.fallback_doctor_id})


def reassign_unavailable(s: Session) -> int:
    """When a doctor becomes unavailable, open items move to the fallback, then to anyone available."""
    moved = 0
    avail = {d.user_id for d in available_doctors(s)}
    for r in s.exec(select(ReviewQueue).where(ReviewQueue.state == "open")):
        if r.assigned_doctor_id in avail:
            continue
        old = r.assigned_doctor_id
        if r.fallback_doctor_id in avail:
            r.assigned_doctor_id = r.fallback_doctor_id
        else:
            item = s.get(Item, r.item_id)
            r.assigned_doctor_id, _ = pick(s, f"{item.title} {item.original_text}" if item else "", {old or -1})
        _, r.fallback_doctor_id = pick(s, "", {r.assigned_doctor_id or -1})
        s.add(r)
        s.commit()
        moved += 1
        notify(s, r.assigned_doctor_id, r.document_id, "A review item was moved to you because a colleague is unavailable", "warning")
        audit(s, r.document_id, "routing", "fallback", {"review_id": r.id, "from": old, "to": r.assigned_doctor_id})
    return moved
