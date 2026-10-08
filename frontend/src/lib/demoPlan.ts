import type { Plan, PlanItem } from "./types";

const base = {
  review_reason: null,
  shown_language: "en" as const,
  safe_message: null,
  matches: [],
  reviewed: false,
  codes: [] as string[],
  reason_plain: null,
  locked: false,
  callback_state: null,
  med: null,
  time_of_day: null,
  date_raw: null,
  source_line_nos: [],
};

const items: PlanItem[] = [
  { ...base, id: 1, category: "appointment", title: "Heart doctor visit with ECG", original_text: "Review with the cardiologist after 2 weeks with an ECG.", date_resolved: "2026-10-24", status: "Pending", simple_text: "Visit the heart doctor (cardiologist) after 2 weeks. You will have an ECG test.", task_id: 1 },
  { ...base, id: 2, category: "test", title: "Lipid profile and blood sugar test", original_text: "Fasting lipid profile and blood sugar test after 4 weeks.", date_resolved: "2026-11-07", status: "Pending", simple_text: "Get a blood test for fats and sugar after 4 weeks. Do not eat before the test.", task_id: 2 },
  { ...base, id: 3, category: "referral", title: "Cardiac rehabilitation clinic", original_text: "Referred to the cardiac rehabilitation clinic after 6 weeks.", date_resolved: null, status: "Needs Review", simple_text: null, safe_message: "Your care team will confirm this", task_id: null, locked: true, reason_plain: "The date is missing or unclear.", codes: ["MISSING_DATE"] },
  { ...base, id: 4, category: "medication", title: "Aspirin 75 mg", original_text: "Tab Aspirin 75 mg once daily in the morning after food", date_resolved: null, time_of_day: "morning", status: "Pending", simple_text: "Take Aspirin 75 mg once a day, in the morning, after food.", task_id: null, med: { drug: "Aspirin", dose: "75 mg", timing: ["morning"], frequency: 1, duration_days: null, food: "after", special: null } },
  { ...base, id: 5, category: "medication", title: "Atorvastatin 40 mg", original_text: "Tab Atorvastatin 40 mg once daily at night", date_resolved: null, time_of_day: "night", status: "Pending", simple_text: "Take Atorvastatin 40 mg once a day, at night.", task_id: null, med: { drug: "Atorvastatin", dose: "40 mg", timing: ["night"], frequency: 1, duration_days: null, food: null, special: null } },
  { ...base, id: 6, category: "diet", title: "Low salt, low fat diet", original_text: "Eat a low salt, low fat diet. Avoid fried and oily food.", date_resolved: null, status: "Pending", simple_text: "Eat food with low salt and low fat. Avoid fried and oily food.", task_id: null },
  { ...base, id: 7, category: "warning_sign", title: "Chest pain or pressure", original_text: "Chest pain or pressure lasting more than 15 minutes. Call 108 at once.", date_resolved: null, status: "Pending", simple_text: "Call 108 at once if you have chest pain or pressure that lasts more than 15 minutes.", task_id: null },
];

export const DEMO_PLAN: Plan = {
  viewer: { role: "patient", scope: "full" },
  patient: { name: "Ramesh Iyer", elderly: false },
  document: { id: 0, title: "Sample", patient_alias: "Mr. R. Iyer (synthetic)", discharge_date: "2026-10-10", city: "Chennai", pincode: "600017", preferred_language: "en", pii_check_passed: true, created_at: "2026-10-10T00:00:00" },
  today: "2026-10-12",
  items,
  tasks: [
    { id: 1, item_id: 1, title: "Heart doctor visit with ECG", due_at: "2026-10-24T10:00:00", status: "Pending", overdue: false, completed_at: null },
    { id: 2, item_id: 2, title: "Lipid profile and blood sugar test", due_at: "2026-11-07T08:00:00", status: "Pending", overdue: false, completed_at: null },
    { id: 3, item_id: 4, title: "Morning medicines: Aspirin 75 mg", due_at: "2026-10-12T08:00:00", status: "Completed", overdue: false, completed_at: "2026-10-12T08:10:00" },
    { id: 4, item_id: 5, title: "Night medicines: Atorvastatin 40 mg", due_at: "2026-10-12T21:00:00", status: "Pending", overdue: false, completed_at: null },
  ],
  alerts: [],
  open_reviews: 0,
};
