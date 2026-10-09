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
  welcomed?: boolean;
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
  department: string;
  resolved_at: string | null;
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
    source_line_nos?: number[];
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
  actor_key?: string;
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
  email: string;
  specialty: string;
  available: boolean;
  active: boolean;
  backup: DoctorRef | null;
  open_items: number;
  overdue_items: number;
}

export type CallbackState = "requested" | "scheduled" | "connecting" | "completed" | "no_answer";

/** One callback request. Doctors and management see the same row. */
export interface Callback {
  id: number;
  document_id: number;
  patient_alias: string;
  department: string;
  item_title: string;
  masked_number: string;
  state: CallbackState;
  note: string | null;
  call_notes: string | null;
  doctor: DoctorRef | null;
  scheduled_for: string | null;
  created_at: string;
}

export interface Page<T> {
  rows: T[];
  total: number;
}

export interface TodayMed {
  task_id: number;
  document_id: number;
  status: "Pending" | "Completed";
  due_at: string;
  medicines: string[];
}

export interface TodayEvent {
  task_id: number;
  item_id: number;
  document_id: number;
  title: string;
  due_at: string;
  status: string;
  category: string | null;
  place: string;
}

export interface Today {
  today: string;
  name: string;
  plan: { id: number; title: string; discharge_date: string } | null;
  plans: number;
  medicines: Record<"morning" | "afternoon" | "night", TodayMed[]>;
  next_event: TodayEvent | null;
  needs_review: { item_id: number; document_id: number; title: string; reason: string }[];
  needs_review_count: number;
  progress: { done: number; due: number; overdue: number; total: number };
  upcoming: TodayEvent[];
  open_callbacks: number;
}

export interface FamilyHomeRow {
  patient: { id: number; name: string };
  scope: Scope;
  plans: { id: number; title: string }[];
  locked: { status: boolean; alerts: boolean };
  next_event: { title: string; due_at: string } | null;
  today?: { done: number; total: number };
  overdue?: number;
  open_alerts?: number;
  needs_review?: number;
}

export interface FamilyAlert extends Alert {
  patient: string;
  document_id: number;
  can_ack: boolean;
}

export interface DoctorHome {
  name: string;
  specialty: string;
  available: boolean;
  backup: DoctorRef | null;
  open_reviews: number;
  overdue_reviews: number;
  callbacks_waiting: number;
  patients_overdue: number;
}

export interface DoctorPatient {
  document_id: number;
  patient_alias: string;
  title: string;
  department: string;
  discharge_date: string;
  open_reviews: number;
  reviewed: number;
  overdue_tasks: number;
}

export interface Stats {
  days: number;
  department: string | null;
  today: string;
  departments: string[];
  numbers: {
    plans_created: number;
    needing_review: number;
    median_clear_hours: number | null;
    reviews_overdue: number;
    task_completion_rate: number;
    overdue_tasks: number;
    callbacks_completed: number;
    open_alerts: number;
  };
  reviews_per_day: { date: string; opened: number; cleared: number }[];
  load_per_doctor: { doctor: string; open: number; cleared: number }[];
  reasons: { reason: string; count: number }[];
  completion_by_department: { department: string; completed: number; due: number; overdue: number; rate: number }[];
}

export interface PatientRow {
  id: number;
  alias: string;
  city: string | null;
  language: Lang;
  plans: number;
  completion_rate: number;
  overdue_tasks: number;
  last_activity: string | null;
}

export type SettingsMap = Record<
  "reviewer_threshold_hours" | "caregiver_threshold_hours" | "remind_threshold_hours" | "enabled_languages" | "extract_model" | "rewrite_model",
  string
>;

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

export interface CalTask {
  id: number;
  document_id: number;
  patient: string;
  title: string;
  due_at: string;
  status: "Pending" | "Completed";
  overdue: boolean;
  kind: string;
  can_tick: boolean;
}
