import type { StringKey } from "../i18n/strings";
import { useLang } from "../lib/lang";
import { useState } from "react";
import { Card, ListSkeleton } from "../components/ui";
import { api } from "../lib/api";
import { toast } from "../lib/toast";
import { invalidate, useQuery } from "../lib/query";
import type { Scope } from "../lib/types";

const SCOPES: { v: Scope; label: StringKey; help: StringKey }[] = [
  { v: "none", label: "shareNothing", help: "shareNothingHelp" },
  { v: "reminders", label: "scopeReminders", help: "shareRemindersHelp" },
  { v: "appointments", label: "scopeAppointments", help: "shareApptsHelp" },
  { v: "full", label: "scopeFull", help: "shareFullHelp" },
];

export default function Sharing() {
  const { t } = useLang();
  const { data, error } = useQuery("hub", api.hub);
  const [msg, setMsg] = useState<string | null>(null);

  const change = async (id: number, scope: Scope) => {
    await api.setConsent(id, scope);
    setMsg(t("sharingSaved"));
    toast(t("sharingSaved"));
    invalidate("hub");
    invalidate("family");
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
                <Card key={m.member_id} as="li" className="space-y-2 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p>
                      <strong>{m.name}</strong> <span className="text-muted">{m.role === "manager" ? "Hub manager" : "Family viewer"}, {m.email}</span>
                    </p>
                    <label>
                      <span className="sr-only">What {m.name} can see</span>
                      <select className="field w-auto" value={m.scope ?? "none"} onChange={(e) => change(m.member_id, e.target.value as Scope)}>
                        {SCOPES.map((s) => (
                          <option key={s.v} value={s.v}>{t(s.label)}</option>
                        ))}
                      </select>
                    </label>
                  </div>
                  <p className="text-sm text-muted">{t(SCOPES.find((s) => s.v === (m.scope ?? "none"))!.help)}</p>
                </Card>
              ))}
          </ul>
          {msg && <p role="status" className="text-primary">{msg}</p>}
        </section>
      )}
    </div>
  );
}
