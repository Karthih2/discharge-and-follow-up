import { useState } from "react";
import { AuditTable } from "../../components/AuditTable";
import { CountUp } from "../../components/Fx";
import { SEV } from "../../components/ReviewCard";
import { ListSkeleton, Skeleton } from "../../components/Skeleton";
import { api } from "../../lib/api";
import { useLoad } from "../../lib/motion";
import type { Overview as Ov } from "../../lib/types";

const GROUPS: { title: string; rows: [string, keyof Ov, boolean][] }[] = [
  { title: "Review queue", rows: [["Open reviews", "reviews_open", false], ["High severity", "reviews_high", true], ["Unassigned", "reviews_unassigned", true], ["Resolved", "reviews_resolved", false]] },
  { title: "Follow-up", rows: [["Patients", "patients", false], ["Plans", "plans", false], ["Tasks pending", "tasks_pending", false], ["Tasks overdue", "tasks_overdue", true], ["Open alerts", "alerts_open", true], ["Callbacks open", "callbacks_open", false]] },
];

export function Overview() {
  const ov = useLoad(() => api.overview(), []);
  const [msg, setMsg] = useState<string | null>(null);
  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-2xl">
          <h1 className="text-4xl">Overview</h1>
          <p className="mt-2 text-muted">How the review queue and follow-up tasks are doing across Code2Care Hospital. Clinical text is never shown here.</p>
        </div>
        <button className="btn btn-quiet" onClick={() => api.demoData().then((r) => { setMsg(r.loaded.length ? "Demo plans loaded." : "Demo plans are already loaded."); ov.reload(); })}>Load demo plans</button>
      </header>
      {msg && <p role="status" className="text-primary">{msg}</p>}
      {!ov.data && <Skeleton className="h-40 w-full" />}
      {ov.data && (
        <div className="grid gap-x-12 gap-y-8 md:grid-cols-2">
          {GROUPS.map((g) => (
            <section key={g.title} aria-label={g.title}>
              <h2 className="mb-1 text-2xl">{g.title}</h2>
              <dl className="rule-list border-y border-line">
                {g.rows.map(([label, key, alarm]) => {
                  const v = ov.data![key];
                  return (
                    <div key={key} className="flex items-center justify-between gap-4 py-3">
                      <dt>{label}</dt>
                      <dd className={`font-heading text-2xl ${alarm && v ? "text-attention" : ""}`}><CountUp to={v} /></dd>
                    </div>
                  );
                })}
              </dl>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

export function Queue() {
  const queue = useLoad(() => api.adminQueue("open"), []);
  const docs = useLoad(() => api.adminDoctors(), []);
  return (
    <div className="space-y-6">
      <header className="max-w-2xl">
        <h1 className="text-4xl">Review queue</h1>
        <p className="mt-2 text-muted">Assign or move items. Reason codes and age only, no clinical text.</p>
      </header>
      {!queue.data && <ListSkeleton />}
      {queue.data?.length === 0 && <p className="card p-6 text-muted">The queue is empty.</p>}
      <div className="space-y-3">
        {queue.data?.map((r) => (
          <div key={r.id} className="card flex flex-wrap items-center justify-between gap-3 p-4">
            <div className="min-w-0 flex-1">
              <p><span className={`mr-2 rounded-sm border px-2 text-sm font-semibold ${SEV[r.severity]}`}>{r.severity}</span><strong>{r.item?.title}</strong> <span className="text-muted">for {r.patient_alias}</span></p>
              <p className="mt-1 flex flex-wrap items-center gap-1 text-sm">
                {r.codes.map((c) => <span key={c} className="rounded-sm border border-attention px-1.5 font-mono text-xs text-attention">{c}</span>)}
                <span className="text-muted">waiting {r.age_hours < 1 ? "under an hour" : `${Math.round(r.age_hours)} h`}</span>
              </p>
              <p className="text-sm text-muted">Reviewer: {r.assigned_doctor?.name ?? "none"}. Backup: {r.fallback_doctor?.name ?? "none"}.</p>
            </div>
            <label>
              <span className="sr-only">Assign reviewer</span>
              <select className="field w-auto max-w-full" value={r.assigned_doctor?.id ?? ""} onChange={(e) => api.assign(r.id, Number(e.target.value)).then(queue.reload)}>
                <option value="" disabled>Assign to</option>
                {docs.data?.filter((d) => d.available).map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </label>
          </div>
        ))}
      </div>
    </div>
  );
}

export function Reviewers() {
  const docs = useLoad(() => api.adminDoctors(), []);
  const blank = { name: "", email: "", password: "", specialty: "general medicine" };
  const [f, setF] = useState(blank);
  const [msg, setMsg] = useState<string | null>(null);
  return (
    <div className="space-y-6">
      <header className="max-w-2xl">
        <h1 className="text-4xl">Reviewers</h1>
        <p className="mt-2 text-muted">Doctors are created here by management and have no sign up of their own. Marking someone unavailable moves their open items to the backup.</p>
      </header>
      {!docs.data && <ListSkeleton rows={3} />}
      <ul className="space-y-2">
        {docs.data?.map((d) => (
          <li key={d.id} className="card flex flex-wrap items-center justify-between gap-3 p-4">
            <span><strong>{d.name}</strong> <span className="text-muted">{d.specialty}. {d.open_items} open item(s).</span></span>
            <button className={`btn btn-sm ${d.available ? "" : "btn-attention"}`} onClick={() => api.adminAvailability(d.id, !d.available).then(docs.reload)}>{d.available ? "Available" : "Unavailable"}</button>
          </li>
        ))}
      </ul>
      <form
        className="card grid gap-3 p-5 md:grid-cols-2"
        onSubmit={async (e) => {
          e.preventDefault();
          try {
            await api.addDoctor(f);
            setF(blank);
            setMsg("Doctor account created.");
            docs.reload();
          } catch (x) {
            setMsg((x as Error).message);
          }
        }}
      >
        <h2 className="text-2xl md:col-span-2">Add a doctor</h2>
        <input className="field" placeholder="Full name" aria-label="Full name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} required />
        <input className="field" type="email" placeholder="Work email" aria-label="Work email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} required />
        <input className="field" placeholder="Specialty" aria-label="Specialty" value={f.specialty} onChange={(e) => setF({ ...f, specialty: e.target.value })} required />
        <input className="field" type="password" placeholder="Starting password (8 or more)" aria-label="Starting password" minLength={8} value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} required autoComplete="new-password" />
        <div className="md:col-span-2">
          <button className="btn">Create doctor account</button>
          {msg && <span role="status" className="ml-3 text-muted">{msg}</span>}
        </div>
      </form>
    </div>
  );
}

export function Callbacks() {
  const calls = useLoad(() => api.adminCallbacks(), []);
  return (
    <div className="space-y-6">
      <header className="max-w-2xl">
        <h1 className="text-4xl">Callbacks</h1>
        <p className="mt-2 text-muted">Run the masked call: requested, connecting, completed. Invented numbers only. No real call is made.</p>
      </header>
      {!calls.data && <ListSkeleton rows={3} />}
      {calls.data?.length === 0 && <p className="card p-6 text-muted">No callback requests.</p>}
      <ul className="space-y-2">
        {calls.data?.map((c) => (
          <li key={c.id} className="card flex flex-wrap items-center justify-between gap-3 p-4">
            <span className="min-w-0"><strong>{c.patient_alias}</strong> about {c.item_title}. <span className="font-mono">{c.masked_number}</span>. Doctor: {c.doctor ?? "none"}.</span>
            <span className="flex items-center gap-2">
              <span className="rounded-sm border border-line px-2 text-sm text-muted">{c.state}</span>
              {c.state === "requested" && <button className="btn btn-sm" onClick={() => api.callbackStart(c.id).then(calls.reload)}>Start call</button>}
              {c.state === "connecting" && <button className="btn btn-sm" onClick={() => api.callbackComplete(c.id).then(calls.reload)}>Mark completed</button>}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function Audit() {
  const audit = useLoad(() => api.adminAudit(), []);
  return (
    <div className="space-y-6">
      <header className="max-w-2xl">
        <h1 className="text-4xl">Audit log</h1>
        <p className="mt-2 text-muted">The latest 100 actions across the hospital.</p>
      </header>
      {!audit.data && <ListSkeleton rows={4} />}
      {audit.data && <AuditTable rows={audit.data} />}
    </div>
  );
}
