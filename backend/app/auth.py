"""JWT login with role based access. Passwords use PBKDF2 from the standard library."""
import hashlib
import hmac
import os
from datetime import datetime, timedelta, timezone

import jwt
from fastapi import Depends, HTTPException, Query
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlmodel import Session, select

from .db import get_session
from .models import Consent, Document, ReviewQueue, User

SECRET = os.getenv("JWT_SECRET", "carebridge-demo-secret-change-me")  # ponytail: demo default, set JWT_SECRET for anything real
ROLES = ("patient", "manager", "family", "doctor", "management")
bearer = HTTPBearer(auto_error=False)


def hash_password(pw: str) -> str:
    salt = os.urandom(16)
    return salt.hex() + ":" + hashlib.pbkdf2_hmac("sha256", pw.encode(), salt, 120_000).hex()


def check_password(pw: str, stored: str) -> bool:
    salt, dk = stored.split(":")
    return hmac.compare_digest(hashlib.pbkdf2_hmac("sha256", pw.encode(), bytes.fromhex(salt), 120_000).hex(), dk)


def make_token(user: User) -> str:
    exp = datetime.now(timezone.utc) + timedelta(hours=12)
    return jwt.encode({"sub": str(user.id), "role": user.role, "exp": exp}, SECRET, algorithm="HS256")


def _user_from_token(token: str, s: Session) -> User:
    try:
        data = jwt.decode(token, SECRET, algorithms=["HS256"])
        user = s.get(User, int(data["sub"]))
    except Exception:
        user = None
    if not user or not user.active:
        raise HTTPException(401, "Please sign in again")
    return user


def current_user(creds: HTTPAuthorizationCredentials | None = Depends(bearer), token: str | None = Query(None),
                 s: Session = Depends(get_session)) -> User:
    """Bearer header, or ?token= for browser features that cannot set headers (event streams)."""
    raw = creds.credentials if creds else token
    if not raw:
        raise HTTPException(401, "Please sign in")
    return _user_from_token(raw, s)


def require(*roles: str):
    def dep(user: User = Depends(current_user)) -> User:
        if user.role not in roles:
            raise HTTPException(403, "Your role cannot do this")
        return user
    return dep


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
