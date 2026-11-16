import { useMemo, useState } from "react";
import { LeafletMap } from "../../components/LeafletMap";
import { TYPE_LABEL } from "../../components/ProviderCard";
import { Badge, Card, ListSkeleton, PageHead } from "../../components/ui";
import { api } from "../../lib/api";
import { TYPE_COLOR } from "../../lib/geo";
import { useLang } from "../../lib/lang";
import { useQuery } from "../../lib/query";

/** Provider coverage for management: every provider, and a circle per pincode sized by the patients living there. */
export default function HospitalMap() {
  const { t } = useLang();
  const cov = useQuery("admin/coverage", api.coverage);
  const [type, setType] = useState("");
  const [active, setActive] = useState<number | null>(null);
  const d = cov.data;
  const pins = useMemo(() => (d?.providers ?? []).filter((p) => !type || p.type === type).map((p) => ({
    id: p.id, lat: p.lat, lng: p.lng, type: p.type, title: p.name, detail: `${TYPE_LABEL[p.type] ?? p.type}, ${p.city} ${p.pincode}`,
  })), [d, type]);
  const areas = useMemo(() => (d?.areas ?? []).filter((a) => a.at).map((a) => ({
    id: a.pincode, lat: a.at![0], lng: a.at![1], radius: 500 + a.patients * 350, color: a.providers ? "#02C39A" : "#dc2626",
    title: `${a.city} ${a.pincode}`, detail: `${a.patients} patient(s), ${a.providers} provider(s)`,
  })), [d]);
  const types = [...new Set((d?.providers ?? []).map((p) => p.type))];
  const gaps = (d?.areas ?? []).filter((a) => a.providers === 0);

  return (
    <div className="space-y-5">
      <PageHead title={t("hospitalMap")} text={t("hospitalMapIntro")} />
      {cov.error && <p role="alert" className="text-attention">{cov.error}</p>}
      {cov.loading && <ListSkeleton rows={3} />}
      {d && (
        <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_22rem]">
          <div className="space-y-3">
            <div className="flex flex-wrap gap-1.5" role="group" aria-label={t("fieldCategory")}>
              <button type="button" onClick={() => setType("")} aria-pressed={!type} className={`rounded-full border px-3 py-1 text-sm ${!type ? "border-primary bg-primary text-white" : "border-line bg-white text-text hover:border-primary/50"}`}>{t("everyone")}</button>
              {types.map((x) => (
                <button key={x} type="button" onClick={() => setType(x)} aria-pressed={type === x} className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm ${type === x ? "border-primary bg-primary text-white" : "border-line bg-white text-text hover:border-primary/50"}`}>
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: TYPE_COLOR[x] ?? "#05668D" }} /> {TYPE_LABEL[x] ?? x}
                </button>
              ))}
            </div>
            <LeafletMap pins={pins} areas={areas} activeId={active} onActive={setActive} className="h-[520px] lg:h-[620px]" label={t("hospitalMap")} />
            <p className="text-sm text-muted">Green circles: patients with providers in the same pincode. Red circles: patients with none. Circle size grows with the number of patients.</p>
          </div>
          <Card as="section" className="p-4" aria-label="Patients by area">
            <h2 className="mb-2 text-base">Patients by area</h2>
            <ul className="rule-list max-h-[560px] overflow-y-auto">
              {d.areas.map((a) => (
                <li key={a.pincode ?? a.city} className="flex items-center justify-between gap-2 py-2 text-sm">
                  <span><strong className="font-medium text-ink">{a.city}</strong> <span className="tnum text-muted">{a.pincode}</span></span>
                  <span className="flex items-center gap-2">
                    <span className="tnum">{a.patients}</span>
                    {a.providers === 0 ? <Badge tone="warn">{t("coverageGap")}</Badge> : <span className="tnum text-xs text-muted">{a.providers} prov.</span>}
                  </span>
                </li>
              ))}
            </ul>
            {gaps.length > 0 && <p className="mt-3 text-sm text-amber-800">{gaps.length} area(s) have patients and no provider on file.</p>}
          </Card>
        </div>
      )}
    </div>
  );
}
