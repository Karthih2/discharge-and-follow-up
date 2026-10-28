import hashlib
import logging
import os
import secrets
from datetime import datetime, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field
from sqlmodel import Session, select

from ..auth import check_password, current_user, hash_password, make_token, validate_password
from ..db import audit, clock_now, get_session
from ..models import FamilyHub, HubMember, MobileCode, User
from .. import rate_limit
from ..seed import DEMO_PASSWORD

log = logging.getLogger("carebridge.auth")

router = APIRouter(prefix="/api/auth")
staff = APIRouter(prefix="/api/staff")
PUBLIC_ROLES = ("patient", "manager", "family")
STAFF_ROLES = ("doctor", "management")
WRONG = "Email or password is not right"
LANGS = ("en", "ta", "hi", "te", "kn", "ml")


def user_dict(u: User) -> dict:
    return {"id": u.id, "name": u.name, "email": u.email, "role": u.role, "language": u.language, "elderly": u.elderly,
            "welcomed": u.welcomed, "mobile": u.mobile}


class LoginIn(BaseModel):
    email: str
    password: str
    language: Optional[str] = None


class RegisterIn(BaseModel):
    name: str = Field(min_length=2)
    email: str = Field(min_length=5)
    password: str = Field(min_length=8)
    role: str = "patient"  # patient or manager. Doctors and management are created by management.
    language: str = "en"


def _client_ip(request: Request) -> str:
    return request.client.host if request.client else "unknown"


def _login(body: LoginIn, s: Session, roles: tuple[str, ...], request: Request) -> dict:
    email = body.email.strip().lower()
    ip = _client_ip(request)
    blocked = rate_limit.check(email, ip)
    if blocked:
        raise HTTPException(429, blocked)
    u = s.exec(select(User).where(User.email == email)).first()
    if not u or not u.active or u.role not in roles or not check_password(body.password, u.password_hash):
        rate_limit.record_failure(email, ip)
        raise HTTPException(401, WRONG)
    if body.language in LANGS:
        u.language = body.language
        s.add(u)
        s.commit()
    audit(s, None, f"user:{u.id}", "login", {"role": u.role})
    return {"token": make_token(u), "user": user_dict(u)}


def _demo_list(s: Session, roles: tuple[str, ...]) -> dict:
    q = select(User).where(User.role.in_(roles), User.email.like("%@code2care.test"), User.active == True).order_by(User.id)  # noqa: E712
    return {"password": DEMO_PASSWORD, "accounts": [{"name": u.name, "email": u.email, "role": u.role} for u in s.exec(q)]}


@router.post("/login")
def login(body: LoginIn, request: Request, s: Session = Depends(get_session)):
    return _login(body, s, PUBLIC_ROLES, request)


@router.post("/signin")
def signin(body: LoginIn, request: Request, s: Session = Depends(get_session)):
    return _login(body, s, PUBLIC_ROLES + STAFF_ROLES, request)


@staff.post("/login")
def staff_login(body: LoginIn, request: Request, s: Session = Depends(get_session)):
    return _login(body, s, STAFF_ROLES, request)


def _need_demo():
    from .demo import need_demo
    need_demo()


@staff.get("/demo-accounts", dependencies=[Depends(_need_demo)])
def staff_demo_accounts(s: Session = Depends(get_session)):
    return _demo_list(s, STAFF_ROLES)


@router.post("/register")
def register(body: RegisterIn, request: Request, s: Session = Depends(get_session)):
    if body.role not in ("patient", "manager"):
        raise HTTPException(422, "You can sign up as a patient or a hub manager")
    pw_err = validate_password(body.password)
    if pw_err:
        raise HTTPException(422, pw_err)
    ip = _client_ip(request)
    blocked = rate_limit.check(body.email.strip().lower(), ip)
    if blocked:
        raise HTTPException(429, blocked)
    email = body.email.strip().lower()
    if s.exec(select(User).where(User.email == email)).first():
        raise HTTPException(409, "This email already has an account")
    u = User(name=body.name.strip(), email=email, password_hash=hash_password(body.password), role=body.role,
             language=body.language if body.language in LANGS else "en")
    s.add(u)
    s.commit()
    s.refresh(u)
    if u.role == "manager":
        hub = FamilyHub(name=f"{u.name.split()[0]} family", created_by=u.id)
        s.add(hub)
        s.commit()
        s.refresh(hub)
        s.add(HubMember(hub_id=hub.id, user_id=u.id, role="manager"))
        s.commit()
    audit(s, None, f"user:{u.id}", "registered", {"role": u.role})
    return {"token": make_token(u), "user": user_dict(u)}


@router.post("/welcomed")
def welcomed(u: User = Depends(current_user), s: Session = Depends(get_session)):
    u.welcomed = True
    s.add(u)
    s.commit()
    return user_dict(u)


@router.get("/me")
def me(u: User = Depends(current_user)):
    return user_dict(u)


class PrefIn(BaseModel):
    language: Optional[str] = None
    elderly: Optional[bool] = None


@router.patch("/me")
def set_language(body: PrefIn, u: User = Depends(current_user), s: Session = Depends(get_session)):
    if body.language is not None:
        if body.language not in LANGS:
            raise HTTPException(422, "Unknown language")
        u.language = body.language
    if body.elderly is not None:
        u.elderly = body.elderly
    s.add(u)
    s.commit()
    return user_dict(u)


@router.get("/demo-accounts", dependencies=[Depends(_need_demo)])
def demo_accounts(s: Session = Depends(get_session)):
    return _demo_list(s, PUBLIC_ROLES)


@router.post("/logout-all")
def logout_all(u: User = Depends(current_user), s: Session = Depends(get_session)):
    u.token_version += 1
    s.add(u)
    s.commit()
    audit(s, None, f"user:{u.id}", "logout_all", {})
    return {"ok": True}


# ---------- B.4: Mobile number sign-in (simulated SMS) ----------
class MobileRequestIn(BaseModel):
    mobile: str


class MobileVerifyIn(BaseModel):
    mobile: str
    code: str


def _hash_code(code: str) -> str:
    return hashlib.sha256(code.encode()).hexdigest()


@router.post("/mobile/request-code")
def request_mobile_code(body: MobileRequestIn, request: Request, s: Session = Depends(get_session)):
    mobile = body.mobile.strip()
    ip = _client_ip(request)
    blocked = rate_limit.check(mobile, ip)
    if blocked:
        raise HTTPException(429, blocked)
    u = s.exec(select(User).where(User.mobile == mobile, User.active == True)).first()  # noqa: E712
    if not u:
        rate_limit.record_failure(mobile, ip)
        raise HTTPException(404, "No account with this mobile number")
    code = f"{secrets.randbelow(900000) + 100000}"
    mc = MobileCode(mobile=mobile, code_hash=_hash_code(code),
                    expires_at=clock_now() + timedelta(minutes=5))
    s.add(mc)
    s.commit()
    demo = os.getenv("DEMO", "0") == "1"
    if demo:
        log.info("Demo SMS code for user %s", u.id)
        return {"sent": True, "demo_code": code}
    else:
        log.info("SMS code requested by user %s (no real SMS configured)", u.id)
        return {"sent": True}


@router.post("/mobile/verify")
def verify_mobile_code(body: MobileVerifyIn, request: Request, s: Session = Depends(get_session)):
    mobile = body.mobile.strip()
    ip = _client_ip(request)
    blocked = rate_limit.check(mobile, ip)
    if blocked:
        raise HTTPException(429, blocked)
    mc = s.exec(select(MobileCode).where(
        MobileCode.mobile == mobile, MobileCode.used == False  # noqa: E712
    ).order_by(MobileCode.id.desc())).first()
    if not mc or mc.attempts >= 5:
        rate_limit.record_failure(mobile, ip)
        raise HTTPException(401, "Invalid or expired code")
    if mc.expires_at < clock_now():
        raise HTTPException(401, "Code expired. Request a new one.")
    mc.attempts += 1
    if _hash_code(body.code.strip()) != mc.code_hash:
        s.add(mc)
        s.commit()
        rate_limit.record_failure(mobile, ip)
        raise HTTPException(401, "Wrong code")
    mc.used = True
    s.add(mc)
    s.commit()
    u = s.exec(select(User).where(User.mobile == mobile, User.active == True)).first()  # noqa: E712
    if not u:
        raise HTTPException(404, "Account not found")
    audit(s, None, f"user:{u.id}", "mobile_login", {"mobile": mobile})
    return {"token": make_token(u), "user": user_dict(u)}
