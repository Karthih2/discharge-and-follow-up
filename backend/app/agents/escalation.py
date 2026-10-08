"""Escalation engine. Runs on demand and on every plan load, against the simulated clock.
Replaces a job queue for the demo: it is idempotent, so running it often is safe."""
from sqlmodel import Session, select

from .. import routing
from ..db import audit, get_setting, sim_now
from ..models import CaregiverAlert, Document, Reminder, ReviewQueue, Task


def run_escalation(session: Session, document_id: int | None = None) -> dict:
    now = sim_now(session)
    remind_h = float(get_setting(session, "remind_threshold_hours"))
    care_h = float(get_setting(session, "caregiver_threshold_hours"))
    rev_h = float(get_setting(session, "reviewer_threshold_hours"))
    q = select(Task).where(Task.status == "Pending", Task.due_at <= now)
    if document_id:
        q = q.where(Task.document_id == document_id)
    counts = {"reminders": 0, "alerts": 0, "reviews": 0}
    for t in session.exec(q).all():
        doc = session.get(Document, t.document_id)
        late = (now - t.due_at).total_seconds() / 3600
        for r in session.exec(select(Reminder).where(Reminder.task_id == t.id, Reminder.remind_at <= now, Reminder.sent == False)):  # noqa: E712
            r.sent = True
            session.add(r)
        if late >= remind_h and not session.exec(
                select(Reminder).where(Reminder.task_id == t.id, Reminder.remind_at > t.due_at)).first():
            session.add(Reminder(task_id=t.id, remind_at=now, channel="in_app", sent=True))
            counts["reminders"] += 1
            routing.notify(session, doc.owner_id, t.document_id, f"Reminder: {t.title} is overdue", "warning")
            audit(session, t.document_id, "escalation", "overdue_reminder", {"task_id": t.id})
        alert = session.exec(select(CaregiverAlert).where(CaregiverAlert.task_id == t.id)).first()
        if late >= care_h and not alert:
            msg = f"Not done yet: {t.title} (due {t.due_at:%d %b, %I:%M %p})"
            alert = CaregiverAlert(document_id=t.document_id, task_id=t.id, level="warning", message=msg)
            session.add(alert)
            counts["alerts"] += 1
            for uid in routing.family_to_notify(session, doc.owner_id):
                routing.notify(session, uid, t.document_id, f"{doc.patient_alias}: {msg}", "warning")
            audit(session, t.document_id, "escalation", "caregiver_alert", {"task_id": t.id})
        if late >= rev_h:
            if alert and alert.level != "urgent":
                alert.level = "urgent"
                session.add(alert)
            reason = f"Overdue task #{t.id}: {t.title}"
            if not session.exec(select(ReviewQueue).where(ReviewQueue.item_id == t.item_id, ReviewQueue.reason == reason)).first():
                entry = ReviewQueue(item_id=t.item_id, document_id=t.document_id, reason=reason, severity="high", codes=["OVERDUE"])
                session.add(entry)
                session.commit()
                session.refresh(entry)
                routing.assign(session, entry)
                counts["reviews"] += 1
                audit(session, t.document_id, "escalation", "reviewer_escalation", {"task_id": t.id})
    session.commit()
    return counts
