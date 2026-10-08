import { useState } from "react";
import { ListSkeleton } from "../components/Skeleton";
import { api } from "../lib/api";
import { useLoad } from "../lib/motion";
import type { Scope } from "../lib/types";

const SCOPES: { v: Scope; label: string; help: string }[] = [
  { v: "none", label: "Nothing", help: "They cannot see your plan." },
  { v: "reminders", label: "Reminders only", help: "Tasks and alerts. No medicines or notes." },
  { v: "appointments", label: "Appointments only", help: "Visits, tests and referrals. Read only." },
  { v: "full", label: "Full plan", help: "Everything in your plan, with the original lines." },
];

export default function Sharing() {
  const { data, error, reload } = useLoad(() => api.hub(), []);
  const [msg, setMsg] = useState<string | null>(null);

  const change = async (id: number, scope: Scope) => {
    await api.setConsent(id, scope);
    setMsg("Saved. The change applies right away.");
    reload();
  };

  return (
    <div className="max-w-3xl space-y-6">
      <header>
        <h1 className="text-4xl">Sharing with family</h1>
        <p className="mt-2 text-muted">
          You decide who sees your plan and how much. Nobody sees anything until you allow it. Family can mark tasks done only if they are a hub manager.
          Items waiting for a doctor show as "waiting for doctor review". Every view is logged.
        </p>
      </header>
      {error && <p className="text-attention">{error}</p>}
      {!data && <ListSkeleton rows={3} />}
      {data && !data.hub && <p className="card p-4 text-muted">You are not in a family hub yet. Ask your family manager to add you by email.</p>}
      {data?.hub && (
        <section className="space-y-3">
          <h2 className="text-2xl">{data.hub.name}</h2>
          <ul className="space-y-3">
            {data.members
              .filter((m) => m.role !== "patient")
              .map((m) => (
                <li key={m.member_id} className="card space-y-2 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p>
                      <strong>{m.name}</strong> <span className="text-muted">{m.role === "manager" ? "Hub manager" : "Family viewer"}, {m.email}</span>
                    </p>
                    <label>
                      <span className="sr-only">What {m.name} can see</span>
                      <select className="field w-auto" value={m.scope ?? "none"} onChange={(e) => change(m.member_id, e.target.value as Scope)}>
                        {SCOPES.map((s) => (
                          <option key={s.v} value={s.v}>{s.label}</option>
                        ))}
                      </select>
                    </label>
                  </div>
                  <p className="text-sm text-muted">{SCOPES.find((s) => s.v === (m.scope ?? "none"))?.help}</p>
                </li>
              ))}
          </ul>
          {msg && <p role="status" className="text-primary">{msg}</p>}
        </section>
      )}
    </div>
  );
}
