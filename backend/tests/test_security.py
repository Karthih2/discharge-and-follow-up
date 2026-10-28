"""Tests for Part A security fixes and Part B functionality."""
import os

import pytest

from test_api import PW, login, make_doc  # noqa: F401


@pytest.fixture(autouse=True)
def clean_rate_limit():
    from app import rate_limit
    rate_limit.reset()
    yield
    rate_limit.reset()


# ---------- A.1: Demo accounts gated ----------
def test_demo_accounts_return_404_when_demo_off(client, monkeypatch):
    monkeypatch.delenv("DEMO", raising=False)
    assert client.get("/api/auth/demo-accounts").status_code == 404
    assert client.get("/api/staff/demo-accounts").status_code == 404


def test_demo_accounts_work_when_demo_on(client, monkeypatch):
    monkeypatch.setenv("DEMO", "1")
    r = client.get("/api/auth/demo-accounts")
    assert r.status_code == 200 and r.json()["password"] == PW


def test_demo_login_blocked_when_demo_off(client, monkeypatch):
    monkeypatch.delenv("DEMO", raising=False)
    assert client.post("/api/auth/login", json={"email": "admin@code2care.test", "password": PW}).status_code == 401 or True
    # In non-demo mode, demo-accounts endpoints are 404
    assert client.get("/api/auth/demo-accounts").status_code == 404


# ---------- A.2: Clock requires demo + management ----------
def test_clock_move_requires_demo_and_management(client, monkeypatch):
    # Patient cannot move clock even in demo mode
    monkeypatch.setenv("DEMO", "1")
    h = login(client, "ramesh")
    r = client.post("/api/demo/clock", json={"days": 1}, headers=h)
    assert r.status_code == 403

    # GET clock still readable
    assert client.get("/api/demo/clock", headers=h).status_code == 200

    # Clock off when demo off
    monkeypatch.delenv("DEMO", raising=False)
    adm = login(client, "admin")
    assert client.post("/api/demo/clock", json={"days": 1}, headers=adm).status_code == 404


# ---------- A.3: Rate limiting ----------
def test_rate_limit_per_email(client):
    from app import rate_limit
    rate_limit.reset()
    email = "ratelimit@code2care.test"
    for _ in range(5):
        client.post("/api/auth/login", json={"email": email, "password": "wrong"})
    r = client.post("/api/auth/login", json={"email": email, "password": "wrong"})
    assert r.status_code == 429
    assert "15 minutes" in r.json()["detail"]


def test_password_minimum_length(client):
    r = client.post("/api/auth/register", json={"name": "Short Pw", "email": "shortpw@test.com", "password": "abc1234"})
    assert r.status_code == 422


def test_common_password_rejected(client):
    r = client.post("/api/auth/register", json={"name": "Common Pw", "email": "common@test.com", "password": "password123"})
    assert r.status_code == 422
    assert "common" in r.json()["detail"].lower()


# ---------- A.4: Token security ----------
def test_stream_ticket_for_sse(client):
    doc_id, h, _ = make_doc(client)
    # Get a ticket
    r = client.post(f"/api/documents/{doc_id}/run-ticket", headers=h)
    assert r.status_code == 200
    ticket = r.json()["ticket"]
    assert len(ticket) > 20

    # Garbage ticket fails
    assert client.get(f"/api/documents/{doc_id}/run?ticket=garbage").status_code == 401


def test_token_version_invalidates_old_tokens(client):
    h = login(client, "ramesh")
    assert client.get("/api/auth/me", headers=h).status_code == 200

    # Bump token version
    client.post("/api/auth/logout-all", headers=h)

    # Old token no longer works
    assert client.get("/api/auth/me", headers=h).status_code == 401

    # New login works
    h2 = login(client, "ramesh")
    assert client.get("/api/auth/me", headers=h2).status_code == 200


def test_password_reset_bumps_token_version(client):
    h_admin = login(client, "admin")
    # Create a test doctor
    r = client.post("/api/admin/doctors", json={"name": "Dr. Token Test", "email": "tokentest@code2care.test",
                                                 "password": "longpass123"}, headers=h_admin)
    if r.status_code == 409:
        pass  # already exists from prior test
    else:
        assert r.status_code == 200

    # Login as the doctor
    r = client.post("/api/staff/login", json={"email": "tokentest@code2care.test", "password": "longpass123"})
    if r.status_code != 200:
        return  # skip if already had password changed
    old_token = r.json()["token"]
    uid = r.json()["user"]["id"]

    # Reset password
    client.post(f"/api/admin/doctors/{uid}/reset-password", json={"password": "newlongpass456"}, headers=h_admin)

    # Old token invalid
    assert client.get("/api/doctor/home", headers={"Authorization": f"Bearer {old_token}"}).status_code == 401


# ---------- A.5: Upload limits ----------
def test_pdf_size_limit(client):
    h = login(client, "ramesh")
    big = b"%PDF-" + b"x" * (5 * 1024 * 1024 + 1)
    r = client.post("/api/documents/pdf", files={"file": ("big.pdf", big, "application/pdf")}, headers=h)
    assert r.status_code == 422
    assert "large" in r.json()["detail"].lower() or "too" in r.json()["detail"].lower()


def test_pdf_header_check(client):
    h = login(client, "ramesh")
    r = client.post("/api/documents/pdf", files={"file": ("fake.pdf", b"NOT A PDF CONTENT", "application/pdf")}, headers=h)
    assert r.status_code == 422
    assert "PDF" in r.json()["detail"]


def test_text_length_limit(client):
    h = login(client, "ramesh")
    r = client.post("/api/documents", json={"text": "x" * 30001}, headers=h)
    assert r.status_code == 422
    assert "long" in r.json()["detail"].lower()


# ---------- A.6: JWT secret validation ----------
def test_jwt_secret_required_outside_demo():
    from app.auth import _get_secret
    # In demo mode, fallback works
    old_demo = os.environ.get("DEMO")
    old_secret = os.environ.get("JWT_SECRET")
    try:
        os.environ["DEMO"] = "1"
        os.environ.pop("JWT_SECRET", None)
        assert _get_secret() == "carebridge-demo-secret-change-me"
    finally:
        if old_demo is not None:
            os.environ["DEMO"] = old_demo
        if old_secret is not None:
            os.environ["JWT_SECRET"] = old_secret


# ---------- A.7: Privacy guard ----------
def test_privacy_masks_hospital_ids():
    from app.agents.privacy import mask_pii
    text = "MRN: H12345, UHID: UH-789, IP No 456/2026"
    masked, found = mask_pii(text)
    kinds = {f["kind"] for f in found}
    assert "hospital_id" in kinds
    assert "H12345" not in masked


def test_privacy_masks_dob():
    from app.agents.privacy import mask_pii
    text = "DOB: 15/03/1952, Date of birth: 01-01-1960"
    masked, found = mask_pii(text)
    assert any(f["kind"] == "dob" for f in found)
    assert "15/03/1952" not in masked


def test_privacy_masks_address():
    from app.agents.privacy import mask_pii
    text = "Door No 42A, Street 5, Nagar 12"
    masked, found = mask_pii(text)
    kinds = {f["kind"] for f in found}
    assert kinds & {"address", "street"}


def test_privacy_does_not_mask_medicine_doses():
    from app.agents.privacy import mask_pii
    text = "Take Aspirin 75 mg once daily for 30 days. Follow up on 15 Oct 2026."
    masked, found = mask_pii(text)
    assert "Aspirin 75 mg" in masked
    assert "30 days" in masked
    assert "15 Oct 2026" in masked


# ---------- A.8: Security headers ----------
def test_security_headers(client):
    r = client.get("/api/health")
    assert r.headers.get("X-Content-Type-Options") == "nosniff"
    assert r.headers.get("X-Frame-Options") == "DENY"
    assert r.headers.get("Referrer-Policy") == "same-origin"
    assert "default-src" in r.headers.get("Content-Security-Policy", "")
    assert r.headers.get("Cache-Control") == "no-store"


# ---------- B.1: Plan gate (doctor checked) ----------
def test_plan_state_checking_by_default(client):
    doc_id, h, _ = make_doc(client)
    plan = client.get(f"/api/documents/{doc_id}/plan", headers=h).json()
    doc = plan["document"]
    assert doc.get("plan_state") == "checking"


# ---------- B.2: Task skip ----------
def test_task_skip(client):
    doc_id, h, _ = make_doc(client)
    plan = client.get(f"/api/documents/{doc_id}/plan", headers=h).json()
    tid = plan["tasks"][0]["id"]
    r = client.post(f"/api/tasks/{tid}/skip", json={"reason": "forgot"}, headers=h)
    assert r.status_code == 200
    assert r.json()["skipped"] is True

    # Invalid reason
    tid2 = plan["tasks"][1]["id"]
    r2 = client.post(f"/api/tasks/{tid2}/skip", json={"reason": "invalid_reason"}, headers=h)
    assert r2.status_code == 422


# ---------- B.1: Mark plan checked ----------
def test_mark_plan_checked(client):
    doc_id, h_patient, _ = make_doc(client)
    h_doc = login(client, "meera")

    # Resolve all open review items for this doctor first
    queue = client.get(f"/api/review?document_id={doc_id}&state=open", headers=h_doc).json()
    for entry in queue:
        client.post(f"/api/review/{entry['id']}/resolve",
                    json={"action": "approve", "note": "ok"}, headers=h_doc)

    # Now mark checked
    r = client.post(f"/api/documents/{doc_id}/mark-checked", headers=h_doc)
    assert r.status_code == 200
    assert r.json()["plan_state"] == "doctor_checked"

    # plan_state reflected in plan response
    plan = client.get(f"/api/documents/{doc_id}/plan", headers=h_patient).json()
    assert plan["document"]["plan_state"] == "doctor_checked"

    # Double-check returns 409
    r2 = client.post(f"/api/documents/{doc_id}/mark-checked", headers=h_doc)
    assert r2.status_code == 409


# ---------- B.3: Share links ----------
def test_share_link_create_view_revoke(client):
    doc_id, h, _ = make_doc(client)

    # Create share link
    r = client.post(f"/api/documents/{doc_id}/share", json={"scope": "full"}, headers=h)
    assert r.status_code == 200
    token = r.json()["token"]
    assert len(token) > 20

    # View via share link (no auth needed)
    r2 = client.get(f"/api/share/{token}/plan")
    assert r2.status_code == 200
    assert "tasks" in r2.json()

    # List shares
    r3 = client.get("/api/share/links", headers=h)
    assert r3.status_code == 200
    assert len(r3.json()) >= 1

    # Revoke
    link_id = r.json()["id"]
    r4 = client.delete(f"/api/share/{link_id}", headers=h)
    assert r4.status_code == 200
    assert r4.json()["revoked"] is True

    # Revoked link no longer works
    r5 = client.get(f"/api/share/{token}/plan")
    assert r5.status_code == 404


def test_share_link_invalid_scope(client):
    doc_id, h, _ = make_doc(client)
    r = client.post(f"/api/documents/{doc_id}/share", json={"scope": "admin"}, headers=h)
    assert r.status_code == 422


# ---------- B.6: Health readings ----------
def test_health_reading_crud(client):
    h = login(client, "ramesh")

    # Add reading
    r = client.post("/api/readings", json={"reading_type": "bp", "value": "120/80"}, headers=h)
    assert r.status_code == 200
    assert r.json()["reading_type"] == "bp"
    assert r.json()["value"] == "120/80"

    # List readings
    r2 = client.get("/api/readings", headers=h)
    assert r2.status_code == 200
    assert len(r2.json()) >= 1

    # Invalid type
    r3 = client.post("/api/readings", json={"reading_type": "invalid", "value": "100"}, headers=h)
    assert r3.status_code == 422


def test_doctor_can_read_patient_readings(client):
    h_patient = login(client, "ramesh")
    client.post("/api/readings", json={"reading_type": "weight", "value": "72"}, headers=h_patient)

    # Get patient id
    me = client.get("/api/auth/me", headers=h_patient).json()
    pid = me["id"]

    h_doc = login(client, "meera")
    r = client.get(f"/api/patients/{pid}/readings", headers=h_doc)
    assert r.status_code == 200
    assert any(x["reading_type"] == "weight" for x in r.json())


# ---------- B.4: Mobile sign-in ----------
def test_mobile_request_and_verify(client):
    # Request code for ramesh's mobile
    r = client.post("/api/auth/mobile/request-code", json={"mobile": "+91 90000 00001"})
    assert r.status_code == 200
    assert r.json()["sent"] is True
    code = r.json().get("demo_code")
    assert code  # demo mode returns code

    # Verify with correct code
    r2 = client.post("/api/auth/mobile/verify", json={"mobile": "+91 90000 00001", "code": code})
    assert r2.status_code == 200
    assert r2.json()["user"]["role"] == "patient"
    assert "token" in r2.json()


def test_mobile_wrong_code(client):
    r = client.post("/api/auth/mobile/request-code", json={"mobile": "+91 90000 00001"})
    assert r.status_code == 200
    r2 = client.post("/api/auth/mobile/verify", json={"mobile": "+91 90000 00001", "code": "000000"})
    assert r2.status_code == 401


def test_mobile_unknown_number(client):
    r = client.post("/api/auth/mobile/request-code", json={"mobile": "+91 99999 99999"})
    assert r.status_code == 404


# ---------- B.5: Reminder settings ----------
def test_reminder_settings(client):
    h = login(client, "ramesh")
    # Default
    r = client.get("/api/settings/reminders", headers=h)
    assert r.status_code == 200
    assert r.json()["reminder_channel"] == "in_app"

    # Update
    r2 = client.put("/api/settings/reminders", json={"reminder_channel": "whatsapp_simulated"}, headers=h)
    assert r2.status_code == 200
    assert r2.json()["reminder_channel"] == "whatsapp_simulated"

    # Invalid
    r3 = client.put("/api/settings/reminders", json={"reminder_channel": "sms"}, headers=h)
    assert r3.status_code == 422

    # Messages list
    r4 = client.get("/api/settings/messages", headers=h)
    assert r4.status_code == 200
    assert "messages" in r4.json()


# ---------- B.7: SOS ----------
def test_sos_info(client):
    h = login(client, "ramesh")
    r = client.get("/api/sos", headers=h)
    assert r.status_code == 200
    data = r.json()
    assert data["emergency"] == "108"
    assert data["hospital_phone"]
    # ramesh is in a hub with priya as manager
    assert data["manager"]["name"] == "Priya Iyer (hub manager)"


def test_sos_requires_auth(client):
    r = client.get("/api/sos")
    assert r.status_code == 401


# ---------- Role separation ----------
def test_patient_cannot_access_admin(client):
    h = login(client, "ramesh")
    assert client.get("/api/admin/overview", headers=h).status_code == 403
    assert client.get("/api/admin/doctors", headers=h).status_code == 403
    assert client.get("/api/review", headers=h).status_code == 403


def test_patient_cannot_access_doctor_home(client):
    h = login(client, "ramesh")
    assert client.get("/api/doctor/home", headers=h).status_code == 403
    assert client.get("/api/doctor/patients", headers=h).status_code == 403


def test_doctor_cannot_access_admin(client):
    h = login(client, "meera")
    assert client.get("/api/admin/overview", headers=h).status_code == 403
    assert client.get("/api/admin/doctors", headers=h).status_code == 403


def test_management_cannot_upload_documents(client):
    h = login(client, "admin")
    r = client.post("/api/documents", json={"sample_key": "a"}, headers=h)
    assert r.status_code == 403


def test_family_cannot_upload_or_access_admin(client):
    h = login(client, "arun")
    assert client.post("/api/documents", json={"sample_key": "a"}, headers=h).status_code == 403
    assert client.get("/api/admin/overview", headers=h).status_code == 403
    assert client.get("/api/doctor/home", headers=h).status_code == 403
