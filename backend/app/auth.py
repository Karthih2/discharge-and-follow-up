"""JWT login with role based access. Passwords use PBKDF2 from the standard library."""
import hashlib
import hmac
import os
import secrets
from datetime import datetime, timedelta, timezone
from pathlib import Path

import jwt
from fastapi import Depends, HTTPException, Query
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlmodel import Session, select

from .db import get_session
from .models import Consent, Document, ReviewQueue, StreamTicket, User


def _demo_on() -> bool:
    return os.getenv("DEMO", "0") == "1"


def _get_secret() -> str:
    secret = os.getenv("JWT_SECRET", "")
    if not secret and _demo_on():
        return "carebridge-demo-secret-change-me"
    if len(secret) < 32:
        raise RuntimeError("JWT_SECRET must be at least 32 characters (or set DEMO=1 for the demo default)")
    return secret


SECRET = _get_secret()
ROLES = ("patient", "manager", "family", "doctor", "management")
STAFF_ROLES = {"doctor", "management"}
bearer = HTTPBearer(auto_error=False)

_COMMON_PASSWORDS: set[str] | None = None


def _load_common_passwords() -> set[str]:
    global _COMMON_PASSWORDS
    if _COMMON_PASSWORDS is None:
        path = Path(__file__).parent / "common_passwords.txt"
        _COMMON_PASSWORDS = {line.strip().lower() for line in path.read_text().splitlines() if line.strip()}
    return _COMMON_PASSWORDS


def validate_password(pw: str) -> str | None:
    if len(pw) < 8:
        return "Password must be at least 8 characters"
    if pw.lower() in _load_common_passwords():
        return "This password is too common. Choose a stronger one."
    return None


def hash_password(pw: str) -> str:
    salt = os.urandom(16)
    return salt.hex() + ":" + hashlib.pbkdf2_hmac("sha256", pw.encode(), salt, 120_000).hex()


def check_password(pw: str, stored: str) -> bool:
    salt, dk = stored.split(":")
    return hmac.compare_digest(hashlib.pbkdf2_hmac("sha256", pw.encode(), bytes.fromhex(salt), 120_000).hex(), dk)


def make_token(user: User) -> str:
    hours = 8 if user.role in STAFF_ROLES else 12
    exp = datetime.now(timezone.utc) + timedelta(hours=hours)
    return jwt.encode({"sub": str(user.id), "role": user.role, "tv": user.token_version, "exp": exp}, SECRET, algorithm="HS256")


def _user_from_token(token: str, s: Session) -> User:
    try:
        data = jwt.decode(token, SECRET, algorithms=["HS256"])
        user = s.get(User, int(data["sub"]))
    except Exception:
        user = None
    if not user or not user.active:
        raise HTTPException(401, "Please sign in again")
    if data.get("tv") is not None and data["tv"] != user.token_version:
        raise HTTPException(401, "Please sign in again")
    return user


def current_user(creds: HTTPAuthorizationCredentials | None = Depends(bearer),
                 s: Session = Depends(get_session)) -> User:
    """Bearer header only. Stream access uses a separate ticket."""
    raw = creds.credentials if creds else None
    if not raw:
        raise HTTPException(401, "Please sign in")
    return _user_from_token(raw, s)


def require(*roles: str):
    def dep(user: User = Depends(current_user)) -> User:
        if user.role not in roles:
            raise HTTPException(403, "Your role cannot do this")
        return user
    return dep


def create_stream_ticket(s: Session, user: User, doc_id: int) -> str:
    token = secrets.token_urlsafe(32)
    ticket = StreamTicket(token=token, document_id=doc_id, user_id=user.id,
                          expires_at=datetime.utcnow() + timedelta(seconds=60))
    s.add(ticket)
    s.commit()
    return token


def verify_stream_ticket(s: Session, token: str, doc_id: int) -> User:
    ticket = s.exec(select(StreamTicket).where(StreamTicket.token == token)).first()
    if not ticket or ticket.used or ticket.document_id != doc_id:
        raise HTTPException(401, "Invalid or expired stream ticket")
    if ticket.expires_at < datetime.utcnow():
        raise HTTPException(401, "Stream ticket expired")
    ticket.used = True
    s.add(ticket)
    s.commit()
    user = s.get(User, ticket.user_id)
    if not user or not user.active:
        raise HTTPException(401, "Please sign in again")
    return user


def consent_scope(s: Session, user: User, patient_id: int) -> str | None:
    c = s.exec(select(Consent).where(Consent.patient_id == patient_id, Consent.member_id == user.id)).first()
    return c.scope if c and c.scope != "none" else None


def doc_scope(s: Session, user: User, doc: Document) -> str | None:
    """What this user may see of a plan: full, appointments, reminders, or None."""
    if user.role == "patient":
        return "full" if doc.owner_id == user.id else None
    if user.role in ("manager", "family"):
        return consent_scope(s, user, doc.owner_id)
    if user.role == "doctor":
        q = select(ReviewQueue).where(ReviewQueue.document_id == doc.id)
        for r in s.exec(q):
            if user.id in (r.assigned_doctor_id, r.fallback_doctor_id):
                return "full"
    return None


def get_doc_for(s: Session, user: User, doc_id: int) -> tuple[Document, str]:
    doc = s.get(Document, doc_id)
    scope = doc_scope(s, user, doc) if doc else None
    if not doc or not scope:
        raise HTTPException(404, "Plan not found")
    return doc, scope
