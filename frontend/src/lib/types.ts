export type Lang = "en" | "ta" | "hi" | "te" | "kn" | "ml";
export type Role = "patient" | "manager" | "family" | "doctor" | "management";
export type ItemStatus = "Pending" | "Completed" | "Needs Review";

export interface User {
  id: number;
  name: string;
  email: string;
  role: Role;
  language: Lang;
  elderly?: boolean;
}

export interface Doc {
  id: number;
  title: string;
  patient_alias: string;
  discharge_date: string;
  city: string;
  pincode: string;
  preferred_language: Lang;
  pii_check_passed: boolean;
  created_at: string;
  items?: number;
  needs_review?: number;
}

export interface Provider {
  id: number;
  name: string;
  type: string;
  specialties: string[];
  city: string;
  pincode: string;
  languages: string[];
  insurance: string[];
  lat: number;
  lng: number;
  open_days: string;
  phone: string;
  synthetic: boolean;
}

export interface Match {
  provider: Provider;
  score: number;
  reasons: string[];
  selected: boolean;
}

export interface MedCard {
  drug: string;
  dose: string | null;
  timing: string[];
  frequency: number | null;
  duration_days: number | null;
  food: "after" | "before" | null;
  special: string | null;
}

export interface PlanItem {
  id: number;
  category: string;
  title: string;
  original_text: string;
  source_line_nos: number[];
  date_raw: string | null;
  date_resolved: string | null;
  time_of_day: string | null;
  status: ItemStatus;
  review_reason: string | null;
  simple_text: string | null;
  shown_language: Lang;
  safe_message: string | null;
  task_id: number | null;
  matches: Match[];
  reviewed: boolean;
  codes: string[];
  reason_plain: string | null;
  locked: boolean;
  callback_state: "requested" | "connecting" | "completed" | null;
  med: MedCard | null;
}

export interface PlanTask {
  id: number;
  item_id: number;
  title: string;
  due_at: string;
  status: "Pending" | "Completed";
  overdue: boolean;
  completed_at: string | null;
}

export interface Alert {
  id: number;
  task_id: number;
  message: string;
  level: "warning" | "urgent";
  created_at: string;
  acknowledged_at: string | null;
}

export type Scope = "full" | "appointments" | "reminders" | "none";

export interface Plan {
  viewer: { role: Role; scope: Scope };
  patient: { name: string; elderly: boolean };
  document: Doc;
  today: string;
  items: PlanItem[];
  tasks: PlanTask[];
  alerts: Alert[];
  open_reviews: number;
}

export interface SampleMeta {
  key: string;
  title: string;
  blurb: string;
  patient_alias: string;
  city: string;
  discharge_date: string;
}

export interface Masked {
  kind: string;
  original: string;
  masked: string;
}

export interface DoctorRef {
  id: number;
  name: string;
}

export interface ReviewEntry {
  id: number;
  item_id: number;
  document_id: number;
  patient_alias: string;
  reason: string;
  severity: "high" | "medium" | "low";
  state: string;
  reviewer_note: string | null;
  assigned_doctor: DoctorRef | null;
  fallback_doctor: DoctorRef | null;
  codes: string[];
  reason_plain: string[];
  age_hours: number;
  created_at: string;
  item?: {
    category: string;
    title: string;
    approved_fields?: Record<string, unknown>;
    original_text?: string;
    date_raw: string | null;
    date_resolved: string | null;
    time_of_day: string | null;
    status: string;
    confidence: number;
  };
}

export interface AuditRow {
  id: number;
  document_id?: number | null;
  actor: string;
  action: string;
  detail: Record<string, unknown>;
  created_at: string;
}

export interface Notice {
  id: number;
  message: string;
  level: "info" | "warning" | "urgent";
  document_id: number | null;
  read: boolean;
  created_at: string;
}

export interface HubMember {
  member_id: number;
  name: string;
  email: string;
  role: "manager" | "family" | "patient";
  scope?: Scope;
}

export interface FamilyPatient {
  patient: { id: number; name: string };
  scope: Scope;
  documents: Doc[];
  open_alerts: number;
}

export interface Overview {
  patients: number;
  plans: number;
  items: number;
  reviews_open: number;
  reviews_high: number;
  reviews_unassigned: number;
  reviews_resolved: number;
  tasks_pending: number;
  tasks_completed: number;
  tasks_overdue: number;
  alerts_open: number;
  callbacks_open: number;
}

export interface DoctorRow {
  id: number;
  name: string;
  specialty: string;
  available: boolean;
  open_items: number;
}

export interface CallbackRow {
  id: number;
  patient_alias: string;
  item_title: string;
  masked_number: string;
  state: string;
  note: string | null;
  created_at: string;
}

export interface AdminCallback {
  id: number;
  patient_alias: string;
  item_title: string;
  state: "requested" | "connecting" | "completed";
  masked_number: string;
  doctor: string | null;
  created_at: string;
}

export interface MedFields {
  dose: string;
  frequency: number;
  timing: string[];
  duration_days?: number;
  instructions?: string;
}

export interface StepEvent {
  step: string;
  state?: "running" | "done" | "flagged" | "failed";
  label?: string;
  message?: string;
  items?: number;
  flagged?: number;
  steps?: { key: string; label: string }[];
  document_id?: number;
}
