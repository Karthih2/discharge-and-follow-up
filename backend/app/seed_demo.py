"""Demo history: a hospital that has used CareBridge for a month. Deterministic (fixed seed), DEMO=1 only.
Every person, hospital, email and phone number is invented. Dates are relative to the demo clock."""
import random
from datetime import date, datetime, time, timedelta

from sqlmodel import Session, select

from . import routing
from .agents.escalation import run_escalation
from .agents.planner import plan_item, plan_medicines
from .agents.samples import DEPARTMENT, sample_index, sample_text
from .auth import hash_password
from .db import get_setting, sim_now, sim_today
from .models import (AuditLog, CallbackRequest, CaregiverAlert, Consent, Doctor, Document, FamilyHub, HubMember, Item,
                     Reminder, ReviewQueue, Task, User)
from .seed import DEMO_PASSWORD, _fast_fixtures

SEED = 20261012
MARK_EMAIL = "deepak@code2care.test"  # present once the extras are loaded

# key, name, email prefix, role, language
EXTRA_USERS = [
    ("sanjay", "Sanjay Hegde (hub manager)", "manager", "en"),
    ("pooja", "Pooja Hegde (family viewer)", "family", "kn"),
    ("latha", "Latha Reddy (hub manager)", "manager", "te"),
    ("kiran", "Kiran Reddy (family viewer)", "family", "en"),
    ("kavya", "Dr. Kavya Menon", "doctor", "en"),
    ("imran", "Dr. Imran Qureshi", "doctor", "en"),
]
EXTRA_DOCTORS = {"kavya": ("neurology", "044-5550-0205"), "imran": ("pulmonology", "011-5550-0206")}
BACKUP = {"meera": "arjun", "arjun": "meera", "sana": "arjun", "vikram": "arjun", "kavya": "meera", "imran": "arjun"}

# key, name, prefix, city, pincode, language, sample, days since discharge, profile
PATIENTS = [
    ("murugan", "Murugan Selvam", "Mr.", "Chennai", "600010", "ta", "h", 26, "on_track"),
    ("kavitha", "Kavitha Raman", "Mrs.", "Chennai", "600040", "ta", "f", 8, "mostly"),
    ("deepak", "Deepak Hegde", "Mr.", "Bengaluru", "560034", "kn", "f", 21, "behind"),
    ("shreya", "Shreya Gowda", "Ms.", "Bengaluru", "560066", "en", "g", 6, "on_track"),
    ("venkat", "Venkat Reddy", "Mr.", "Hyderabad", "500034", "te", "e", 18, "behind"),
    ("farah", "Farah Sultana", "Mrs.", "Hyderabad", "500081", "hi", "h", 9, "on_track"),
    ("thomas", "Thomas Mathew", "Mr.", "Kochi", "682016", "ml", "f", 29, "on_track"),
    ("reshma", "Reshma Nair", "Ms.", "Kochi", "682024", "ml", "g", 14, "mostly"),
    ("rohit", "Rohit Malhotra", "Mr.", "Delhi", "110024", "hi", "e", 12, "mostly"),
    ("neha", "Neha Kapoor", "Ms.", "Delhi", "110075", "en", "h", 3, "on_track"),
]
# A second stay for some patients: owner, sample, days since discharge, profile
SECOND_PLANS = [("murugan", "g", 28, "on_track"), ("kavitha", "h", 19, "on_track"), ("reshma", "e", 25, "mostly"),
                ("rohit", "g", 4, "on_track"), ("neha", "f", 16, "mostly"), ("farah", "e", 22, "on_track")]
HOSPITAL = {"Chennai": "Cauvery Care Hospital", "Bengaluru": "Lakeview Medical Centre", "Hyderabad": "Golconda Care Hospital",
            "Kochi": "Backwater General Hospital", "Delhi": "Yamuna Heights Hospital"}
DONE_P = {"on_track": 0.97, "mostly": 0.9, "behind": 0.72}
NOTES = {"approved": ["Matches the source line.", "Checked against the summary.", "Confirmed."],
         "edited": ["Filled in the missing values.", "Wording made clearer.", "Corrected and confirmed."],
         "rejected": ["Sent back. The source line is not clear enough.", "Sent back. Please ask the hospital to confirm."]}


def _plan_text(sample: str, patient: dict, discharge) -> str:
    """The sample text with this patient's name, hospital and dates. The lines that matter stay as they are."""
    out = []
    for i, line in enumerate(sample_text(sample).splitlines()):
        if i == 0:
            line = f"{HOSPITAL[patient['city']].upper()}, {patient['city'].upper()}"
        elif line.startswith("Patient:"):
            line = f"Patient: {patient['prefix']} {patient['name']} (synthetic)"
        elif line.startswith("Date of admission:"):
            line = f"Date of admission: {(discharge - timedelta(days=4)):%d %b %Y}"
        elif line.startswith("Date of discharge:"):
            line = f"Date of discharge: {discharge:%d %b %Y}"
        out.append(line)
    return "\n".join(out) + "\n"


def _alias(prefix: str, name: str) -> str:
    first, *rest = name.split()
    return f"{prefix} {first[0]}. {rest[-1]} (synthetic)"


def _make_plan(s: Session, owner: User, sample: str, discharge, patient: dict | None = None) -> Document:
    from .agents.pipeline import run_pipeline

    meta = next(m for m in sample_index() if m["key"] == sample)
    if patient:
        text, alias = _plan_text(sample, patient, discharge), _alias(patient["prefix"], patient["name"])
        city, pin = patient["city"], patient["pincode"]
    else:
        text, alias, city, pin = sample_text(sample), meta["patient_alias"], meta["city"], meta["pincode"]
    doc = Document(owner_id=owner.id, title=meta["title"], patient_alias=alias, discharge_date=discharge, city=city,
                   pincode=pin, preferred_language=owner.language, department=DEPARTMENT[sample], raw_text=text,
                   pii_check_passed=True, created_at=datetime.combine(discharge, time(10, 5)))
    s.add(doc)
    s.commit()
    s.refresh(doc)
    for _ in run_pipeline(doc.id, skip=("plan", "escalate")):
        pass
    return doc


def _age_plan(s: Session, rng: random.Random, doc: Document, profile: str, now: datetime) -> list[AuditLog]:
    """Give a freshly built plan a past: reviews cleared at realistic speeds, tasks done or missed."""
    days_ago = (now.date() - doc.discharge_date).days
    disc_dt = datetime.combine(doc.discharge_date, time(10, 5))
    audit_rows: list[AuditLog] = []
    # the pipeline's own audit rows get a believable timeline right after the upload
    for i, a in enumerate(s.exec(select(AuditLog).where(AuditLog.document_id == doc.id).order_by(AuditLog.id)).all()):
        a.created_at = disc_dt + timedelta(seconds=20 * i)
        s.add(a)
    owner = s.get(User, doc.owner_id)
    audit_rows.append(AuditLog(document_id=doc.id, actor=f"user:{owner.id}", action="uploaded", detail={"masked": []},
                               created_at=disc_dt - timedelta(minutes=2)))

    p_resolve = min(0.97, 0.35 + days_ago * 0.06) if profile != "behind" else min(0.6, 0.15 + days_ago * 0.025)
    for r in s.exec(select(ReviewQueue).where(ReviewQueue.document_id == doc.id).order_by(ReviewQueue.id)).all():
        r.created_at = created = disc_dt + timedelta(minutes=rng.randint(8, 70))
        item = s.get(Item, r.item_id)
        if rng.random() >= p_resolve:
            s.add(r)
            continue
        if r.fallback_doctor_id and rng.random() < 0.22:  # the first doctor was away: it moved to the backup
            old, r.assigned_doctor_id, r.fallback_doctor_id = r.assigned_doctor_id, r.fallback_doctor_id, r.assigned_doctor_id
            audit_rows.append(AuditLog(document_id=doc.id, actor="routing", action="fallback",
                                       detail={"review_id": r.id, "from": old, "to": r.assigned_doctor_id},
                                       created_at=created + timedelta(minutes=30)))
        action = rng.choices(["approved", "edited", "rejected"], [0.54, 0.26, 0.2])[0]
        hours = rng.choice([1.2, 2, 3, 4.5, 6, 9, 13, 21, 27, 41, 53]) + rng.random()
        r.resolved_at = min(created + timedelta(hours=hours), now - timedelta(minutes=45))
        r.state, r.reviewer_note = action, rng.choice(NOTES[action])
        item.status = "Rejected" if action == "rejected" else "Pending"
        item.reviewed_by = None if action == "rejected" else r.assigned_doctor_id
        s.add_all([r, item])
        audit_rows.append(AuditLog(document_id=doc.id, actor=f"user:{r.assigned_doctor_id}", action=f"review_{action}",
                                   detail={"review_id": r.id, "item_id": item.id, "note": r.reviewer_note},
                                   created_at=r.resolved_at))
    s.commit()
    for item in s.exec(select(Item).where(Item.document_id == doc.id, Item.status == "Pending")).all():
        plan_item(s, item)
    # medicine tasks run from the discharge day, so every day of the stay has them
    plan_medicines(s, doc, start=doc.discharge_date, horizon=min(days_ago + 7, 30))

    base = DONE_P[profile]
    tasks = s.exec(select(Task).where(Task.document_id == doc.id)).all()
    for rem in s.exec(select(Reminder).where(Reminder.task_id.in_([t.id for t in tasks] or [0]))):
        rem.sent = rem.remind_at <= now
        s.add(rem)
    for t in tasks:
        if t.due_at > now:
            continue
        recent = t.due_at > now - timedelta(days=5)
        p = base if recent else min(0.98, base + 0.12)
        if rng.random() < p:
            t.status = "Completed"
            t.completed_at = min(t.due_at + timedelta(minutes=rng.randint(-20, 240)), now)
            s.add(t)
            if rng.random() < 0.3:
                who = owner.id if rng.random() < 0.8 else None
                audit_rows.append(AuditLog(document_id=doc.id, actor=f"user:{who}" if who else "user:0", action="task_completed",
                                           detail={"task_id": t.id, "title": t.title, "role": "patient"}, created_at=t.completed_at))
    s.commit()
    return audit_rows


def _fix_escalations(s: Session, now: datetime) -> None:
    """run_escalation stamps rows with the clock. Move them to when the task actually went late."""
    care_h = float(get_setting(s, "caregiver_threshold_hours"))
    rev_h = float(get_setting(s, "reviewer_threshold_hours"))
    tasks = {t.id: t for t in s.exec(select(Task))}
    for a in s.exec(select(CaregiverAlert)).all():
        t = tasks.get(a.task_id)
        if t and a.created_at >= now - timedelta(days=1) and t.due_at + timedelta(hours=care_h) < now:
            a.created_at = t.due_at + timedelta(hours=care_h)
            s.add(a)
    for r in s.exec(select(ReviewQueue).where(ReviewQueue.reason.like("Overdue task #%"))).all():
        tid = r.reason.split("#")[1].split(":")[0] if "#" in r.reason else None
        t = tasks.get(int(tid)) if tid and tid.isdigit() else None
        if t:
            r.created_at = min(t.due_at + timedelta(hours=rev_h), now - timedelta(minutes=5))
            s.add(r)
    for a in s.exec(select(AuditLog).where(AuditLog.actor == "escalation")).all():
        t = tasks.get(a.detail.get("task_id"))
        if t:
            late = rev_h if a.action == "reviewer_escalation" else care_h if a.action == "caregiver_alert" else 6
            a.created_at = min(t.due_at + timedelta(hours=late), now - timedelta(minutes=5))
            s.add(a)
    s.commit()


def _acknowledge_old_alerts(s: Session, rng: random.Random, now: datetime) -> None:
    for a in s.exec(select(CaregiverAlert).order_by(CaregiverAlert.id)).all():
        if a.acknowledged_at is None and a.created_at < now - timedelta(days=2) and rng.random() < 0.7:
            a.acknowledged_at = min(a.created_at + timedelta(hours=rng.randint(1, 14)), now - timedelta(hours=1))
            s.add(a)
    s.commit()


def _callbacks(s: Session, rng: random.Random, docs: list[Document], now: datetime) -> list[AuditLog]:
    """Fourteen callbacks over 30 days: requested, scheduled, in progress, completed and no answer."""
    states = ["completed"] * 6 + ["no_answer"] * 2 + ["connecting"] * 2 + ["scheduled"] * 2 + ["requested"] * 2
    out: list[AuditLog] = []
    pool = [d for d in docs if (now.date() - d.discharge_date).days >= 2]
    for i, state in enumerate(states):
        doc = pool[(i * 5) % len(pool)]
        item = s.exec(select(Item).where(Item.document_id == doc.id, Item.status == "Pending")).first() or \
            s.exec(select(Item).where(Item.document_id == doc.id)).first()
        review = s.exec(select(ReviewQueue).where(ReviewQueue.document_id == doc.id)).first()
        doctor = review.assigned_doctor_id if review else routing.pick(s, f"{item.title} {item.original_text}")[0]
        horizon = max(1, (now.date() - doc.discharge_date).days)
        created = max(datetime.combine(doc.discharge_date, time(11)), now - timedelta(days=min(horizon, 29 - i * 2 if state == "completed" else 2),
                                                                                     hours=rng.randint(0, 9)))
        if state in ("requested", "scheduled", "connecting"):
            created = now - timedelta(hours=rng.randint(2, 30))
        cb = CallbackRequest(item_id=item.id, document_id=doc.id, requested_by=doc.owner_id, doctor_id=doctor, state=state,
                             patient_number=f"+91 98XXX XX{(doc.owner_id * 137 + item.id * 31) % 900 + 100}",
                             note=rng.choice(["Can I take this with food?", "I am not sure about the dose.", "Please explain this instruction.", None]),
                             created_at=created)
        if state == "scheduled":
            cb.scheduled_for = (now + timedelta(days=1)).replace(hour=11, minute=0)
        if state == "completed":
            cb.call_notes = rng.choice(["Explained the instruction. Patient understood.", "Confirmed the timing with the patient.",
                                        "Answered the question. No change to the plan."])
        if state == "no_answer":
            cb.call_notes = "No answer. Will try again tomorrow."
        s.add(cb)
        s.commit()
        s.refresh(cb)
        out.append(AuditLog(document_id=doc.id, actor=f"user:{doc.owner_id}", action="callback_requested",
                            detail={"item_id": item.id, "callback_id": cb.id}, created_at=created))
        if state != "requested":
            out.append(AuditLog(document_id=doc.id, actor="management", action=f"callback_{state}",
                                detail={"callback_id": cb.id}, created_at=created + timedelta(hours=rng.randint(1, 5))))
    return out


def _background_audit(s: Session, rng: random.Random, ids: dict[str, int], now: datetime) -> list[AuditLog]:
    """Sign ins on each of the last 30 days, plus the setup events management would have made."""
    rows = [AuditLog(document_id=None, actor="management", action="doctor_added", detail={"doctor": ids["kavya"]},
                     created_at=now - timedelta(days=29, hours=3)),
            AuditLog(document_id=None, actor="management", action="doctor_added", detail={"doctor": ids["imran"]},
                     created_at=now - timedelta(days=29, hours=2))]
    people = [(k, r) for k, r in [("ramesh", "patient"), ("lakshmi", "patient"), ("priya", "manager"), ("arun", "family"),
                                  ("sanjay", "manager"), ("meera", "doctor"), ("arjun", "doctor"), ("sana", "doctor"),
                                  ("vikram", "doctor"), ("kavya", "doctor"), ("imran", "doctor"), ("admin", "management")]]
    for day in range(30, -1, -1):
        base = datetime.combine(now.date() - timedelta(days=day), time(8))
        for key, role in people:
            if day > 20 and key in ("ramesh", "lakshmi", "priya", "arun"):
                continue  # these four were not users yet
            if rng.random() < 0.6:
                rows.append(AuditLog(document_id=None, actor=f"user:{ids[key]}", action="login", detail={"role": role},
                                     created_at=base + timedelta(minutes=rng.randint(0, 600))))
    rows.append(AuditLog(document_id=None, actor="management", action="availability_changed",
                         detail={"doctor": ids["vikram"], "available": False, "moved": 0}, created_at=now - timedelta(hours=20)))
    return rows


def seed_demo_extras(s: Session) -> dict:
    """Idempotent. Adds patients, doctors, hubs, plans, reviews, callbacks, alerts and a month of audit history."""
    if s.exec(select(User).where(User.email == MARK_EMAIL)).first():
        return {}
    with _fast_fixtures():
        return _seed(s)


def _seed(s: Session) -> dict:
    rng = random.Random(SEED)
    now = sim_now(s)
    today = sim_today(s)
    pw = hash_password(DEMO_PASSWORD)
    ids = {u.email.split("@")[0]: u.id for u in s.exec(select(User))}

    # people
    for key, name, role, lang in EXTRA_USERS:
        u = User(name=name, email=f"{key}@code2care.test", password_hash=pw, role=role, language=lang,
                 created_at=now - timedelta(days=30))
        s.add(u)
        s.commit()
        s.refresh(u)
        ids[key] = u.id
        if key in EXTRA_DOCTORS:
            spec, phone = EXTRA_DOCTORS[key]
            s.add(Doctor(user_id=u.id, specialty=spec, phone=phone))
    patients: dict[str, dict] = {}
    for key, name, prefix, city, pin, lang, sample, days, profile in PATIENTS:
        u = User(name=name, email=f"{key}@code2care.test", password_hash=pw, role="patient", language=lang,
                 created_at=now - timedelta(days=days + 1))
        s.add(u)
        s.commit()
        s.refresh(u)
        ids[key] = u.id
        patients[key] = {"name": name, "prefix": prefix, "city": city, "pincode": pin, "user": u}
    # doctor backups and the one doctor who is away
    for d in s.exec(select(Doctor)).all():
        uid = next(u.id for u in s.exec(select(User).where(User.id == d.user_id)))
        key = next(k for k, v in ids.items() if v == uid)
        d.backup_user_id = ids[BACKUP[key]]
        s.add(d)
    s.commit()

    # hubs and consent
    hubs = [("Hegde family", "sanjay", "pooja", ["deepak", "shreya"]), ("Reddy family", "latha", "kiran", ["venkat", "farah"])]
    for name, mgr, viewer, pats in hubs:
        hub = FamilyHub(name=name, created_by=ids[mgr])
        s.add(hub)
        s.commit()
        s.refresh(hub)
        s.add(HubMember(hub_id=hub.id, user_id=ids[mgr], role="manager"))
        s.add(HubMember(hub_id=hub.id, user_id=ids[viewer], role="family"))
        for p in pats:
            s.add(HubMember(hub_id=hub.id, user_id=ids[p], role="patient"))
    for patient, member, scope in [("deepak", "sanjay", "full"), ("deepak", "pooja", "reminders"), ("shreya", "sanjay", "appointments"),
                                   ("shreya", "pooja", "none"), ("venkat", "latha", "full"), ("venkat", "kiran", "appointments"),
                                   ("farah", "latha", "reminders"), ("farah", "kiran", "none")]:
        s.add(Consent(patient_id=ids[patient], member_id=ids[member], scope=scope, updated_at=now - timedelta(days=rng.randint(5, 25))))
    s.commit()

    # plans: Sunita and Karthik get theirs (b and c), then ten patients, then second stays
    docs: list[tuple[Document, str]] = []
    for sample, owner in (("b", "sunita"), ("c", "karthik")):
        u = s.get(User, ids[owner])
        if not s.exec(select(Document).where(Document.owner_id == u.id)).first():
            meta = next(m for m in sample_index() if m["key"] == sample)
            docs.append((_make_plan(s, u, sample, date.fromisoformat(meta["discharge_date"])), "mostly"))
    for key, _name, _prefix, _city, _pin, _lang, sample, days, profile in PATIENTS:
        docs.append((_make_plan(s, patients[key]["user"], sample, today - timedelta(days=days), patients[key]), profile))
    for key, sample, days, profile in SECOND_PLANS:
        docs.append((_make_plan(s, patients[key]["user"], sample, today - timedelta(days=days), patients[key]), profile))

    audit_rows: list[AuditLog] = []
    for doc, profile in docs:
        audit_rows += _age_plan(s, rng, doc, profile, now)
    # Ramesh and Lakshmi keep the plans they already had: their open reviews stay open for the demo.

    # away doctor: Vikram. Open items move to the backup.
    v = s.exec(select(Doctor).where(Doctor.user_id == ids["vikram"])).first()
    v.available = False
    s.add(v)
    s.commit()
    routing.reassign_unavailable(s)

    run_escalation(s)
    _fix_escalations(s, now)
    _acknowledge_old_alerts(s, rng, now)
    all_docs = list(s.exec(select(Document)).all())
    audit_rows += _callbacks(s, rng, all_docs, now)
    audit_rows += _background_audit(s, rng, ids, now)
    s.add_all(audit_rows)
    s.commit()
    return {"patients": len(PATIENTS), "plans": len(docs), "audit": len(audit_rows)}
