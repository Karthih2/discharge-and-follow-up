"""Route tests with role based access, using MOCK_LLM fixtures."""
import json
from pathlib import Path

import pytest

PW = "demo1234"


STAFF = {"meera", "arjun", "sana", "vikram", "kavya", "imran", "admin"}


def login(client, who):
    path = "/api/staff/login" if who in STAFF else "/api/auth/login"
    r = client.post(path, json={"email": f"{who}@code2care.test", "password": PW})
    assert r.status_code == 200, r.text
    return {"Authorization": "Bearer " + r.json()["token"]}


def make_doc(client, who="ramesh", key="a"):
    h = login(client, who)
    r = client.post("/api/documents", json={"sample_key": key}, headers=h)
    assert r.status_code == 200, r.text
    doc_id = r.json()["document"]["id"]
    token = h["Authorization"].split()[1]
    with client.stream("GET", f"/api/documents/{doc_id}/run?token={token}") as resp:
        events = [json.loads(l[6:]) for l in resp.iter_lines() if l.startswith("data: ")]
    assert events[-1]["step"] == "complete"
    return doc_id, h, events


@pytest.fixture(autouse=True)
def reset_state(client):
    """Doctors available and clock at the start date before each test."""
    h = login(client, "admin")
    for d in client.get("/api/admin/doctors", headers=h).json():
        client.put(f"/api/admin/doctors/{d['id']}/availability", json={"available": True}, headers=h)
    client.post("/api/demo/clock", json={"date": "2026-10-12"}, headers=h)


# ---------- auth ----------
def test_health_login_and_roles(client):
    assert client.get("/api/health").json()["mock_llm"] is True
    assert client.post("/api/auth/login", json={"email": "ramesh@code2care.test", "password": "wrong"}).status_code == 401
    assert client.get("/api/documents").status_code == 401
    h = login(client, "ramesh")
    me = client.get("/api/auth/me", headers=h).json()
    assert me["role"] == "patient"
    assert client.patch("/api/auth/me", json={"language": "te"}, headers=h).json()["language"] == "te"
    assert client.patch("/api/auth/me", json={"language": "fr"}, headers=h).status_code == 422
    client.patch("/api/auth/me", json={"language": "ta"}, headers=h)
    # wrong role
    assert client.get("/api/admin/overview", headers=h).status_code == 403
    assert client.get("/api/review", headers=h).status_code == 403
    assert {a["role"] for a in client.get("/api/auth/demo-accounts").json()["accounts"]} == {"patient", "manager", "family"}
    assert {a["role"] for a in client.get("/api/staff/demo-accounts").json()["accounts"]} == {"doctor", "management"}


def test_portals_are_separate(client):
    # staff cannot sign in on the patient portal, patients cannot sign in on a staff portal, same message as a wrong password
    bad_pub = client.post("/api/auth/login", json={"email": "meera@code2care.test", "password": PW})
    bad_staff = client.post("/api/staff/login", json={"email": "ramesh@code2care.test", "password": PW})
    wrong = client.post("/api/auth/login", json={"email": "ramesh@code2care.test", "password": "nope"})
    assert bad_pub.status_code == bad_staff.status_code == wrong.status_code == 401
    assert bad_pub.json() == bad_staff.json() == wrong.json()
    # patients cannot call doctor or management APIs even with a valid token
    h = login(client, "ramesh")
    assert client.get("/api/review", headers=h).status_code == 403
    assert client.get("/api/admin/overview", headers=h).status_code == 403
    assert client.get("/api/admin/audit", headers=h).status_code == 403
    # doctors cannot call management APIs, management cannot resolve reviews
    assert client.get("/api/admin/overview", headers=login(client, "meera")).status_code == 403
    assert client.post("/api/review/1/resolve", json={"action": "approve"}, headers=login(client, "admin")).status_code == 403
    # no way to self register as staff
    assert client.post("/api/auth/register", json={"name": "Dr X", "email": "x@x.test", "password": "secret12", "role": "doctor"}).status_code == 422


def test_register(client):
    r = client.post("/api/auth/register", json={"name": "New Patient", "email": "new@x.test", "password": "secret12"})
    assert r.status_code == 200 and r.json()["user"]["role"] == "patient"
    assert client.post("/api/auth/register", json={"name": "New Patient", "email": "new@x.test", "password": "secret12"}).status_code == 409
    assert client.post("/api/auth/register", json={"name": "Doc Tor", "email": "d@x.test", "password": "secret12", "role": "doctor"}).status_code == 422
    m = client.post("/api/auth/register", json={"name": "Mana Ger", "email": "m@x.test", "password": "secret12", "role": "manager"}).json()
    hdr = {"Authorization": "Bearer " + m["token"]}
    assert client.get("/api/hub", headers=hdr).json()["hub"]["name"] == "Mana family"


# ---------- patient flow ----------
def test_samples_create_and_masking(client):
    h = login(client, "ramesh")
    assert [x["key"] for x in client.get("/api/samples", headers=h).json()] == list("abcdefgh")
    r = client.post("/api/documents", json={"text": "Patient: Test (synthetic)\nCall 98765 43210 or a@b.com\nTab X 5 mg"}, headers=h)
    assert {m["kind"] for m in r.json()["masked"]} == {"mobile", "email"}
    assert client.post("/api/documents", json={}, headers=h).status_code == 422
    assert client.post("/api/documents", json={"sample_key": "zzz"}, headers=h).status_code == 404
    # only patients can upload
    assert client.post("/api/documents", json={"sample_key": "a"}, headers=login(client, "priya")).status_code == 403


def test_pdf_upload(client):
    h = login(client, "sunita")
    pdf = Path(__file__).resolve().parent.parent / "data" / "samples" / "b_knee_replacement.pdf"
    r = client.post("/api/documents/pdf", files={"file": ("b.pdf", pdf.read_bytes(), "application/pdf")}, headers=h)
    assert r.status_code == 200
    assert client.post("/api/documents/pdf", files={"file": ("x.pdf", b"not a pdf", "application/pdf")}, headers=h).status_code == 422


def test_sse_run_and_isolation(client):
    doc_id, h, events = make_doc(client)
    steps = [e["step"] for e in events]
    assert steps[0] == "start" and {"privacy", "ingest", "extract", "verify", "triage", "plan", "simplify", "match", "escalate"} <= set(steps)
    other = login(client, "sunita")
    assert client.get(f"/api/documents/{doc_id}/plan", headers=other).status_code == 404  # another patient
    assert client.get(f"/api/documents/{doc_id}/run?token=garbage").status_code == 401
    assert any(d["id"] == doc_id for d in client.get("/api/documents", headers=h).json())
    lines = client.get(f"/api/documents/{doc_id}/source", headers=h).json()
    assert lines[0]["line_no"] == 1 and len(lines) > 20
    audit = client.get(f"/api/documents/{doc_id}/audit", headers=h).json()
    assert {"extractor", "verifier", "safety_triage", "planner", "routing"} <= {a["actor"] for a in audit}


def test_plan_languages_template_and_safe_message(client):
    doc_id, h, _ = make_doc(client, "lakshmi", "d")
    en = client.get(f"/api/documents/{doc_id}/plan?lang=en", headers=h).json()
    ta = client.get(f"/api/documents/{doc_id}/plan?lang=ta", headers=h).json()
    assert client.get(f"/api/documents/{doc_id}/plan?lang=fr", headers=h).status_code == 422
    flagged = [i for i in en["items"] if i["status"] == "Needs Review"]
    assert len(flagged) >= 10
    assert all(i["simple_text"] is None and i["safe_message"] for i in flagged)
    ok = next(i for i in ta["items"] if i["title"] == "Pantoprazole 40 mg")
    assert "மாத்திரை" in ok["simple_text"] and ok["shown_language"] == "ta"
    ml = client.get(f"/api/documents/{doc_id}/plan?lang=ml", headers=h).json()
    pan = next(i for i in ml["items"] if i["title"] == "Pantoprazole 40 mg")
    assert "ഗുളിക" in pan["simple_text"] and "40" in pan["simple_text"]  # fixed template, six languages
    assert {i["status"] for i in en["items"]} <= {"Pending", "Completed", "Needs Review"}


def test_task_status_and_ics(client):
    doc_id, h, _ = make_doc(client)
    plan = client.get(f"/api/documents/{doc_id}/plan", headers=h).json()
    tid = plan["tasks"][0]["id"]
    assert client.patch(f"/api/tasks/{tid}", json={"status": "Completed"}, headers=h).json()["status"] == "Completed"
    assert client.patch(f"/api/tasks/{tid}", json={"status": "Bogus"}, headers=h).status_code == 422
    assert client.patch("/api/tasks/99999", json={"status": "Completed"}, headers=h).status_code == 404
    ics = client.get(f"/api/documents/{doc_id}/ics", headers=h)
    assert ics.headers["content-type"].startswith("text/calendar") and "BEGIN:VEVENT" in ics.text


def test_providers_and_matches(client):
    doc_id, h, _ = make_doc(client, "sunita", "b")
    all_p = client.get("/api/providers", headers=h).json()
    assert len(all_p) == 150 and all(p["synthetic"] for p in all_p)
    assert all(p["city"] == "Delhi" for p in client.get("/api/providers?city=Delhi", headers=h).json())
    assert all(p["type"] == "lab" for p in client.get("/api/providers?type=lab", headers=h).json())
    plan = client.get(f"/api/documents/{doc_id}/plan", headers=h).json()
    physio = next(i for i in plan["items"] if i["title"] == "Physiotherapy")
    assert 1 <= len(physio["matches"]) <= 3 and physio["matches"][0]["provider"]["type"] == "physio"


def test_voice_blocked_until_reviewed(client, monkeypatch):
    monkeypatch.setattr("app.routes.documents.speak_text", lambda text, lang: b"mp3")
    doc_id, h, _ = make_doc(client)
    plan = client.get(f"/api/documents/{doc_id}/plan", headers=h).json()
    ok = next(i for i in plan["items"] if i["status"] == "Pending")
    held = next(i for i in plan["items"] if i["status"] == "Needs Review")
    assert client.get(f"/api/items/{held['id']}/audio", headers=h).status_code == 409
    assert client.get(f"/api/items/{ok['id']}/audio", headers=h).status_code == 200


# ---------- doctor review ----------
def test_doctor_review_flow_and_visibility(client):
    doc_id, ph, _ = make_doc(client, "lakshmi", "d")
    meera, arjun = login(client, "meera"), login(client, "arjun")
    assert client.get("/api/review", headers=ph).status_code == 403
    q1 = client.get("/api/review", headers=meera).json()
    q2 = client.get("/api/review", headers=arjun).json()
    assert q1 or q2
    mine = next(x for x in (q1 + q2) if x["item"]["title"] == "Amlodipine 5 mg" and x["document_id"] == doc_id)
    doctor_h = meera if mine in q1 else arjun
    assert mine["item"]["original_text"] and mine["assigned_doctor"]
    stamps = [x["created_at"] for x in q1]
    assert stamps == sorted(stamps)  # oldest first
    assert mine["codes"] and mine["reason_plain"]
    # a doctor who is neither assigned nor backup cannot resolve it
    outsider = next(w for w in ("sana", "vikram", "meera", "arjun")
                    if mine["assigned_doctor"]["id"] != login_id(client, w) and (mine["fallback_doctor"] or {}).get("id") != login_id(client, w))
    assert client.post(f"/api/review/{mine['id']}/resolve", json={"action": "approve"}, headers=login(client, outsider)).status_code == 404
    assert client.post(f"/api/review/{mine['id']}/resolve", json={"action": "approve", "note": "ok"}, headers=doctor_h).json()["state"] == "approved"
    plan = client.get(f"/api/documents/{doc_id}/plan", headers=ph).json()
    a = next(i for i in plan["items"] if i["title"] == "Amlodipine 5 mg")
    assert a["status"] == "Pending" and a["reviewed"] and a["simple_text"]
    assert client.post(f"/api/review/{mine['id']}/resolve", json={"action": "approve"}, headers=doctor_h).status_code == 409
    audit = client.get(f"/api/documents/{doc_id}/audit", headers=ph).json()
    assert any(x["action"] == "review_approved" for x in audit)


def login_id(client, who):
    return client.get("/api/auth/me", headers=login(client, who)).json()["id"]


def test_edit_and_reject(client):
    doc_id, ph, _ = make_doc(client, "lakshmi", "d")
    entries = []
    for who in ("meera", "arjun", "sana", "vikram"):
        entries += [(who, e) for e in client.get("/api/review", headers=login(client, who)).json()]
    who, e = next((w, e) for w, e in entries if e["item"]["title"] == "Cough syrup 10 ml" and e["document_id"] == doc_id)
    h = login(client, who)
    assert client.post(f"/api/review/{e['id']}/resolve", json={"action": "edit"}, headers=h).status_code == 422
    r = client.post(f"/api/review/{e['id']}/resolve", json={"action": "edit", "edited_text": "Cough syrup 10 ml when coughing."}, headers=h)
    assert r.json()["state"] == "edited"
    who2, e2 = next((w, e) for w, e in entries if e["item"]["title"] == "Dietician" and e["document_id"] == doc_id)
    client.post(f"/api/review/{e2['id']}/resolve", json={"action": "reject"}, headers=login(client, who2))
    plan = client.get(f"/api/documents/{doc_id}/plan", headers=ph).json()
    assert all(i["title"] != "Dietician" for i in plan["items"])
    cs = next(i for i in plan["items"] if i["title"] == "Cough syrup 10 ml")
    assert cs["simple_text"] == "Cough syrup 10 ml when coughing."


def test_fallback_when_doctor_unavailable(client):
    doc_id, ph, _ = make_doc(client, "ramesh", "a")
    adm = login(client, "admin")
    q = client.get("/api/admin/queue", headers=adm).json()
    mine = [x for x in q if x["document_id"] == doc_id]
    assert mine and all("original_text" not in x["item"] for x in mine)  # management never sees clinical text
    primary = mine[0]["assigned_doctor"]["id"]
    fb = mine[0]["fallback_doctor"]["id"]
    r = client.put(f"/api/admin/doctors/{primary}/availability", json={"available": False}, headers=adm)
    assert r.json()["moved"] >= 1
    q2 = [x for x in client.get("/api/admin/queue", headers=adm).json() if x["id"] == mine[0]["id"]][0]
    assert q2["assigned_doctor"]["id"] != primary
    assert q2["assigned_doctor"]["id"] == fb
    # management can assign explicitly
    target = next(d["id"] for d in client.get("/api/admin/doctors", headers=adm).json() if d["available"] and d["id"] != fb)
    assert client.post(f"/api/admin/queue/{mine[0]['id']}/assign", json={"doctor_id": target}, headers=adm).status_code == 200
    ov = client.get("/api/admin/overview", headers=adm).json()
    assert ov["reviews_open"] >= 1 and ov["plans"] >= 1
    assert client.get("/api/admin/audit", headers=adm).json()
    assert client.get("/api/admin/users", headers=adm).json()


def test_callback_flow(client):
    doc_id, ph, _ = make_doc(client, "ramesh", "a")
    plan = client.get(f"/api/documents/{doc_id}/plan", headers=ph).json()
    item = plan["items"][0]
    r = client.post(f"/api/items/{item['id']}/callback", json={}, headers=ph)
    assert r.status_code == 200 and "XXX" in r.json()["masked_number"]
    adm = login(client, "admin")
    cb = next(c for c in client.get("/api/admin/callbacks", headers=adm).json() if c["id"] == r.json()["id"])
    assert cb["state"] == "requested"
    assert client.post(f"/api/admin/callbacks/{cb['id']}/complete", headers=adm).status_code == 409  # must connect first
    assert client.post(f"/api/admin/callbacks/{cb['id']}/start", headers=adm).json()["state"] == "connecting"
    shown = next(i for i in client.get(f"/api/documents/{doc_id}/plan", headers=ph).json()["items"] if i["id"] == item["id"])
    assert shown["callback_state"] == "connecting"
    assert client.post(f"/api/admin/callbacks/{cb['id']}/complete", headers=adm).json()["state"] == "completed"
    notes = [n["message"] for n in client.get("/api/notifications", headers=ph).json()]
    assert "Callback completed" in notes
    # doctors see requests assigned to them but cannot run the call
    assert client.post(f"/api/admin/callbacks/{cb['id']}/start", headers=login(client, "meera")).status_code == 403


def test_flag_and_provider_select(client):
    doc_id, ph, _ = make_doc(client, "sunita", "b")
    plan = client.get(f"/api/documents/{doc_id}/plan", headers=ph).json()
    ok = next(i for i in plan["items"] if i["status"] == "Pending" and i["category"] == "diet")
    assert client.post(f"/api/items/{ok['id']}/flag", json={"note": "this looks wrong"}, headers=ph).status_code == 200
    again = next(i for i in client.get(f"/api/documents/{doc_id}/plan", headers=ph).json()["items"] if i["id"] == ok["id"])
    assert again["status"] == "Needs Review" and again["locked"] and again["simple_text"] is None
    assert "PATIENT_FLAG" in again["codes"] and again["reason_plain"]
    assert client.post(f"/api/items/{ok['id']}/flag", json={}, headers=ph).status_code == 409
    physio = next(i for i in plan["items"] if i["title"] == "Physiotherapy")
    pid = physio["matches"][1]["provider"]["id"]
    assert client.post(f"/api/items/{physio['id']}/provider", json={"provider_id": pid}, headers=ph).status_code == 200
    assert client.post(f"/api/items/{physio['id']}/provider", json={"provider_id": 99999}, headers=ph).status_code == 404
    sel = next(i for i in client.get(f"/api/documents/{doc_id}/plan", headers=ph).json()["items"] if i["id"] == physio["id"])
    assert [m["provider"]["id"] for m in sel["matches"] if m["selected"]] == [pid]


def test_family_locked_card_hides_details(client):
    doc_id, ph, _ = make_doc(client, "ramesh", "a")
    held = next(i for i in client.get(f"/api/documents/{doc_id}/plan", headers=ph).json()["items"] if i["status"] == "Needs Review")
    assert held["title"] != "Waiting for doctor review" and held["reason_plain"] and held["original_text"]
    fam = client.get(f"/api/documents/{doc_id}/plan", headers=login(client, "priya")).json()
    locked = next(i for i in fam["items"] if i["id"] == held["id"])
    assert locked["title"] == "Waiting for doctor review"
    assert locked["original_text"] == "" and locked["reason_plain"] is None and locked["codes"] == [] and locked["simple_text"] is None


def test_doctor_fills_missing_medicine_fields(client):
    doc_id, ph, _ = make_doc(client, "lakshmi", "d")
    entries = []
    for who in ("meera", "arjun", "sana", "vikram"):
        entries += [(who, e) for e in client.get("/api/review", headers=login(client, who)).json()]
    who, e = next((w, e) for w, e in entries if e["item"]["title"] == "Amlodipine 5 mg" and e["document_id"] == doc_id)
    h = login(client, who)
    bad = {"action": "edit", "fields": {"dose": "5 mg", "frequency": 1, "timing": ["morning"], "instructions": "as needed"}}
    assert client.post(f"/api/review/{e['id']}/resolve", json=bad, headers=h).status_code == 422  # gate re-checks
    missing = {"action": "edit", "fields": {"dose": "5 mg", "frequency": 1, "timing": []}}
    assert client.post(f"/api/review/{e['id']}/resolve", json=missing, headers=h).status_code == 422
    good = {"action": "edit", "fields": {"dose": "5 mg", "frequency": 1, "timing": ["morning"], "duration_days": 30, "instructions": "after food"}}
    assert client.post(f"/api/review/{e['id']}/resolve", json=good, headers=h).json()["state"] == "edited"
    plan = client.get(f"/api/documents/{doc_id}/plan?lang=ta", headers=ph).json()
    a = next(i for i in plan["items"] if i["id"] == e["item_id"])
    assert a["status"] == "Pending" and a["reviewed"] and not a["locked"]
    assert a["med"]["dose"] == "5 mg" and a["med"]["duration_days"] == 30 and a["med"]["timing"] == ["morning"]
    assert "மாத்திரை" in a["simple_text"] and "30" in a["simple_text"]
    assert any(t["title"].startswith("Morning medicines") and "Amlodipine" in t["title"] for t in plan["tasks"])


# ---------- family hub ----------
def test_hub_consent_scopes_and_alerts(client):
    doc_id, ph, _ = make_doc(client, "ramesh", "a")
    priya, arun = login(client, "priya"), login(client, "arun")
    # Priya has full consent, Arun appointments only
    full = client.get(f"/api/documents/{doc_id}/plan", headers=priya).json()
    part = client.get(f"/api/documents/{doc_id}/plan", headers=arun).json()
    assert any(i["category"] == "medication" for i in full["items"])
    assert part["items"] and all(i["category"] in ("appointment", "test", "referral", "rehab", "wound_care") for i in part["items"])
    assert client.get(f"/api/documents/{doc_id}/source", headers=arun).status_code == 403
    # family cannot edit tasks, manager can
    tid = full["tasks"][0]["id"]
    assert client.patch(f"/api/tasks/{tid}", json={"status": "Completed"}, headers=arun).status_code == 403
    assert client.patch(f"/api/tasks/{tid}", json={"status": "Completed"}, headers=priya).status_code == 200
    # no consent means no access (Lakshmi shares nothing with Arun)
    d2, _, _ = make_doc(client, "lakshmi", "d")
    assert client.get(f"/api/documents/{d2}/plan", headers=arun).status_code == 404
    # hub view for the patient shows the consent list
    hub = client.get("/api/hub", headers=ph).json()
    assert {m["scope"] for m in hub["members"] if m["role"] in ("manager", "family")} == {"full", "appointments"}
    fam = client.get("/api/family/patients", headers=priya).json()
    assert {p["patient"]["name"] for p in fam} >= {"Ramesh Iyer", "Lakshmi Narayanan"}
    # patient revokes Priya, access ends at once
    priya_id = login_id(client, "priya")
    assert client.put("/api/consent", json={"member_id": priya_id, "scope": "none"}, headers=ph).status_code == 200
    assert client.get(f"/api/documents/{doc_id}/plan", headers=priya).status_code == 404
    client.put("/api/consent", json={"member_id": priya_id, "scope": "full"}, headers=ph)
    # move the clock: manager gets alerts and notifications
    adm = login(client, "admin")
    moved = client.post("/api/demo/clock", json={"days": 3}, headers=adm).json()
    assert moved["escalation"]["alerts"] > 0
    plan = client.get(f"/api/documents/{doc_id}/plan", headers=priya).json()
    assert plan["alerts"]
    assert any("Not done yet" in n["message"] for n in client.get("/api/notifications", headers=priya).json())
    assert client.post(f"/api/alerts/{plan['alerts'][0]['id']}/ack", headers=priya).status_code == 200
    assert client.post(f"/api/alerts/{plan['alerts'][0]['id']}/ack", headers=arun).status_code == 403
    audit = client.get(f"/api/documents/{doc_id}/audit", headers=ph).json()
    assert any(a["action"] == "viewed_plan" for a in audit)
    assert client.post("/api/notifications/read", headers=priya).json()["ok"]


def test_add_member_and_demo_data(client):
    priya = login(client, "priya")
    r = client.post("/api/hub/members", json={"name": "Meena Iyer", "email": "meena@code2care.test", "role": "family"}, headers=priya)
    assert r.status_code == 200
    assert client.post("/api/hub/members", json={"name": "Meena Iyer", "email": "meena@code2care.test", "role": "family"}, headers=priya).status_code == 409
    assert client.post("/api/hub/members", json={"name": "x", "email": "x@x.test", "role": "doctor"}, headers=priya).status_code == 422
    assert client.post("/api/hub/members", json={"name": "x", "email": "x@x.test", "role": "family"}, headers=login(client, "ramesh")).status_code == 403
    adm = login(client, "admin")
    assert client.post("/api/admin/demo-data", headers=adm).status_code == 200
    assert client.post("/api/admin/doctors", json={"name": "Dr. Test", "email": "dt@code2care.test", "password": "longpass1"}, headers=adm).status_code == 200


def test_demo_endpoints_are_off_by_default_and_work_when_on(client, monkeypatch):
    monkeypatch.delenv("DEMO", raising=False)
    assert client.get("/api/meta").json()["demo"] is False
    assert client.get("/api/demo/personas").status_code == 404
    assert client.post("/api/demo/login", json={"key": "ramesh"}).status_code == 404
    monkeypatch.setenv("DEMO", "1")
    assert client.get("/api/meta").json()["demo"] is True
    people = client.get("/api/demo/personas").json()
    assert {p["role"] for p in people} == {"patient", "manager", "family", "doctor", "management"}
    out = client.post("/api/demo/login", json={"key": "meera"}).json()
    assert out["user"]["role"] == "doctor" and out["path"].startswith("/doctor")
    assert client.post("/api/demo/login", json={"key": "nobody"}).status_code == 404
    # reset wipes and reloads the demo data
    assert client.post("/api/demo/reset").json()["ok"] is True
    adm = login(client, "admin")
    assert client.get("/api/admin/overview", headers=adm).json()["plans"] == 20
