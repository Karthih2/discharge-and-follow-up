import { useState } from "react";
import { Link } from "react-router-dom";
import { ListSkeleton } from "../components/Skeleton";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";
import { fmtDate, useLoad } from "../lib/motion";

const SCOPE_LABEL = { full: "Full plan", appointments: "Appointments only", reminders: "Reminders only", none: "No access" };

export function FamilyHome() {
  const { user } = useAuth();
  const { data, error } = useLoad(() => api.familyPatients(), []);
  return (
    <div className="space-y-8">
      <header className="max-w-2xl">
        <h1 className="text-4xl">My family</h1>
        <p className="mt-2 text-muted">
          You see only the plans a patient has chosen to share with you.
          {user?.role === "manager" ? " As hub manager you can mark tasks done and acknowledge alerts." : " You have a read only view."}
        </p>
      </header>
      {error && <p className="text-attention">{error}</p>}
      {!data && <ListSkeleton rows={2} />}
      {data && data.length === 0 && <p className="card p-4 text-muted">Nobody has shared a plan with you yet. Ask them to allow it under Sharing.</p>}
      <div className="space-y-6">
        {data?.map((p) => (
          <section key={p.patient.id} aria-label={p.patient.name} className="card p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-2xl">{p.patient.name}</h2>
              <span className="rounded-sm border border-line px-2 text-sm text-muted">{SCOPE_LABEL[p.scope]}</span>
            </div>
            {p.open_alerts > 0 && <p className="mb-2 font-semibold text-attention">{p.open_alerts} open alert(s)</p>}
            {p.documents.length === 0 && <p className="text-muted">No plan added yet.</p>}
            <ul className="space-y-2">
              {p.documents.map((d) => (
                <li key={d.id} className="flex flex-wrap items-center justify-between gap-2">
                  <span>
                    {d.title}. Left hospital {fmtDate(d.discharge_date)}.
                  </span>
                  <Link to={`/plan/${d.id}`} className="btn btn-quiet btn-sm">Open plan</Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}

export function FamilyHub() {
  const { data, error, reload } = useLoad(() => api.hub(), []);
  const [f, setF] = useState({ name: "", email: "", role: "family" });
  const [msg, setMsg] = useState<string | null>(null);
  return (
    <div className="max-w-3xl space-y-6">
      <header>
        <h1 className="text-4xl">{data?.hub?.name ?? "Family hub"}</h1>
        <p className="mt-2 text-muted">Add the people in your family. New people get an account with the demo password. Each patient then decides what you can see.</p>
      </header>
      {error && <p className="text-attention">{error}</p>}
      {!data && <ListSkeleton rows={3} />}
      <ul className="space-y-2">
        {data?.members.map((m) => (
          <li key={m.member_id} className="card flex flex-wrap items-center justify-between gap-2 p-3">
            <span>
              <strong>{m.name}</strong> <span className="text-muted">{m.email}</span>
            </span>
            <span className="rounded-sm border border-line px-2 text-sm text-muted">{m.role === "manager" ? "Hub manager" : m.role === "family" ? "Family viewer" : "Patient"}</span>
          </li>
        ))}
      </ul>
      <form
        className="card space-y-3 p-4"
        onSubmit={async (e) => {
          e.preventDefault();
          setMsg(null);
          try {
            await api.addMember(f);
            setF({ name: "", email: "", role: "family" });
            setMsg("Added.");
            reload();
          } catch (x) {
            setMsg((x as Error).message);
          }
        }}
      >
        <h2 className="text-2xl">Add a person</h2>
        <div className="grid gap-3 md:grid-cols-3">
          <input className="field" placeholder="Name" aria-label="Name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} required />
          <input className="field" type="email" placeholder="Email" aria-label="Email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} required />
          <select className="field" aria-label="Role" value={f.role} onChange={(e) => setF({ ...f, role: e.target.value })}>
            <option value="family">Family viewer</option>
            <option value="patient">Patient</option>
            <option value="manager">Another manager</option>
          </select>
        </div>
        <button className="btn">Add to hub</button>
        {msg && <p role="status" className="text-muted">{msg}</p>}
      </form>
    </div>
  );
}
