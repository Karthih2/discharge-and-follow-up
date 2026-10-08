"""Planner: tasks and reminders from items that are not waiting for human review."""
import re
from datetime import datetime, time, timedelta

from sqlmodel import Session, select

from ..db import sim_today
from ..models import Document, Item, Reminder, Task

SLOT_TIMES = {"morning": time(8), "afternoon": time(13), "night": time(21)}
SLOT_ORDER = ["morning", "afternoon", "night"]
DATED = {"appointment", "test", "referral", "rehab", "wound_care"}
PLAN_DAYS = 7  # ponytail: fixed 7 day medicine horizon, make it a setting if plans need to run longer


def slots_of(item: Item) -> list[str]:
    return [s for s in SLOT_ORDER if s in (item.time_of_day or "")]


def _med_days(item: Item) -> int:
    m = re.search(r"\bfor (\d+) days?\b", item.original_text, re.I)
    return min(int(m[1]), PLAN_DAYS) if m else PLAN_DAYS


def plan_item(session: Session, item: Item) -> int:
    """Create dated tasks and reminders for one item. Idempotent. Returns tasks created."""
    if item.status == "Needs Review" or item.status == "Rejected":
        return 0
    if session.exec(select(Task).where(Task.item_id == item.id)).first():
        return 0
    if item.category not in DATED or not item.date_resolved:
        return 0
    hour = time(8) if item.category == "test" else time(10)
    due = datetime.combine(item.date_resolved, hour)
    task = Task(item_id=item.id, document_id=item.document_id, title=item.title, due_at=due)
    session.add(task)
    session.commit()
    session.refresh(task)
    for when in (datetime.combine(item.date_resolved - timedelta(days=1), time(9)),
                 datetime.combine(item.date_resolved, time(7))):
        session.add(Reminder(task_id=task.id, remind_at=when))
    session.commit()
    return 1


def plan_medicines(session: Session, doc: Document) -> int:
    """One task per time of day per day, listing all approved medicines for that slot."""
    # Rebuild: drop still pending medicine tasks, keep completed ones.
    old = session.exec(select(Task).where(Task.document_id == doc.id, Task.title.like("% medicines:%"))).all()
    done_keys = {t.due_at for t in old if t.status == "Completed"}
    for t in old:
        if t.status == "Pending":
            for r in session.exec(select(Reminder).where(Reminder.task_id == t.id)):
                session.delete(r)
            session.delete(t)
    session.commit()
    meds = [i for i in session.exec(select(Item).where(Item.document_id == doc.id, Item.category == "medication"))
            if i.status not in ("Needs Review", "Rejected") and slots_of(i)]
    if not meds:
        return 0
    start = max(doc.discharge_date, sim_today(session))
    created = 0
    for day in range(PLAN_DAYS):
        d = start + timedelta(days=day)
        for slot in SLOT_ORDER:
            group = [m for m in meds if slot in slots_of(m) and day < _med_days(m)]
            if not group:
                continue
            title = f"{slot.capitalize()} medicines: " + ", ".join(m.title for m in group)
            due = datetime.combine(d, SLOT_TIMES[slot])
            if due in done_keys:
                continue
            task = Task(item_id=group[0].id, document_id=doc.id, title=title, due_at=due)
            session.add(task)
            session.commit()
            session.refresh(task)
            session.add(Reminder(task_id=task.id, remind_at=task.due_at))
            created += 1
    session.commit()
    return created


def plan_document(session: Session, doc: Document) -> int:
    items = session.exec(select(Item).where(Item.document_id == doc.id)).all()
    n = sum(plan_item(session, i) for i in items)
    return n + plan_medicines(session, doc)
