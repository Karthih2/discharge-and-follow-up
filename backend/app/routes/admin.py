"""Management view: monitor the queue, assign reviewers, handle fallback. No clinical edits and no clinical text."""
import csv
import io
import re
import statistics
from datetime import date, datetime, time, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Response
from fastapi.responses import Response as RawResponse
from pydantic import BaseModel
from sqlalchemy import case, func, true
from sqlmodel import Session, select

from .. import routing
from ..auth import hash_password, require
from ..db import audit, clock_now, get_session, pairs, get_setting, set_setting, sim_now, sim_today
from ..models import (AuditLog, CallbackRequest, CaregiverAlert, Doctor, Document, Item, ReviewQueue, Task, User)
from ..seed import load_demo_data
from ..seed_demo import seed_demo_extras
from .auth_routes import LANGS, user_dict
from .clinical import OPEN_CALLS, AvailIn, callback_rows, entries, page, set_availability

router = APIRouter(prefix="/api/admin", dependencies=[Depends(require("management"))])


def _late(s: Session) -> datetime:
    """Open reviews created before this are overdue."""
    return clock_now() - timedelta(hours=float(get_setting(s, "reviewer_threshold_hours")))


@router.get("/overview")
def overview(s: Session = Depends(get_session)):
    now = sim_now(s)
    count = lambda *w: s.exec(select(func.count()).select_from(w[0]).where(*w[1:])).one()  # noqa: E731
    open_r = (ReviewQueue.state == "open",)
    return {
        "patients": count(User, User.role == "patient"),
        "plans": count(Document, true()),
        "items": count(Item, true()),
        "reviews_open": count(ReviewQueue, *open_r),
        "reviews_high": count(ReviewQueue, *open_r, ReviewQueue.severity == "high"),
        "reviews_unassigned": count(ReviewQueue, *open_r, ReviewQueue.assigned_doctor_id.is_(None)),
        "reviews_resolved": count(ReviewQueue, ReviewQueue.state != "open"),
        "tasks_pending": count(Task, Task.status == "Pending"),
        "tasks_completed": count(Task, Task.status == "Completed"),
        "tasks_overdue": count(Task, Task.status == "Pending", Task.due_at < now),
        "alerts_open": count(CaregiverAlert, CaregiverAlert.acknowledged_at.is_(None)),
        "callbacks_open": count(CallbackRequest, CallbackRequest.state == "requested"),
    }


# ---------- dashboard ----------
def _pct(done: int, total: int) -> float:
    return round(100 * done / total, 1) if total else 0.0


@router.get("/stats")
def stats(days: int = 30, department: Optional[str] = None, s: Session = Depends(get_session)):
    """Every number and chart on the overview, computed from the database for a date range and an optional department."""
    days = days if days in (7, 30, 90) else 30
    today, now = sim_today(s), sim_now(s)
    first = datetime.combine(today - timedelta(days=days - 1), time.min)
    last = datetime.combine(today, time.max)
    dept = (lambda col: [col == department]) if department else (lambda col: [])
    R, D = ReviewQueue, Document

    def reviews(*where):
        q = select(R).join(D, D.id == R.document_id).where(*where, *dept(D.department))
        return q

    created = s.exec(reviews(R.created_at >= first, R.created_at <= last)).all()
    cleared = s.exec(reviews(R.resolved_at >= first, R.resolved_at <= last)).all()
    hours = [(r.resolved_at - r.created_at).total_seconds() / 3600 for r in cleared]
    open_now = s.exec(reviews(R.state == "open")).all()
    late = _late(s)
    tasks_due = select(Task).join(D, D.id == Task.document_id).where(Task.due_at >= first, Task.due_at <= min(last, now), *dept(D.department))
    due_rows = s.exec(tasks_due).all()
    overdue_now = s.exec(select(func.count()).select_from(Task).join(D, D.id == Task.document_id).where(
        Task.status == "Pending", Task.due_at < now, *dept(D.department))).one()
    plans = s.exec(select(func.count()).select_from(D).where(D.created_at >= first, D.created_at <= last, *dept(D.department))).one()
    callbacks_done = s.exec(select(func.count()).select_from(CallbackRequest).join(D, D.id == CallbackRequest.document_id).where(
        CallbackRequest.state == "completed", CallbackRequest.created_at >= first, CallbackRequest.created_at <= last,
        *dept(D.department))).one()
    alerts_open = s.exec(select(func.count()).select_from(CaregiverAlert).join(D, D.id == CaregiverAlert.document_id).where(
        CaregiverAlert.acknowledged_at.is_(None), *dept(D.department))).one()

    # one row per day
    opened, closed = {}, {}
    for r in created:
        opened[r.created_at.date()] = opened.get(r.created_at.date(), 0) + 1
    for r in cleared:
        closed[r.resolved_at.date()] = closed.get(r.resolved_at.date(), 0) + 1
    per_day = []
    for i in range(days):
        d = today - timedelta(days=days - 1 - i)
        per_day.append({"date": d.isoformat(), "opened": opened.get(d, 0), "cleared": closed.get(d, 0)})

    # load per doctor: open now, and cleared in the range
    names = {u.id: u.name for u in s.exec(select(User).where(User.role == "doctor"))}
    load = {uid: {"doctor": n, "open": 0, "cleared": 0} for uid, n in names.items()}
    for r in open_now:
        if r.assigned_doctor_id in load:
            load[r.assigned_doctor_id]["open"] += 1
    for r in cleared:
        if r.assigned_doctor_id in load:
            load[r.assigned_doctor_id]["cleared"] += 1
    reasons: dict[str, int] = {}
    for r in created:
        for c in r.codes or ["OTHER"]:
            reasons[c] = reasons.get(c, 0) + 1

    by_dept: dict[str, list[int]] = {}
    dept_of = {d.id: d.department for d in s.exec(select(D))}
    for t in due_rows:
        row = by_dept.setdefault(dept_of.get(t.document_id, "general medicine"), [0, 0, 0])
        row[0] += t.status == "Completed"
        row[1] += 1
        row[2] += t.status == "Pending"
    return {
        "days": days, "department": department, "today": today.isoformat(),
        "departments": sorted(set(dept_of.values())),
        "numbers": {
            "plans_created": plans, "needing_review": len(created),
            "median_clear_hours": round(statistics.median(hours), 1) if hours else None,
            "reviews_overdue": sum(r.created_at < late for r in open_now),
            "task_completion_rate": _pct(sum(t.status == "Completed" for t in due_rows), len(due_rows)),
            "overdue_tasks": overdue_now, "callbacks_completed": callbacks_done, "open_alerts": alerts_open,
        },
        "reviews_per_day": per_day,
        "load_per_doctor": sorted(load.values(), key=lambda x: -(x["open"] + x["cleared"])),
        "reasons": [{"reason": k, "count": v} for k, v in sorted(reasons.items(), key=lambda kv: -kv[1])],
        "completion_by_department": [{"department": k, "completed": v[0], "due": v[1], "overdue": v[2], "rate": _pct(v[0], v[1])}
                                     for k, v in sorted(by_dept.items())],
    }


# ---------- review queue ----------
@router.get("/queue")
def queue(response: Response, state: str = "open", doctor_id: Optional[int] = None, unassigned: bool = False,
          overdue: bool = False, q: Optional[str] = None, limit: int = 100, offset: int = 0, s: Session = Depends(get_session)):
    stmt = select(ReviewQueue)
    if state != "all":
        stmt = stmt.where(ReviewQueue.state == state)
    if doctor_id:
        stmt = stmt.where(ReviewQueue.assigned_doctor_id == doctor_id)
    if unassigned:
        stmt = stmt.where(ReviewQueue.assigned_doctor_id.is_(None))
    if overdue:
        stmt = stmt.where(ReviewQueue.state == "open", ReviewQueue.created_at < _late(s))
    if q:
        stmt = stmt.join(Document, Document.id == ReviewQueue.document_id).where(
            func.lower(Document.patient_alias).like(f"%{q.strip().lower()}%"))
    stmt = stmt.order_by(case((ReviewQueue.severity == "high", 0), (ReviewQueue.severity == "medium", 1), else_=2), ReviewQueue.id)
    return entries(s, page(s, stmt, response, limit, offset), full=False)


class AssignIn(BaseModel):
    doctor_id: int


def _doctor_or_404(s: Session, user_id: int) -> Doctor:
    d = s.exec(select(Doctor).where(Doctor.user_id == user_id)).first()
    if not d:
        raise HTTPException(404, "Doctor not found")
    return d


@router.post("/queue/{rid}/assign")
def assign(rid: int, body: AssignIn, s: Session = Depends(get_session)):
    r = s.get(ReviewQueue, rid)
    _doctor_or_404(s, body.doctor_id)
    if not r:
        raise HTTPException(404, "Not found")
    if r.state != "open":
        raise HTTPException(409, "Already resolved")
    old = r.assigned_doctor_id
    r.assigned_doctor_id = body.doctor_id
    _, r.fallback_doctor_id = routing.pick(s, "", {body.doctor_id})
    s.add(r)
    s.commit()
    routing.notify(s, body.doctor_id, r.document_id, "Management assigned a review item to you", "warning")
    audit(s, r.document_id, "management", "assigned", {"review_id": r.id, "doctor": body.doctor_id, "from": old})
    return {"id": r.id}


class BulkIn(BaseModel):
    from_doctor_id: int
    to_doctor_id: Optional[int] = None  # none = pick the best available doctor for each item


@router.post("/queue/bulk-reassign")
def bulk_reassign(body: BulkIn, s: Session = Depends(get_session)):
    """Moves every open item of one doctor, for example when they go unavailable."""
    if body.to_doctor_id:
        _doctor_or_404(s, body.to_doctor_id)
    moved = 0
    for r in s.exec(select(ReviewQueue).where(ReviewQueue.state == "open", ReviewQueue.assigned_doctor_id == body.from_doctor_id)).all():
        if body.to_doctor_id:
            r.assigned_doctor_id = body.to_doctor_id
            _, r.fallback_doctor_id = routing.pick(s, "", {body.to_doctor_id})
        else:
            item, doc = s.get(Item, r.item_id), s.get(Document, r.document_id)
            r.assigned_doctor_id, r.fallback_doctor_id = routing.pick(s, f"{item.title} {item.original_text}" if item else "",
                                                                    {body.from_doctor_id}, doc.department if doc else None)
        s.add(r)
        moved += 1
        if r.assigned_doctor_id:
            routing.notify(s, r.assigned_doctor_id, r.document_id, "Management moved a review item to you", "warning")
    s.commit()
    audit(s, None, "management", "bulk_reassigned", {"from": body.from_doctor_id, "to": body.to_doctor_id, "moved": moved})
    return {"moved": moved}


# ---------- doctors ----------
def doctor_rows(s: Session) -> list[dict]:
    late = _late(s)
    open_by = pairs(s, select(ReviewQueue.assigned_doctor_id, func.count()).where(ReviewQueue.state == "open")
                          .group_by(ReviewQueue.assigned_doctor_id))
    late_by = pairs(s, select(ReviewQueue.assigned_doctor_id, func.count()).where(ReviewQueue.state == "open", ReviewQueue.created_at < late)
                          .group_by(ReviewQueue.assigned_doctor_id))
    users = {u.id: u for u in s.exec(select(User).where(User.role == "doctor"))}
    out = []
    for d in s.exec(select(Doctor).order_by(Doctor.id)):
        u = users.get(d.user_id)
        if not u:
            continue
        b = users.get(d.backup_user_id)
        out.append({"id": u.id, "name": u.name, "email": u.email, "specialty": d.specialty, "available": d.available,
                    "active": u.active, "backup": {"id": b.id, "name": b.name} if b else None,
                    "open_items": open_by.get(u.id, 0), "overdue_items": late_by.get(u.id, 0)})
    return out


@router.get("/doctors")
def doctors(s: Session = Depends(get_session)):
    return doctor_rows(s)


@router.put("/doctors/{user_id}/availability")
def doctor_availability(user_id: int, body: AvailIn, s: Session = Depends(get_session)):
    return set_availability(s, user_id, body.available, "management")


class DoctorIn(BaseModel):
    name: str
    email: str
    password: str
    specialty: str = "general medicine"


@router.post("/doctors")
def add_doctor(body: DoctorIn, s: Session = Depends(get_session)):
    email = body.email.strip().lower()
    if len(body.password) < 8:
        raise HTTPException(422, "Password needs 8 or more characters")
    if not re.fullmatch(r"[^@\s]+@[^@\s]+\.[^@\s]+", email):
        raise HTTPException(422, "Enter a valid email address")
    if len(body.name.strip()) < 2:
        raise HTTPException(422, "Enter the doctor's name")
    if s.exec(select(User).where(User.email == email)).first():
        raise HTTPException(409, "This email already has an account")
    u = User(name=body.name.strip(), email=email, password_hash=hash_password(body.password), role="doctor")
    s.add(u)
    s.commit()
    s.refresh(u)
    s.add(Doctor(user_id=u.id, specialty=body.specialty.strip().lower(), phone="044-5550-0299"))
    s.commit()
    audit(s, None, "management", "doctor_added", {"doctor": u.id})
    return user_dict(u)


class DoctorPatch(BaseModel):
    specialty: Optional[str] = None
    backup_user_id: Optional[int] = None
    clear_backup: bool = False
    active: Optional[bool] = None


@router.patch("/doctors/{user_id}")
def edit_doctor(user_id: int, body: DoctorPatch, s: Session = Depends(get_session)):
    d, u = _doctor_or_404(s, user_id), s.get(User, user_id)
    changed = {}
    if body.specialty is not None and body.specialty.strip():
        d.specialty = changed["specialty"] = body.specialty.strip().lower()
    if body.clear_backup:
        d.backup_user_id = None
        changed["backup"] = None
    elif body.backup_user_id is not None:
        if body.backup_user_id == user_id:
            raise HTTPException(422, "A doctor cannot be their own backup")
        _doctor_or_404(s, body.backup_user_id)
        d.backup_user_id = changed["backup"] = body.backup_user_id
    s.add(d)
    moved = 0
    if body.active is not None and body.active != u.active:
        u.active = changed["active"] = body.active
        s.add(u)
    s.commit()
    if "active" in changed and not u.active:
        moved = routing.reassign_unavailable(s)
    audit(s, None, "management", "doctor_edited", {"doctor": user_id, **changed, "moved": moved})
    return next(r for r in doctor_rows(s) if r["id"] == user_id)


class PasswordIn(BaseModel):
    password: str


@router.post("/doctors/{user_id}/reset-password")
def reset_password(user_id: int, body: PasswordIn, s: Session = Depends(get_session)):
    _doctor_or_404(s, user_id)
    if len(body.password) < 8:
        raise HTTPException(422, "Password needs 8 or more characters")
    u = s.get(User, user_id)
    u.password_hash = hash_password(body.password)
    s.add(u)
    s.commit()
    audit(s, None, "management", "password_reset", {"doctor": user_id})
    return {"ok": True}


@router.get("/users")
def users(s: Session = Depends(get_session)):
    return [user_dict(u) for u in s.exec(select(User))]


@router.post("/demo-data")
def demo_data(s: Session = Depends(get_session)):
    loaded = load_demo_data(s)
    seed_demo_extras(s)
    return {"loaded": loaded}


# ---------- callbacks ----------
@router.get("/callbacks")
def callbacks(response: Response, state: Optional[str] = None, doctor_id: Optional[int] = None, q: Optional[str] = None,
              limit: int = 100, offset: int = 0, s: Session = Depends(get_session)):
    stmt = select(CallbackRequest)
    if state == "open":
        stmt = stmt.where(CallbackRequest.state.in_(OPEN_CALLS))
    elif state:
        stmt = stmt.where(CallbackRequest.state == state)
    if doctor_id:
        stmt = stmt.where(CallbackRequest.doctor_id == doctor_id)
    if q:
        stmt = stmt.join(Document, Document.id == CallbackRequest.document_id).where(
            func.lower(Document.patient_alias).like(f"%{q.strip().lower()}%"))
    rows = callback_rows(s, page(s, stmt.order_by(CallbackRequest.created_at.desc()), response, limit, offset))
    for r in rows:  # management runs the call line and never sees what the question was about
        r["item_title"], r["note"], r["call_notes"] = "", None, None
    return rows


def _move_callback(s: Session, cid: int, allowed: tuple[str, ...], to: str, message: str) -> dict:
    c = s.get(CallbackRequest, cid)
    if not c or c.state not in allowed:
        raise HTTPException(409, f"Callback must be {' or '.join(allowed)} first")
    c.state = to
    s.add(c)
    s.commit()
    audit(s, c.document_id, "management", f"callback_{to}", {"callback_id": c.id})
    doc = s.get(Document, c.document_id)
    routing.notify(s, doc.owner_id, doc.id, message)
    return {"id": c.id, "state": c.state}


@router.post("/callbacks/{cid}/start")
def callback_start(cid: int, s: Session = Depends(get_session)):
    return _move_callback(s, cid, ("requested", "scheduled"), "connecting", "Your callback is connecting through a masked line")


@router.post("/callbacks/{cid}/complete")
def callback_complete(cid: int, s: Session = Depends(get_session)):
    return _move_callback(s, cid, ("connecting",), "completed", "Callback completed")


@router.post("/callbacks/{cid}/no-answer")
def callback_no_answer(cid: int, s: Session = Depends(get_session)):
    return _move_callback(s, cid, ("connecting",), "no_answer", "We could not reach you. A doctor will try again")


@router.post("/callbacks/{cid}/assign")
def callback_assign(cid: int, body: AssignIn, s: Session = Depends(get_session)):
    c = s.get(CallbackRequest, cid)
    _doctor_or_404(s, body.doctor_id)
    if not c or c.state not in OPEN_CALLS:
        raise HTTPException(409, "Only open callbacks can be assigned")
    c.doctor_id = body.doctor_id
    s.add(c)
    s.commit()
    routing.notify(s, body.doctor_id, c.document_id, "Management assigned a callback to you", "warning")
    audit(s, c.document_id, "management", "callback_assigned", {"callback_id": c.id, "doctor": body.doctor_id})
    return {"id": c.id, "doctor_id": c.doctor_id}


# ---------- patients (no clinical text) ----------
@router.get("/patients")
def patients(response: Response, q: Optional[str] = None, limit: int = 50, offset: int = 0, s: Session = Depends(get_session)):
    stmt = select(User).where(User.role == "patient")
    if q:
        stmt = stmt.where(func.lower(User.name).like(f"%{q.strip().lower()}%"))
    users_ = page(s, stmt.order_by(User.id), response, limit, offset)
    ids = [u.id for u in users_] or [0]
    docs = s.exec(select(Document).where(Document.owner_id.in_(ids)).order_by(Document.id.desc())).all()
    by_owner: dict[int, list[Document]] = {}
    for d in docs:
        by_owner.setdefault(d.owner_id, []).append(d)
    doc_ids = [d.id for d in docs] or [0]
    now = sim_now(s)
    done = pairs(s, select(Task.document_id, func.count()).where(Task.document_id.in_(doc_ids), Task.status == "Completed",
                                                                    Task.due_at <= now).group_by(Task.document_id))
    due = pairs(s, select(Task.document_id, func.count()).where(Task.document_id.in_(doc_ids), Task.due_at <= now)
                      .group_by(Task.document_id))
    late = pairs(s, select(Task.document_id, func.count()).where(Task.document_id.in_(doc_ids), Task.status == "Pending",
                                                                    Task.due_at < now).group_by(Task.document_id))
    last = pairs(s, select(AuditLog.document_id, func.max(AuditLog.created_at)).where(AuditLog.document_id.in_(doc_ids))
                       .group_by(AuditLog.document_id))
    out = []
    for u in users_:
        mine = by_owner.get(u.id, [])
        d_all, t_all = sum(due.get(d.id, 0) for d in mine), sum(done.get(d.id, 0) for d in mine)
        stamps = [last[d.id] for d in mine if last.get(d.id)]
        out.append({"id": u.id, "alias": mine[0].patient_alias if mine else u.name.split()[0] + " (no plan yet)",
                    "city": mine[0].city if mine else None, "language": u.language, "plans": len(mine),
                    "completion_rate": _pct(t_all, d_all), "overdue_tasks": sum(late.get(d.id, 0) for d in mine),
                    "last_activity": max(stamps).isoformat() if stamps else None})
    return out


# ---------- settings ----------
EDITABLE = {"reviewer_threshold_hours": "number", "caregiver_threshold_hours": "number", "remind_threshold_hours": "number",
            "enabled_languages": "languages", "extract_model": "text", "rewrite_model": "text"}


@router.get("/settings")
def get_settings(s: Session = Depends(get_session)):
    return {k: get_setting(s, k) for k in EDITABLE}


@router.put("/settings")
def put_settings(body: dict[str, str], s: Session = Depends(get_session)):
    changed = {}
    for k, v in body.items():
        kind = EDITABLE.get(k)
        v = str(v).strip()
        if not kind:
            raise HTTPException(422, f"{k} cannot be changed here")
        if kind == "number":
            try:
                ok = 1 <= float(v) <= 720
            except ValueError:
                ok = False
            if not ok:
                raise HTTPException(422, f"{k} needs a number of hours between 1 and 720")
        if kind == "languages" and (not v or any(x not in LANGS for x in v.split(","))) or kind == "text" and len(v) < 3:
            raise HTTPException(422, f"{k} is not valid")
        changed[k] = v
    for k, v in changed.items():
        set_setting(s, k, v)
    audit(s, None, "management", "settings_changed", changed)
    return get_settings(s)


# ---------- audit ----------
def _audit_query(actor: Optional[str], action: Optional[str], date_from: Optional[date], date_to: Optional[date]):
    stmt = select(AuditLog)
    if actor:
        stmt = stmt.where(AuditLog.actor == actor)
    if action:
        stmt = stmt.where(AuditLog.action == action)
    if date_from:
        stmt = stmt.where(AuditLog.created_at >= datetime.combine(date_from, time.min))
    if date_to:
        stmt = stmt.where(AuditLog.created_at <= datetime.combine(date_to, time.max))
    return stmt.order_by(AuditLog.created_at.desc(), AuditLog.id.desc())


def _names(s: Session, rows: list[AuditLog]) -> dict[str, str]:
    ids = {int(r.actor[5:]) for r in rows if r.actor.startswith("user:") and r.actor[5:].isdigit()}
    users_ = {u.id: u for u in s.exec(select(User).where(User.id.in_(ids or {0})))}
    return {f"user:{i}": f"{u.name} ({u.role})" for i, u in users_.items()}


@router.get("/audit")
def audit_all(response: Response, actor: Optional[str] = None, action: Optional[str] = None, date_from: Optional[date] = None,
              date_to: Optional[date] = None, limit: int = 100, offset: int = 0, s: Session = Depends(get_session)):
    rows = page(s, _audit_query(actor, action, date_from, date_to), response, limit, offset)
    names = _names(s, rows)
    return [{"id": r.id, "document_id": r.document_id, "actor": names.get(r.actor, r.actor), "actor_key": r.actor,
             "action": r.action, "detail": r.detail, "created_at": r.created_at.isoformat()} for r in rows]


@router.get("/audit/filters")
def audit_filters(s: Session = Depends(get_session)):
    actors = list(s.exec(select(AuditLog.actor).distinct().order_by(AuditLog.actor)))
    names = _names(s, [AuditLog(actor=a, action="") for a in actors])
    return {"actors": [{"key": a, "label": names.get(a, a)} for a in actors],
            "actions": list(s.exec(select(AuditLog.action).distinct().order_by(AuditLog.action)))}


def _safe(v) -> str:
    """A cell that starts with = + - or @ would run as a formula in a spreadsheet. Prefix it."""
    t = str(v)
    return "'" + t if t[:1] in ("=", "+", "-", "@") else t


@router.get("/audit.csv")
def audit_csv(actor: Optional[str] = None, action: Optional[str] = None, date_from: Optional[date] = None,
              date_to: Optional[date] = None, s: Session = Depends(get_session)):
    rows = s.exec(_audit_query(actor, action, date_from, date_to).limit(20000)).all()
    names = _names(s, rows)
    out = io.StringIO()
    w = csv.writer(out)
    w.writerow(["id", "time", "actor", "action", "plan", "detail"])
    for r in rows:
        w.writerow([_safe(x) for x in (r.id, r.created_at.isoformat(sep=" ", timespec="seconds"), names.get(r.actor, r.actor), r.action,
                                       r.document_id or "", "; ".join(f"{k}={v}" for k, v in (r.detail or {}).items()))])
    audit(s, None, "management", "audit_exported", {"rows": len(rows)})
    return RawResponse(out.getvalue(), media_type="text/csv",
                       headers={"Content-Disposition": 'attachment; filename="carebridge-audit.csv"'})
