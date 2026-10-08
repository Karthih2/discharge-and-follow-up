import type {
  AdminCallback, AuditRow, MedFields, CallbackRow, Doc, DoctorRow, FamilyPatient, HubMember, Lang, Masked, Notice, Overview, Plan, Provider,
  ReviewEntry, SampleMeta, Scope, User,
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
  addMember: (b: { name: string; email: string; role: string }) => req<User>("/hub/members", post(b)),
  setConsent: (member_id: number, scope: Scope) => req("/consent", put({ member_id, scope })),
  familyPatients: () => req<FamilyPatient[]>("/family/patients"),
  ackAlert: (id: number) => req(`/alerts/${id}/ack`, post()),
  notifications: () => req<Notice[]>("/notifications"),
  readNotifications: () => req("/notifications/read", post()),
  // doctor
  review: (document_id?: number, state: "open" | "all" = "open") =>
    req<ReviewEntry[]>(`/review?state=${state}${document_id ? `&document_id=${document_id}` : ""}`),
  resolve: (id: number, body: { action: "approve" | "edit" | "reject"; note?: string; edited_text?: string; fields?: MedFields }) =>
    req<{ id: number; state: string }>(`/review/${id}/resolve`, post(body)),
  doctorMe: () => req<{ name: string; specialty: string; available: boolean }>("/doctor/me"),
  setAvailability: (available: boolean) => req("/doctor/availability", put({ available })),
  callbacks: () => req<CallbackRow[]>("/doctor/callbacks"),
  adminCallbacks: () => req<AdminCallback[]>("/admin/callbacks"),
  callbackStart: (id: number) => req(`/admin/callbacks/${id}/start`, post()),
  callbackComplete: (id: number) => req(`/admin/callbacks/${id}/complete`, post()),
  // admin
  overview: () => req<Overview>("/admin/overview"),
  adminQueue: (state: "open" | "all" = "open") => req<ReviewEntry[]>(`/admin/queue?state=${state}`),
  adminDoctors: () => req<DoctorRow[]>("/admin/doctors"),
  adminAvailability: (id: number, available: boolean) => req(`/admin/doctors/${id}/availability`, put({ available })),
  assign: (rid: number, doctor_id: number) => req(`/admin/queue/${rid}/assign`, post({ doctor_id })),
  adminAudit: () => req<AuditRow[]>("/admin/audit?limit=100"),
  adminUsers: () => req<User[]>("/admin/users"),
  addDoctor: (b: { name: string; email: string; password: string; specialty: string }) => req<User>("/admin/doctors", post(b)),
  demoData: () => req<{ loaded: number[] }>("/admin/demo-data", post()),
  // demo clock
  clock: () => req<{ today: string }>("/demo/clock"),
  moveClock: (body: { days?: number; date?: string }) => req<{ today: string }>("/demo/clock", post(body)),
};
