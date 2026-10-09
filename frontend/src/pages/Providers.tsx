import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ProviderCard, TYPE_LABEL } from "../components/ProviderCard";
import { ListSkeleton } from "../components/ui";
import { api } from "../lib/api";
import { useQuery } from "../lib/query";

export default function Providers() {
  const id = Number(useParams().id) || null;
  const { data: all, error } = useQuery("providers", api.providers);
  const { data: plan } = useQuery(id ? `plan/${id}/en` : null, () => api.plan(id!, "en"));
  const [city, setCity] = useState("");
  const [type, setType] = useState("");
  const [q, setQ] = useState("");

  const list = useMemo(
    () =>
      (all ?? []).filter(
        (p) =>
          (!city || p.city === city) &&
          (!type || p.type === type) &&
          (!q || (p.name + " " + p.specialties.join(" ")).toLowerCase().includes(q.toLowerCase())),
      ),
    [all, city, type, q],
  );
  const matched = plan?.items.filter((i) => i.matches.length > 0) ?? [];

  return (
    <div className="space-y-10">
      <header className="max-w-2xl">
        <h1 className="text-4xl">Providers</h1>
        <p className="mt-2 text-muted">
          Every provider here is invented for this demo. Matches are suggestions only. Please call to confirm availability.
        </p>
        {id && <Link to={`/plan/${id}`} className="mt-2 inline-block">Back to the plan</Link>}
      </header>

      {id && (
        <section aria-labelledby="h-match" className="space-y-6">
          <h2 id="h-match" className="text-2xl">Suggested for this plan</h2>
          {!plan && <ListSkeleton rows={2} />}
          {plan && matched.length === 0 && <p className="text-muted">No referrals or tests need a provider in this plan.</p>}
          {matched.map((it) => (
            <div key={it.id} className="space-y-2">
              <h3 className="text-xl">
                {it.title} <span className="text-base font-normal text-muted">{it.date_resolved ?? it.date_raw ?? ""}</span>
              </h3>
              <div className="grid gap-3 md:grid-cols-2">
                {it.matches.map((m, k) => (
                  <ProviderCard key={m.provider.id} p={m.provider} reasons={m.reasons} rank={k + 1} />
                ))}
              </div>
            </div>
          ))}
          {matched.length > 0 && <p className="text-sm text-muted">Suggestion only. Please call to confirm availability.</p>}
        </section>
      )}

      <section aria-labelledby="h-dir" className="space-y-4">
        <h2 id="h-dir" className="text-2xl">All providers ({list.length})</h2>
        <div className="flex flex-wrap gap-3">
          <input className="field max-w-xs" placeholder="Search name or specialty" aria-label="Search" value={q} onChange={(e) => setQ(e.target.value)} />
          <select className="field max-w-[10rem]" aria-label="City" value={city} onChange={(e) => setCity(e.target.value)}>
            <option value="">All cities</option>
            <option>Chennai</option>
            <option>Delhi</option>
          </select>
          <select className="field max-w-[12rem]" aria-label="Type" value={type} onChange={(e) => setType(e.target.value)}>
            <option value="">All types</option>
            {Object.entries(TYPE_LABEL).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>
        {error && <p className="text-attention">Could not load providers.</p>}
        {!all && <ListSkeleton />}
        <div className="grid gap-3 md:grid-cols-2">
          {list.map((p) => (
            <ProviderCard key={p.id} p={p} />
          ))}
        </div>
      </section>
    </div>
  );
}
