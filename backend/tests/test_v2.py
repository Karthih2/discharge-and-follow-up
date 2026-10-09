"""Tests for the demo history, the home screens, the doctor and management tools, and role separation on all of them."""
import time

import pytest

from test_api import PW, login  # noqa: F401


@pytest.fixture(scope="module")
def demo(client):
    """Fresh demo data (including the month of history) for this file."""
    mp = pytest.MonkeyPatch()
    mp.setenv("DEMO", "1")
    assert client.post("/api/demo/reset").json()["ok"] is True
    mp.undo()
    h = login(client, "admin")
    client.post("/api/demo/clock", json={"date": "2026-10-12"}, headers=h)
    return client


def snapshot():
    from sqlmodel import select

    from app.db import new_session
    from app.models import CallbackRequest, Document, ReviewQueue, Task, User

    with new_session() as s:
        return (
            sorted(u.email for u in s.exec(select(User))),
            sorted((d.patient_alias, d.discharge_date, d.department) for d in s.exec(select(Document))),
            sorted((r.item_id, r.state, r.assigned_doctor_id, r.severity) for r in s.exec(select(ReviewQueue))),
            sorted((t.title, t.due_at, t.status) for t in s.exec(select(Task))),
            sorted((c.state, c.document_id) for c in s.exec(select(CallbackRequest))),
        )


# ---------- seed ----------
def test_seed_is_deterministic_and_fast(demo):
    from sqlmodel import SQLModel

    from app.db import engine, init_db, new_session
    from app.seed import load_demo_data, seed_users
    from app.seed_demo import seed_demo_extras

    def rebuild():
        SQLModel.metadata.drop_all(engine)
        init_db()
        with new_session() as s:
            seed_users(s)
            load_demo_data(s)
            t = time.perf_counter()
            seed_demo_extras(s)
            return time.perf_counter() - t

    took = rebuild()
    first = snapshot()
    rebuild()
    assert snapshot() == first
    assert took < 3.0, f"seeding took {took:.1f}s"
    # running it again changes nothing
    with new_session() as s:
        assert seed_demo_extras(s) == {}


def test_demo_data_is_rich(demo):
    from collections import Counter

    from sqlmodel import select

    from app.db import new_session
    from app.models import (AuditLog, CallbackRequest, CaregiverAlert, Consent, Doctor, Document, ReviewQueue, User)

    with new_session() as s:
        patients = s.exec(select(User).where(User.role == "patient")).all()
        assert len(patients) == 14
        owners = {d.owner_id for d in s.exec(select(Document))}
        assert all(p.id in owners for p in patients)  # every patient has a plan
        assert {p.language for p in patients} >= {"en", "ta", "hi", "te", "kn", "ml"}
        assert len(s.exec(select(Doctor)).all()) == 6
        away = [d for d in s.exec(select(Doctor)) if not d.available]
        assert len(away) == 1 and away[0].backup_user_id
        states = Counter(r.state for r in s.exec(select(ReviewQueue)))
        assert set(states) == {"open", "approved", "edited", "rejected"}
        assert {r.assigned_doctor_id for r in s.exec(select(ReviewQueue))} >= {u.id for u in s.exec(select(User).where(User.role == "doctor")) if u.email.startswith(("meera", "kavya", "imran"))}
        assert {c.state for c in s.exec(select(CallbackRequest))} == {"requested", "scheduled", "connecting", "completed", "no_answer"}
        assert {c.scope for c in s.exec(select(Consent))} == {"full", "appointments", "reminders", "none"}
        alerts = s.exec(select(CaregiverAlert)).all()
        assert any(a.acknowledged_at for a in alerts) and any(not a.acknowledged_at for a in alerts)
        stamps = [a.created_at for a in s.exec(select(AuditLog))]
        assert (max(stamps) - min(stamps)).days >= 28
    # existing accounts are untouched
    for who in ("ramesh", "priya", "arun", "lakshmi"):
        login(demo, who)


# ---------- patient and family ----------
def test_welcome_flag(demo):
    h = login(demo, "karthik")
    assert demo.get("/api/auth/me", headers=h).json()["welcomed"] is False
    assert demo.post("/api/auth/welcomed", headers=h).json()["welcomed"] is True
    assert demo.get("/api/auth/me", headers=h).json()["welcomed"] is True


def test_today_view(demo):
    h = login(demo, "ramesh")
    d = demo.get("/api/today", headers=h).json()
    assert d["plan"] and set(d["medicines"]) == {"morning", "afternoon", "night"}
    assert d["medicines"]["morning"] and d["next_event"]["title"] and d["next_event"]["place"]
    assert d["progress"]["total"] > 0 and d["needs_review_count"] >= 0
    tid = d["medicines"]["morning"][0]["task_id"]
    assert demo.patch(f"/api/tasks/{tid}", json={"status": "Completed"}, headers=h).status_code == 200
    again = demo.get("/api/today", headers=h).json()
    assert again["medicines"]["morning"][0]["status"] == "Completed"
    soon = demo.get("/api/today", headers=login(demo, "shreya")).json()
    assert soon["upcoming"] and all(e["due_at"][:10] <= "2026-10-19" for e in soon["upcoming"])
    # a patient with plans only sees their own
    other = demo.get("/api/today", headers=login(demo, "deepak")).json()
    assert other["plan"]["id"] != d["plan"]["id"]


def test_family_home_respects_consent(demo):
    sanjay = demo.get("/api/family/home", headers=login(demo, "sanjay")).json()
    by = {p["patient"]["name"]: p for p in sanjay}
    assert by["Deepak Hegde"]["scope"] == "full" and "overdue" in by["Deepak Hegde"]
    assert by["Shreya Gowda"]["scope"] == "appointments"
    assert "overdue" not in by["Shreya Gowda"] and by["Shreya Gowda"]["locked"]["alerts"] is True
    arun = demo.get("/api/family/home", headers=login(demo, "arun")).json()
    assert {p["patient"]["name"]: p["scope"] for p in arun} == {"Ramesh Iyer": "appointments", "Lakshmi Narayanan": "none"}
    pooja = demo.get("/api/family/home", headers=login(demo, "pooja")).json()
    assert {p["patient"]["name"]: p["scope"] for p in pooja} == {"Deepak Hegde": "reminders", "Shreya Gowda": "none"}  # Shreya shared nothing: listed, locked


def test_family_alerts_newest_first_and_ack(demo):
    h = login(demo, "sanjay")
    rows = demo.get("/api/family/alerts", headers=h).json()
    assert rows and [r["created_at"] for r in rows] == sorted((r["created_at"] for r in rows), reverse=True)
    assert all(r["can_ack"] for r in rows)
    open_ = next((r for r in rows if not r["acknowledged_at"]), None)
    if open_:
        assert demo.post(f"/api/alerts/{open_['id']}/ack", headers=h).status_code == 200
    # viewers can read but not acknowledge
    viewer = demo.get("/api/family/alerts", headers=login(demo, "kiran")).json()
    assert viewer == []  # Kiran has appointments or nothing: no reminder scope
    pooja = demo.get("/api/family/alerts", headers=login(demo, "pooja")).json()
    assert all(not r["can_ack"] for r in pooja)


# ---------- doctor ----------
def test_doctor_home_and_queue_paging(demo):
    h = login(demo, "meera")
    home = demo.get("/api/doctor/home", headers=h).json()
    assert {"open_reviews", "overdue_reviews", "callbacks_waiting", "patients_overdue", "available", "backup"} <= set(home)
    assert home["backup"]["name"].startswith("Dr.")
    r = demo.get("/api/review?state=all&limit=3&offset=0", headers=h)
    assert len(r.json()) == 3 and int(r.headers["X-Total-Count"]) > 3
    nxt = demo.get("/api/review?state=all&limit=3&offset=3", headers=h).json()
    assert {x["id"] for x in nxt}.isdisjoint({x["id"] for x in r.json()})
    open_ = demo.get("/api/review", headers=h).json()
    ages = [x["created_at"] for x in open_]
    assert ages == sorted(ages)  # oldest first
    assert all(x["department"] and x["patient_alias"] for x in open_)
    # filter by reason code and by search word
    code = open_[0]["codes"][0]
    assert all(code in x["codes"] for x in demo.get(f"/api/review?code={code}", headers=h).json())
    alias = open_[0]["patient_alias"].split()[1].strip(".")
    hits = demo.get(f"/api/review?q={alias}", headers=h).json()
    assert hits and all(alias.lower() in (x["patient_alias"] + x["item"]["title"]).lower() for x in hits)


def test_doctor_patients_and_plan_readonly(demo):
    h = login(demo, "kavya")
    rows = demo.get("/api/doctor/patients", headers=h).json()
    assert rows and all(r["department"] for r in rows)
    doc_id = rows[0]["document_id"]
    plan = demo.get(f"/api/documents/{doc_id}/plan", headers=h).json()
    assert plan["items"]
    assert demo.post(f"/api/items/{plan['items'][0]['id']}/flag", json={}, headers=h).status_code == 403  # read only
    hist = demo.get(f"/api/review?state=all&document_id={doc_id}", headers=h).json()
    assert hist
    assert demo.get("/api/doctor/patients?q=zzzz", headers=h).json() == []


def test_doctor_callback_actions(demo):
    h = login(demo, "meera")
    rows = demo.get("/api/doctor/callbacks?state=requested", headers=h).json()
    mine = demo.get("/api/doctor/callbacks", headers=h).json()
    assert mine
    cb = next((c for c in mine if c["state"] in ("requested", "scheduled", "connecting")), None)
    if cb is None:  # none open for Meera: use any doctor who has one
        for who in ("arjun", "sana", "kavya", "imran"):
            h = login(demo, who)
            cb = next((c for c in demo.get("/api/doctor/callbacks", headers=h).json() if c["state"] in ("requested", "scheduled", "connecting")), None)
            if cb:
                break
    assert cb, rows
    assert demo.post(f"/api/doctor/callbacks/{cb['id']}", json={"action": "notes", "call_notes": "Left a voicemail"}, headers=h).json()["call_notes"] == "Left a voicemail"
    assert demo.post(f"/api/doctor/callbacks/{cb['id']}", json={"action": "reschedule"}, headers=h).status_code == 422
    out = demo.post(f"/api/doctor/callbacks/{cb['id']}", json={"action": "reschedule", "scheduled_for": "2026-10-14T11:00:00"}, headers=h).json()
    assert out["state"] == "scheduled" and out["scheduled_for"].startswith("2026-10-14")
    assert demo.post(f"/api/doctor/callbacks/{cb['id']}", json={"action": "no_answer"}, headers=h).json()["state"] == "no_answer"
    assert demo.post(f"/api/doctor/callbacks/{cb['id']}", json={"action": "complete"}, headers=h).status_code == 409  # closed
    assert demo.post(f"/api/doctor/callbacks/{cb['id']}", json={"action": "bogus"}, headers=h).status_code == 422
    # another doctor cannot touch it
    other = login(demo, "imran" if cb["doctor"]["name"] != "Dr. Imran Qureshi" else "sana")
    assert demo.post(f"/api/doctor/callbacks/{cb['id']}", json={"action": "notes", "call_notes": "x"}, headers=other).status_code == 404


# ---------- management ----------
def test_admin_stats_follow_range_and_department(demo):
    h = login(demo, "admin")
    s30 = demo.get("/api/admin/stats?days=30", headers=h).json()
    s7 = demo.get("/api/admin/stats?days=7", headers=h).json()
    assert len(s30["reviews_per_day"]) == 30 and len(s7["reviews_per_day"]) == 7
    n = s30["numbers"]
    assert set(n) == {"plans_created", "needing_review", "median_clear_hours", "reviews_overdue", "task_completion_rate",
                      "overdue_tasks", "callbacks_completed", "open_alerts"}
    assert n["needing_review"] >= s7["numbers"]["needing_review"] and n["plans_created"] >= s7["numbers"]["plans_created"]
    assert n["needing_review"] == sum(d["opened"] for d in s30["reviews_per_day"])
    assert s30["load_per_doctor"] and s30["reasons"] and s30["completion_by_department"]
    dept = s30["departments"][0]
    sd = demo.get(f"/api/admin/stats?days=30&department={dept}", headers=h).json()
    assert sd["numbers"]["needing_review"] <= n["needing_review"] and sd["department"] == dept
    # numbers come from the database: changing it changes them
    before = n["open_alerts"]
    ha, open_ = None, None
    for who in ("latha", "sanjay"):
        ha = login(demo, who)
        open_ = next((a for a in demo.get("/api/family/alerts", headers=ha).json() if not a["acknowledged_at"] and a["can_ack"]), None)
        if open_:
            break
    assert open_, "the demo data should leave an open alert for a hub manager"
    demo.post(f"/api/alerts/{open_['id']}/ack", headers=ha)
    assert demo.get("/api/admin/stats?days=30", headers=h).json()["numbers"]["open_alerts"] == before - 1
    # the clock moves the numbers too
    demo.post("/api/demo/clock", json={"days": 3}, headers=h)
    moved = demo.get("/api/admin/stats?days=30", headers=h).json()
    assert moved["today"] == "2026-10-15" and moved["numbers"]["overdue_tasks"] >= n["overdue_tasks"]
    demo.post("/api/demo/clock", json={"date": "2026-10-12"}, headers=h)


def test_admin_queue_filters_assign_and_bulk(demo):
    h = login(demo, "admin")
    docs = {d["name"]: d["id"] for d in demo.get("/api/admin/doctors", headers=h).json()}
    r = demo.get("/api/admin/queue?limit=5", headers=h)
    assert len(r.json()) == 5 and int(r.headers["X-Total-Count"]) > 5
    assert all("original_text" not in x["item"] for x in r.json())  # no clinical text
    over = demo.get("/api/admin/queue?overdue=true", headers=h).json()
    assert over and all(x["age_hours"] > 48 for x in over)
    mine = demo.get(f"/api/admin/queue?doctor_id={docs['Dr. Meera Nair']}", headers=h).json()
    assert all(x["assigned_doctor"]["id"] == docs["Dr. Meera Nair"] for x in mine)
    rid = mine[0]["id"] if mine else demo.get("/api/admin/queue", headers=h).json()[0]["id"]
    assert demo.post(f"/api/admin/queue/{rid}/assign", json={"doctor_id": docs["Dr. Sana Khan"]}, headers=h).status_code == 200
    assert demo.post(f"/api/admin/queue/{rid}/assign", json={"doctor_id": 99999}, headers=h).status_code == 404
    # bulk: move everything from Arjun to Sana
    before = [x for x in demo.get("/api/admin/queue?limit=500", headers=h).json() if x["assigned_doctor"] and x["assigned_doctor"]["id"] == docs["Dr. Arjun Rao"]]
    out = demo.post("/api/admin/queue/bulk-reassign", json={"from_doctor_id": docs["Dr. Arjun Rao"], "to_doctor_id": docs["Dr. Sana Khan"]}, headers=h).json()
    assert out["moved"] == len(before) > 0
    assert not [x for x in demo.get("/api/admin/queue?limit=500", headers=h).json() if x["assigned_doctor"] and x["assigned_doctor"]["id"] == docs["Dr. Arjun Rao"]]
    # audited
    for act in ("assigned", "bulk_reassigned"):
        assert demo.get(f"/api/admin/audit?action={act}&limit=1", headers=h).json(), act


def test_admin_doctor_management(demo):
    h = login(demo, "admin")
    r = demo.post("/api/admin/doctors", json={"name": "Dr. Test Person", "email": "test.doc@code2care.test", "password": "starter123", "specialty": "Neurology"}, headers=h)
    assert r.status_code == 200
    uid = r.json()["id"]
    assert demo.post("/api/admin/doctors", json={"name": "Dr. Test Person", "email": "test.doc@code2care.test", "password": "starter123"}, headers=h).status_code == 409
    assert demo.post("/api/admin/doctors", json={"name": "Dr. X", "email": "not-an-email", "password": "starter123"}, headers=h).status_code == 422
    assert demo.post("/api/staff/login", json={"email": "test.doc@code2care.test", "password": "starter123"}).status_code == 200
    meera = next(d for d in demo.get("/api/admin/doctors", headers=h).json() if d["name"] == "Dr. Meera Nair")
    row = demo.patch(f"/api/admin/doctors/{uid}", json={"specialty": "Cardiology", "backup_user_id": meera["id"]}, headers=h).json()
    assert row["specialty"] == "cardiology" and row["backup"]["id"] == meera["id"]
    assert demo.patch(f"/api/admin/doctors/{uid}", json={"backup_user_id": uid}, headers=h).status_code == 422
    assert demo.post(f"/api/admin/doctors/{uid}/reset-password", json={"password": "short"}, headers=h).status_code == 422
    assert demo.post(f"/api/admin/doctors/{uid}/reset-password", json={"password": "newpass123"}, headers=h).status_code == 200
    assert demo.post("/api/staff/login", json={"email": "test.doc@code2care.test", "password": "starter123"}).status_code == 401
    token = demo.post("/api/staff/login", json={"email": "test.doc@code2care.test", "password": "newpass123"}).json()["token"]
    # deactivate: the old token and a new sign in both stop working
    assert demo.patch(f"/api/admin/doctors/{uid}", json={"active": False}, headers=h).json()["active"] is False
    assert demo.get("/api/doctor/me", headers={"Authorization": "Bearer " + token}).status_code == 401
    assert demo.post("/api/staff/login", json={"email": "test.doc@code2care.test", "password": "newpass123"}).status_code == 401
    assert demo.patch(f"/api/admin/doctors/{uid}", json={"active": True}, headers=h).json()["active"] is True
    assert demo.post("/api/staff/login", json={"email": "test.doc@code2care.test", "password": "newpass123"}).status_code == 200


def test_admin_callbacks_patients_settings_audit(demo):
    h = login(demo, "admin")
    open_ = demo.get("/api/admin/callbacks?state=open", headers=h).json()
    assert open_ and all(c["state"] in ("requested", "scheduled", "connecting") for c in open_)
    doc = next(d for d in demo.get("/api/admin/doctors", headers=h).json() if d["name"] == "Dr. Imran Qureshi")
    req = next(c for c in open_ if c["state"] == "requested")
    assert demo.post(f"/api/admin/callbacks/{req['id']}/assign", json={"doctor_id": doc["id"]}, headers=h).status_code == 200
    assert demo.post(f"/api/admin/callbacks/{req['id']}/complete", headers=h).status_code == 409  # must start first
    assert demo.post(f"/api/admin/callbacks/{req['id']}/start", headers=h).json()["state"] == "connecting"
    assert demo.post(f"/api/admin/callbacks/{req['id']}/no-answer", headers=h).json()["state"] == "no_answer"
    by_doc = demo.get(f"/api/admin/callbacks?doctor_id={doc['id']}", headers=h).json()
    assert all(c["doctor"]["id"] == doc["id"] for c in by_doc)
    # patients: no clinical text
    pr = demo.get("/api/admin/patients?limit=5", headers=h)
    assert len(pr.json()) == 5 and int(pr.headers["X-Total-Count"]) == 14
    row = pr.json()[0]
    assert set(row) == {"id", "alias", "city", "language", "plans", "completion_rate", "overdue_tasks", "last_activity"}
    assert demo.get("/api/admin/patients?q=deepak", headers=h).json()[0]["plans"] >= 1
    # settings
    st = demo.get("/api/admin/settings", headers=h).json()
    assert st["reviewer_threshold_hours"] == "48"
    assert demo.put("/api/admin/settings", json={"reviewer_threshold_hours": "-3"}, headers=h).status_code == 422
    assert demo.put("/api/admin/settings", json={"enabled_languages": "en,xx"}, headers=h).status_code == 422
    assert demo.put("/api/admin/settings", json={"simulated_today": "2030-01-01"}, headers=h).status_code == 422
    assert demo.put("/api/admin/settings", json={"reviewer_threshold_hours": "72"}, headers=h).json()["reviewer_threshold_hours"] == "72"
    assert demo.get("/api/admin/stats", headers=h).json()["numbers"]["reviews_overdue"] <= demo.get("/api/admin/queue?overdue=true", headers=h).json().__len__() + 100
    demo.put("/api/admin/settings", json={"reviewer_threshold_hours": "48"}, headers=h)
    # audit filters and export
    f = demo.get("/api/admin/audit/filters", headers=h).json()
    assert "login" in f["actions"] and f["actors"]
    logins = demo.get("/api/admin/audit?action=login&limit=10", headers=h)
    assert logins.json() and all(a["action"] == "login" for a in logins.json()) and int(logins.headers["X-Total-Count"]) > 10
    a0 = logins.json()[0]["actor_key"]
    assert all(a["actor_key"] == a0 for a in demo.get(f"/api/admin/audit?actor={a0}", headers=h).json())
    recent = demo.get("/api/admin/audit?date_from=2026-10-10&date_to=2026-10-12&limit=500", headers=h).json()
    assert recent and all("2026-10-10" <= a["created_at"][:10] <= "2026-10-12" for a in recent)
    csv_ = demo.get("/api/admin/audit.csv?action=login", headers=h)
    assert csv_.headers["content-type"].startswith("text/csv") and csv_.text.splitlines()[0] == "id,time,actor,action,plan,detail"
    assert len(csv_.text.splitlines()) > 5


def test_csv_neutralises_formulas(demo):
    from app.routes.admin import _safe

    assert _safe("=1+1") == "'=1+1" and _safe("@x") == "'@x" and _safe("plain") == "plain"


# ---------- role separation on every new route ----------
ROUTES = [  # method, path, body, the one role family allowed
    ("GET", "/api/today", None, {"patient"}),
    ("GET", "/api/family/home", None, {"manager", "family"}),
    ("GET", "/api/family/alerts", None, {"manager", "family"}),
    ("GET", "/api/doctor/home", None, {"doctor"}),
    ("GET", "/api/doctor/patients", None, {"doctor"}),
    ("GET", "/api/doctor/callbacks", None, {"doctor"}),
    ("POST", "/api/doctor/callbacks/1", {"action": "notes"}, {"doctor"}),
    ("GET", "/api/admin/stats", None, {"management"}),
    ("GET", "/api/admin/queue", None, {"management"}),
    ("POST", "/api/admin/queue/bulk-reassign", {"from_doctor_id": 1}, {"management"}),
    ("GET", "/api/admin/doctors", None, {"management"}),
    ("PATCH", "/api/admin/doctors/1", {"active": True}, {"management"}),
    ("POST", "/api/admin/doctors/1/reset-password", {"password": "longenough1"}, {"management"}),
    ("GET", "/api/admin/callbacks", None, {"management"}),
    ("POST", "/api/admin/callbacks/1/assign", {"doctor_id": 1}, {"management"}),
    ("POST", "/api/admin/callbacks/1/no-answer", None, {"management"}),
    ("GET", "/api/admin/patients", None, {"management"}),
    ("GET", "/api/admin/settings", None, {"management"}),
    ("PUT", "/api/admin/settings", {}, {"management"}),
    ("GET", "/api/admin/audit", None, {"management"}),
    ("GET", "/api/admin/audit.csv", None, {"management"}),
]
WHO = {"patient": "ramesh", "manager": "priya", "family": "arun", "doctor": "meera", "management": "admin"}


def test_role_separation_on_new_routes(demo):
    tokens = {role: login(demo, who) for role, who in WHO.items()}
    for method, path, body, allowed in ROUTES:
        anon = demo.request(method, path, json=body)
        assert anon.status_code == 401, (path, anon.status_code)
        for role, h in tokens.items():
            r = demo.request(method, path, json=body, headers=h)
            if role in allowed:
                assert r.status_code != 403, (role, path)
            else:
                assert r.status_code == 403, (role, path, r.status_code)


def test_calendar_hides_status_for_appointments_scope(demo):
    rows = demo.get("/api/calendar?month=now", headers=login(demo, "arun")).json()["tasks"]
    assert rows and all(r["status"] is None and r["overdue"] is False and not r["can_tick"] and r["kind"] != "medicine" for r in rows)
    mine = demo.get("/api/calendar?month=now", headers=login(demo, "ramesh")).json()["tasks"]
    assert any(r["status"] for r in mine)


def test_hub_search_and_add_existing_person(demo):
    h = login(demo, "priya")
    assert demo.get("/api/hub/search?q=su", headers=h).json() == []  # needs three letters
    hits = demo.get("/api/hub/search?q=sunita", headers=h).json()
    assert [x["email"] for x in hits] == ["s***@code2care.test"] and hits[0]["role"] == "patient"  # masked, never the full address
    assert not any(x["email"] in ("priya@code2care.test", "ramesh@code2care.test") for x in demo.get("/api/hub/search?q=code2care", headers=h).json())  # already in the hub
    assert demo.get("/api/hub/search?q=meera", headers=h).json() == []  # staff are never offered
    before = len(demo.get("/api/family/home", headers=h).json())
    assert demo.post("/api/hub/members", json={"user_id": hits[0]["id"]}, headers=h).status_code == 200
    assert demo.post("/api/hub/members", json={"user_id": hits[0]["id"]}, headers=h).status_code == 409
    rows = demo.get("/api/family/home", headers=h).json()
    assert len(rows) == before + 1  # the dashboard count goes up at once
    assert next(r for r in rows if r["patient"]["name"] == "Sunita Verma")["scope"] == "none"
    assert demo.get("/api/hub/search?q=sunita", headers=h).json() == []
    assert demo.post("/api/hub/members", json={"user_id": 999999}, headers=h).status_code == 404
    assert demo.get("/api/hub/search?q=sunita", headers=login(demo, "ramesh")).status_code == 403


def test_hub_search_treats_wildcards_as_letters(demo):
    h = login(demo, "priya")
    assert demo.get("/api/hub/search?q=%25%25%25", headers=h).json() == []
    assert demo.get("/api/hub/search?q=___", headers=h).json() == []


def test_spoken_day_is_built_by_the_server(demo):
    h = login(demo, "ramesh")
    for m in demo.get("/api/today", headers=h).json()["medicines"]["morning"]:  # an earlier test may have ticked it
        demo.patch(f"/api/tasks/{m['task_id']}", json={"status": "Pending"}, headers=h)
    for lang in ("en", "ta", "hi"):
        assert len(demo.get(f"/api/today/script?lang={lang}", headers=h).json()["lines"]) >= 3
    morning = demo.get("/api/today/script?lang=ta&slot=morning", headers=h).json()["lines"]
    assert morning[0].startswith("காலை 8 மணிக்கு") and any("Aspirin" in x for x in morning[1:])  # the time first, then each medicine in Tamil
    assert demo.get("/api/today/script?slot=bogus", headers=h).status_code == 422
    assert demo.post("/api/today/speak", json={"lang": "fr"}, headers=h).status_code == 422
    assert demo.post("/api/today/speak", json={"lang": "ta"}).status_code == 401
    assert demo.post("/api/today/speak", json={"lang": "ta"}, headers=login(demo, "meera")).status_code == 403
    assert demo.get("/api/today/script", headers=login(demo, "priya")).status_code == 403


def test_one_sign_in_for_every_role(demo):
    for who, role in (("ramesh", "patient"), ("priya", "manager"), ("arun", "family"), ("meera", "doctor"), ("admin", "management")):
        r = demo.post("/api/auth/signin", json={"email": f"{who}@code2care.test", "password": PW})
        assert r.status_code == 200 and r.json()["user"]["role"] == role
    assert demo.post("/api/auth/signin", json={"email": "meera@code2care.test", "password": "wrong"}).status_code == 401
    # the role still decides what the token can open
    doc = demo.post("/api/auth/signin", json={"email": "meera@code2care.test", "password": PW}).json()["token"]
    assert demo.get("/api/admin/stats", headers={"Authorization": "Bearer " + doc}).status_code == 403
