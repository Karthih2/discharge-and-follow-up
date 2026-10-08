from datetime import date, datetime
from typing import Optional

from pydantic import NaiveDatetime
from sqlalchemy import Column
from sqlalchemy.types import JSON
from sqlmodel import Field, SQLModel


class Setting(SQLModel, table=True):
    __tablename__ = "settings"
    key: str = Field(primary_key=True)
    value: str


class Document(SQLModel, table=True):
    __tablename__ = "documents"
    id: Optional[int] = Field(default=None, primary_key=True)
    owner_id: int = Field(default=0, index=True)
    title: str
    patient_alias: str
    discharge_date: date
    city: str
    pincode: str
    preferred_language: str = "en"
    raw_text: str
    created_at: NaiveDatetime = Field(default_factory=datetime.now)
    pii_check_passed: bool = False


class SourceLine(SQLModel, table=True):
    __tablename__ = "source_lines"
    id: Optional[int] = Field(default=None, primary_key=True)
    document_id: int = Field(index=True)
    line_no: int
    text: str


class Item(SQLModel, table=True):
    __tablename__ = "items"
    id: Optional[int] = Field(default=None, primary_key=True)
    document_id: int = Field(index=True)
    category: str
    title: str
    original_text: str
    source_line_ids: list = Field(default_factory=list, sa_column=Column(JSON))
    date_raw: Optional[str] = None
    date_resolved: Optional[date] = None
    time_of_day: Optional[str] = None
    confidence: float = 0.5
    status: str = "Pending"  # Pending, Completed, Needs Review (Rejected = removed by a doctor)
    review_reason: Optional[str] = None
    reviewed_by: Optional[int] = None
    review_codes: list = Field(default_factory=list, sa_column=Column(JSON))
    approved_fields: dict = Field(default_factory=dict, sa_column=Column(JSON))


class ItemText(SQLModel, table=True):
    __tablename__ = "item_texts"
    id: Optional[int] = Field(default=None, primary_key=True)
    item_id: int = Field(index=True)
    language: str
    simple_text: str
    numbers_verified: bool = False


class Task(SQLModel, table=True):
    __tablename__ = "tasks"
    id: Optional[int] = Field(default=None, primary_key=True)
    item_id: int = Field(index=True)
    document_id: int = Field(index=True)
    title: str
    due_at: NaiveDatetime
    status: str = "Pending"  # Pending, Completed
    completed_at: Optional[NaiveDatetime] = None


class Reminder(SQLModel, table=True):
    __tablename__ = "reminders"
    id: Optional[int] = Field(default=None, primary_key=True)
    task_id: int = Field(index=True)
    remind_at: NaiveDatetime
    channel: str = "in_app"  # in_app, sms_simulated
    sent: bool = False


class ReviewQueue(SQLModel, table=True):
    __tablename__ = "review_queue"
    id: Optional[int] = Field(default=None, primary_key=True)
    item_id: int = Field(index=True)
    document_id: int = Field(index=True)
    reason: str
    severity: str = "medium"  # high, medium, low
    state: str = "open"  # open, approved, edited, rejected
    assigned_doctor_id: Optional[int] = None
    fallback_doctor_id: Optional[int] = None
    codes: list = Field(default_factory=list, sa_column=Column(JSON))
    reviewer_note: Optional[str] = None
    created_at: NaiveDatetime = Field(default_factory=datetime.now)
    resolved_at: Optional[NaiveDatetime] = None


class AuditLog(SQLModel, table=True):
    __tablename__ = "audit_log"
    id: Optional[int] = Field(default=None, primary_key=True)
    document_id: Optional[int] = Field(default=None, index=True)
    actor: str
    action: str
    detail: dict = Field(default_factory=dict, sa_column=Column(JSON))
    created_at: NaiveDatetime = Field(default_factory=datetime.now)


class Provider(SQLModel, table=True):
    __tablename__ = "providers"
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str
    type: str
    specialties: str
    city: str
    pincode: str
    lat: float
    lng: float
    languages: str
    insurance: str
    open_days: str
    phone: str
    synthetic: bool = True


class ProviderMatch(SQLModel, table=True):
    __tablename__ = "provider_matches"
    id: Optional[int] = Field(default=None, primary_key=True)
    item_id: int = Field(index=True)
    provider_id: int
    score: float
    reasons: list = Field(default_factory=list, sa_column=Column(JSON))
    selected: bool = False


class CaregiverAlert(SQLModel, table=True):
    __tablename__ = "caregiver_alerts"
    id: Optional[int] = Field(default=None, primary_key=True)
    document_id: int = Field(index=True)
    task_id: int
    message: str
    level: str = "warning"  # warning, urgent
    created_at: NaiveDatetime = Field(default_factory=datetime.now)
    acknowledged_at: Optional[NaiveDatetime] = None


class PipelineRun(SQLModel, table=True):
    __tablename__ = "pipeline_runs"
    id: Optional[int] = Field(default=None, primary_key=True)
    document_id: int = Field(index=True)
    step: str
    state: str  # running, done, flagged, failed
    started_at: NaiveDatetime = Field(default_factory=datetime.now)
    finished_at: Optional[NaiveDatetime] = None
    message: Optional[str] = None


class User(SQLModel, table=True):
    __tablename__ = "users"
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str
    email: str = Field(index=True, unique=True)
    password_hash: str
    role: str  # patient, manager, family, doctor, management
    language: str = "en"
    elderly: bool = False
    created_at: NaiveDatetime = Field(default_factory=datetime.now)


class FamilyHub(SQLModel, table=True):
    __tablename__ = "family_hubs"
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str
    created_by: int


class HubMember(SQLModel, table=True):
    __tablename__ = "hub_members"
    id: Optional[int] = Field(default=None, primary_key=True)
    hub_id: int = Field(index=True)
    user_id: int = Field(index=True)
    role: str  # manager, family, patient


class Consent(SQLModel, table=True):
    __tablename__ = "consents"
    id: Optional[int] = Field(default=None, primary_key=True)
    patient_id: int = Field(index=True)
    member_id: int = Field(index=True)
    scope: str = "none"  # full, appointments, reminders, none
    updated_at: NaiveDatetime = Field(default_factory=datetime.now)


class Doctor(SQLModel, table=True):
    __tablename__ = "doctors"
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(index=True)
    specialty: str
    phone: str  # invented
    available: bool = True


class Notification(SQLModel, table=True):
    __tablename__ = "notifications"
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(index=True)
    document_id: Optional[int] = None
    message: str
    level: str = "info"  # info, warning, urgent
    created_at: NaiveDatetime = Field(default_factory=datetime.now)
    read: bool = False


class CallbackRequest(SQLModel, table=True):
    __tablename__ = "callback_requests"
    id: Optional[int] = Field(default=None, primary_key=True)
    item_id: int = Field(index=True)
    document_id: int = Field(index=True)
    requested_by: int
    patient_number: str  # masked, invented
    doctor_id: Optional[int] = None
    state: str = "requested"  # requested, connecting, completed
    note: Optional[str] = None
    created_at: NaiveDatetime = Field(default_factory=datetime.now)
