import type {
  AuditRow, Callback, DoctorHome, DoctorPatient, DoctorRow, Doc, FamilyAlert, FamilyHomeRow, HubMember, Lang, Masked, MedFields, Notice,
  CalTask, Page, PatientRow, Plan, Provider, ReviewEntry, SampleMeta, Scope, SettingsMap, Stats, Today, User,
} from "./types";

// Which app is this page? Each app keeps its own sign in, so they never share a login.
export type Portal = "patient" | "doctor" | "admin";
export const PORTAL: Portal = location.pathname.startsWith("/doctor") ? "doctor" : location.pathname.startsWith("/management") ? "admin" : "patient";
const KEY = `cb_token_${PORTAL}`;
export const tokenKey = (p: Portal) => `cb_token_${p}`;
export const getToken = (): string | null => {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
};
export const setToken = (t: string | null) => {
  try {
    if (t) localStorage.setItem(KEY, t);
    else localStorage.removeItem(KEY);
  } catch {
    /* storage unavailable */
  }
};

async function raw(path: string, init?: RequestInit): Promise<Response> {
  const token = getToken();
  const headers: Record<string, string> = { ...(init?.headers as Record<string, string>) };
  if (init?.body && !(init.body instanceof FormData)) headers["Content-Type"] = "application/json";
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`/api${path}`, { ...init, headers });
  if (!res.ok) {
    let msg = res.statusText;
    try {
      const j = await res.json();
      msg = typeof j.detail === "string" ? j.detail : msg;
    } catch {
      /* keep status text */
    }
    if (res.status === 401 && token && !path.startsWith("/auth/login")) {
      setToken(null);
      window.dispatchEvent(new Event("cb-signed-out"));
    }
    throw new Error(msg);
  }
  return res;
}

const req = async <T>(path: string, init?: RequestInit): Promise<T> => (await raw(path, init)).json() as Promise<T>;
/** A list answer with the full count from the X-Total-Count header. */
const reqPage = async <T>(path: string): Promise<Page<T>> => {
  const res = await raw(path);
  return { rows: (await res.json()) as T[], total: Number(res.headers.get("X-Total-Count") ?? 0) };
};
const qs = (o: Record<string, string | number | boolean | undefined | null>) => {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(o)) if (v !== undefined && v !== null && v !== "" && v !== false) p.set(k, String(v));
  const q = p.toString();
  return q ? `?${q}` : "";
};
const post = (body?: unknown): RequestInit => ({ method: "POST", body: JSON.stringify(body ?? {}) });
const put = (body: unknown): RequestInit => ({ method: "PUT", body: JSON.stringify(body) });
const patch = (body: unknown): RequestInit => ({ method: "PATCH", body: JSON.stringify(body) });

export interface Created {
  document: Doc;
  masked: Masked[];
}
export interface AuthOut {
  token: string;
  user: User;
}

async function download(path: string, filename: string) {
  const blob = await (await raw(path)).blob();
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

export const api = {
  // auth
  login: (email: string, password: string, language?: Lang) => req<AuthOut>("/auth/login", post({ email, password, language })),
  signin: (email: string, password: string, language?: Lang) => req<AuthOut>("/auth/signin", post({ email, password, language })),
  staffLogin: (email: string, password: string) => req<AuthOut>("/staff/login", post({ email, password })),
  staffDemo: () => req<{ password: string; accounts: { name: string; email: string; role: string }[] }>("/staff/demo-accounts"),
  register: (b: { name: string; email: string; password: string; role: string; language: Lang }) => req<AuthOut>("/auth/register", post(b)),
  me: () => req<User>("/auth/me"),
  setLanguage: (language: Lang) => req<User>("/auth/me", patch({ language })),
  setElderly: (elderly: boolean) => req<User>("/auth/me", patch({ elderly })),
  demoAccounts: () => req<{ password: string; accounts: { name: string; email: string; role: string }[] }>("/auth/demo-accounts"),
  // demo (only answers when the server runs in demo mode)
  meta: () => req<{ hospital: string; demo: boolean; mock_llm: boolean }>("/meta"),
  personas: () => req<{ key: string; name: string; role: string; path: string; blurb: string }[]>("/demo/personas"),
  demoLogin: (key: string) => req<AuthOut & { path: string }>("/demo/login", post({ key })),
  demoReset: () => req<{ ok: boolean }>("/demo/reset", post()),
  // patient
  samples: () => req<SampleMeta[]>("/samples"),
  createDocument: (body: { sample_key?: string; text?: string; preferred_language?: Lang }) => req<Created>("/documents", post(body)),
  createFromPdf: (file: File, preferred_language: Lang) => {
    const fd = new FormData();
    fd.append("file", file);
    return req<Created>(`/documents/pdf?preferred_language=${preferred_language}`, { method: "POST", body: fd });
  },
  documents: () => req<Doc[]>("/documents"),
  runUrl: (id: number) => `/api/documents/${id}/run?token=${encodeURIComponent(getToken() ?? "")}`,
  plan: (id: number, lang: Lang) => req<Plan>(`/documents/${id}/plan?lang=${lang}`),
  source: (id: number) => req<{ line_no: number; text: string }[]>(`/documents/${id}/source`),
  audit: (id: number) => req<AuditRow[]>(`/documents/${id}/audit`),
  downloadIcs: (id: number, lang: Lang) => download(`/documents/${id}/ics?lang=${lang}`, `carebridge-plan-${id}.ics`),
  setTask: (id: number, status: "Pending" | "Completed") => req<{ id: number; status: string }>(`/tasks/${id}`, patch({ status })),
  audio: async (itemId: number, lang: Lang) => URL.createObjectURL(await (await raw(`/items/${itemId}/audio?lang=${lang}`)).blob()),
  flag: (itemId: number, note?: string) => req(`/items/${itemId}/flag`, post({ note })),
  pickProvider: (itemId: number, provider_id: number) => req(`/items/${itemId}/provider`, post({ provider_id })),
  callback: (itemId: number) => req<{ id: number; masked_number: string }>(`/items/${itemId}/callback`, post({})),
  providers: () => req<Provider[]>("/providers"),
  // hub
  hub: () => req<{ hub: { id: number; name: string } | null; members: HubMember[] }>("/hub"),
  addMember: (b: { user_id?: number; name?: string; email?: string; role?: string }) => req<User>("/hub/members", post(b)),
  hubSearch: (q: string) => req<{ id: number; name: string; email: string; role: string }[]>(`/hub/search?q=${encodeURIComponent(q)}`),
  setConsent: (member_id: number, scope: Scope) => req("/consent", put({ member_id, scope })),
  ackAlert: (id: number) => req(`/alerts/${id}/ack`, post()),
  notifications: () => req<Notice[]>("/notifications"),
  readNotifications: () => req("/notifications/read", post()),
  welcomed: () => req<User>("/auth/welcomed", post()),
  speakToday: async (lang: Lang, slot: string) => URL.createObjectURL(await (await raw("/today/speak", post({ lang, slot }))).blob()),
  todayScript: (lang: Lang, slot: string) => req<{ lines: string[] }>(`/today/script?lang=${lang}&slot=${slot}`),
  today: () => req<Today>("/today"),
  calendar: (month: string) => req<{ month: string; today: string; tasks: CalTask[] }>(`/calendar?month=${month}`),
  familyHome: () => req<FamilyHomeRow[]>("/family/home"),
  familyAlerts: () => req<FamilyAlert[]>("/family/alerts"),
  // doctor
  review: (o: { state?: "open" | "all"; document_id?: number; code?: string; q?: string; limit?: number; offset?: number } = {}) =>
    reqPage<ReviewEntry>(`/review${qs({ state: o.state ?? "open", document_id: o.document_id, code: o.code, q: o.q, limit: o.limit ?? 100, offset: o.offset })}`),
  resolve: (id: number, body: { action: "approve" | "edit" | "reject"; note?: string; edited_text?: string; fields?: MedFields }) =>
    req<{ id: number; state: string }>(`/review/${id}/resolve`, post(body)),
  doctorHome: () => req<DoctorHome>("/doctor/home"),
  setAvailability: (available: boolean) => req("/doctor/availability", put({ available })),
  doctorPatients: (o: { q?: string; limit?: number; offset?: number } = {}) => reqPage<DoctorPatient>(`/doctor/patients${qs(o)}`),
  callbacks: (state?: string) => reqPage<Callback>(`/doctor/callbacks${qs({ state })}`),
  callbackAct: (id: number, body: { action: "complete" | "no_answer" | "reschedule" | "notes"; call_notes?: string; scheduled_for?: string }) =>
    req<Callback>(`/doctor/callbacks/${id}`, post(body)),
  // admin
  stats: (days: number, department?: string) => req<Stats>(`/admin/stats${qs({ days, department })}`),
  adminQueue: (o: { state?: string; doctor_id?: number; unassigned?: boolean; overdue?: boolean; q?: string; limit?: number; offset?: number } = {}) =>
    reqPage<ReviewEntry>(`/admin/queue${qs({ ...o, state: o.state ?? "open", limit: o.limit ?? 50 })}`),
  adminDoctors: () => req<DoctorRow[]>("/admin/doctors"),
  adminAvailability: (id: number, available: boolean) => req(`/admin/doctors/${id}/availability`, put({ available })),
  assign: (rid: number, doctor_id: number) => req(`/admin/queue/${rid}/assign`, post({ doctor_id })),
  bulkReassign: (from_doctor_id: number, to_doctor_id?: number) => req<{ moved: number }>("/admin/queue/bulk-reassign", post({ from_doctor_id, to_doctor_id })),
  addDoctor: (b: { name: string; email: string; password: string; specialty: string }) => req<User>("/admin/doctors", post(b)),
  editDoctor: (id: number, b: { specialty?: string; backup_user_id?: number; clear_backup?: boolean; active?: boolean }) =>
    req<DoctorRow>(`/admin/doctors/${id}`, patch(b)),
  resetPassword: (id: number, password: string) => req(`/admin/doctors/${id}/reset-password`, post({ password })),
  adminCallbacks: (o: { state?: string; doctor_id?: number; q?: string; limit?: number; offset?: number } = {}) => reqPage<Callback>(`/admin/callbacks${qs(o)}`),
  callbackStart: (id: number) => req(`/admin/callbacks/${id}/start`, post()),
  callbackComplete: (id: number) => req(`/admin/callbacks/${id}/complete`, post()),
  callbackNoAnswer: (id: number) => req(`/admin/callbacks/${id}/no-answer`, post()),
  callbackAssign: (id: number, doctor_id: number) => req(`/admin/callbacks/${id}/assign`, post({ doctor_id })),
  adminPatients: (o: { q?: string; limit?: number; offset?: number } = {}) => reqPage<PatientRow>(`/admin/patients${qs(o)}`),
  settings: () => req<SettingsMap>("/admin/settings"),
  saveSettings: (b: Partial<SettingsMap>) => req<SettingsMap>("/admin/settings", put(b)),
  adminAudit: (o: { actor?: string; action?: string; date_from?: string; date_to?: string; limit?: number; offset?: number } = {}) =>
    reqPage<AuditRow>(`/admin/audit${qs({ limit: 50, ...o })}`),
  auditFilters: () => req<{ actors: { key: string; label: string }[]; actions: string[] }>("/admin/audit/filters"),
  downloadAudit: (o: { actor?: string; action?: string; date_from?: string; date_to?: string }) => download(`/admin/audit.csv${qs(o)}`, "carebridge-audit.csv"),
  // demo clock
  clock: () => req<{ today: string }>("/demo/clock"),
  moveClock: (body: { days?: number; date?: string }) => req<{ today: string }>("/demo/clock", post(body)),
};
