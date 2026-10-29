import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { NearbyMap } from "../components/NearbyMap";
import { km } from "../components/ProviderMap";
import { ProviderCard, TYPE_LABEL } from "../components/ProviderCard";
import { ListSkeleton } from "../components/ui";
import { api } from "../lib/api";
import { useQuery } from "../lib/query";

export default function Providers() {
  const id = Number(useParams().id) || null;
  const { data: all, error } = useQuery("providers", api.providers);
  const { data: plan } = useQuery(id ? `plan/${id}/en` : null, () => api.plan(id!, "en"));
  const [pin, setPin] = useState("");
  const [radius, setRadius] = useState("10");
  const [type, setType] = useState("");
  const [q, setQ] = useState("");
  const [view, setView] = useState<"list" | "map">("list");
  const [active, setActive] = useState<number | null>(null);

  // Areas come from the data: one per pincode, centred on its providers.
  const areas = useMemo(() => {
    const m = new Map<string, { city: string; pts: [number, number][] }>();
    for (const p of all ?? []) {
      const a = m.get(p.pincode) ?? { city: p.city, pts: [] };
      a.pts.push([p.lat, p.lng]);
      m.set(p.pincode, a);
    }
    return [...m].map(([code, a]) => ({
      code, city: a.city,
      at: [a.pts.reduce((t, x) => t + x[0], 0) / a.pts.length, a.pts.reduce((t, x) => t + x[1], 0) / a.pts.length] as [number, number],
    })).sort((a, b) => a.city.localeCompare(b.city) || a.code.localeCompare(b.code));
  }, [all]);
  const area = areas.find((a) => a.code === (pin || plan?.document.pincode)) ?? areas[0];
  const maxKm = radius === "any" ? null : Number(radius);

  const list = useMemo(
    () =>
      area
        ? (all ?? [])
            .filter((p) => p.city === area.city && (!type || p.type === type) &&
              (!q || (p.name + " " + p.specialties.join(" ")).toLowerCase().includes(q.toLowerCase())))
            .map((p) => ({ provider: p, km: km(area.at, [p.lat, p.lng]) }))
            .filter((s) => maxKm === null || s.km <= maxKm)
            .sort((a, b) => a.km - b.km)
        : [],
    [all, area, type, q, maxKm],
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

      <section aria-labelledby="h-dir" className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 id="h-dir" className="text-2xl">Providers near you <span className="text-base font-normal text-muted">({list.length})</span></h2>
          <div className="flex gap-1 rounded-lg border border-line p-0.5" role="group" aria-label="View">
            {(["list", "map"] as const).map((v) => (
              <button key={v} type="button" aria-pressed={view === v} onClick={() => setView(v)}
                className={`rounded-md px-4 py-1.5 text-sm font-semibold transition-colors ${view === v ? "bg-primary text-white shadow-sm" : "text-muted hover:text-ink"}`}>
                {v === "list" ? "List" : "Map"}
              </button>
            ))}
          </div>
        </div>
        <div className="flex flex-wrap items-end gap-3 rounded-xl border border-line bg-surface p-3">
          <label className="text-sm">
            <span className="block font-semibold text-muted">Near</span>
            <select className="field w-auto" value={area?.code ?? ""} onChange={(e) => setPin(e.target.value)}>
              {areas.map((a) => <option key={a.code} value={a.code}>{a.city} {a.code}</option>)}
            </select>
          </label>
          <label className="text-sm">
            <span className="block font-semibold text-muted">Within</span>
            <select className="field w-auto" value={radius} onChange={(e) => setRadius(e.target.value)}>
              {["5", "10", "15", "25"].map((r) => <option key={r} value={r}>{r} km</option>)}
              <option value="any">Any distance</option>
            </select>
          </label>
          <label className="text-sm">
            <span className="block font-semibold text-muted">Type</span>
            <select className="field w-auto" value={type} onChange={(e) => setType(e.target.value)}>
              <option value="">All types</option>
              {Object.entries(TYPE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </label>
          <input className="field max-w-xs flex-1" placeholder="Search name or specialty" aria-label="Search" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        {error && <p className="text-attention">Could not load providers.</p>}
        {!all && <ListSkeleton />}
        {all && list.length === 0 && (
          <p className="text-muted">No provider within {maxKm} km. Try a larger distance, or ask the hospital for help.</p>
        )}
        {view === "map" && area && list.length > 0 && (
          <NearbyMap origin={area.at} radiusKm={maxKm} spots={list} activeId={active} onActive={setActive} />
        )}
        <div className={view === "map" ? "grid gap-3 sm:grid-cols-2 lg:grid-cols-3" : "grid gap-3 md:grid-cols-2"}>
          {list.map(({ provider: p, km: d }, i) => (
            <div key={p.id} onMouseEnter={() => setActive(p.id)} onMouseLeave={() => setActive(null)}
              className={`transition-all ${active === p.id ? "rounded-xl outline outline-2 outline-primary scale-[1.01]" : ""}`}>
              <ProviderCard p={p} rank={i + 1} reasons={[`${d.toFixed(1)} km from ${area.city} ${area.code}`]} compact={view === "map"} />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
