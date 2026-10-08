from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlmodel import Session, select

from ..auth import check_password, current_user, hash_password, make_token
from ..db import audit, get_session
from ..models import FamilyHub, HubMember, User
from ..seed import DEMO_PASSWORD, USERS

router = APIRouter(prefix="/api/auth")
staff = APIRouter(prefix="/api/staff")
PUBLIC_ROLES = ("patient", "manager", "family")
STAFF_ROLES = ("doctor", "management")
WRONG = "Email or password is not right"
LANGS = ("en", "ta", "hi", "te", "kn", "ml")


def user_dict(u: User) -> dict:
    return {"id": u.id, "name": u.name, "email": u.email, "role": u.role, "language": u.language, "elderly": u.elderly}


class LoginIn(BaseModel):
    email: str
    password: str
    language: Optional[str] = None


class RegisterIn(BaseModel):
    name: str = Field(min_length=2)
    email: str = Field(min_length=5)
    password: str = Field(min_length=6)
    role: str = "patient"  # patient or manager. Doctors and management are created by management.
    language: str = "en"


def _login(body: LoginIn, s: Session, roles: tuple[str, ...]) -> dict:
    """Each portal accepts only its own roles. Anyone else gets the same answer as a wrong password."""
    u = s.exec(select(User).where(User.email == body.email.strip().lower())).first()
    if not u or u.role not in roles or not check_password(body.password, u.password_hash):
        raise HTTPException(401, WRONG)
    if body.language in LANGS:
        u.language = body.language
        s.add(u)
        s.commit()
    audit(s, None, f"user:{u.id}", "login", {"role": u.role})
    return {"token": make_token(u), "user": user_dict(u)}


@router.post("/login")
def login(body: LoginIn, s: Session = Depends(get_session)):
    return _login(body, s, PUBLIC_ROLES)


@staff.post("/login")
def staff_login(body: LoginIn, s: Session = Depends(get_session)):
    return _login(body, s, STAFF_ROLES)


@staff.get("/demo-accounts")
def staff_demo_accounts():
    """Invented staff logins, for the demo sign in pages of the two staff portals."""
    return {"password": DEMO_PASSWORD,
            "accounts": [{"name": n, "email": e, "role": r} for _, n, e, r, _ in USERS if r in STAFF_ROLES]}


@router.post("/register")
def register(body: RegisterIn, s: Session = Depends(get_session)):
    if body.role not in ("patient", "manager"):
        raise HTTPException(422, "You can sign up as a patient or a hub manager")
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


@router.get("/demo-accounts")
def demo_accounts():
    """Synthetic demo logins, listed on the sign in page so the demo is one click per role."""
    return {"password": DEMO_PASSWORD,
            "accounts": [{"name": n, "email": e, "role": r} for _, n, e, r, _ in USERS if r in PUBLIC_ROLES]}
