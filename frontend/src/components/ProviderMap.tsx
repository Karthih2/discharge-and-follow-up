import { MapPin, NavigationArrow } from "@phosphor-icons/react";
import { motion } from "motion/react";
import { useMemo, useState } from "react";
import { api } from "../lib/api";
import { useLang } from "../lib/lang";
import { useMotionT } from "../lib/motion";
import type { Match } from "../lib/types";
import { ProviderCard } from "./ProviderCard";

// Known areas for the synthetic pincodes: state, district, area, centre.
const AREAS = [
  { state: "Tamil Nadu", district: "Chennai", area: "T. Nagar", pin: "600017", at: [13.0418, 80.2341] },
  { state: "Tamil Nadu", district: "Chennai", area: "Adyar", pin: "600020", at: [13.0012, 80.2565] },
  { state: "Tamil Nadu", district: "Chennai", area: "Anna Nagar", pin: "600040", at: [13.085, 80.2101] },
  { state: "Tamil Nadu", district: "Chennai", area: "Velachery", pin: "600042", at: [12.9815, 80.218] },
  { state: "Tamil Nadu", district: "Chennai", area: "Mylapore", pin: "600004", at: [13.0368, 80.2676] },
  { state: "Delhi", district: "New Delhi", area: "Connaught Place", pin: "110001", at: [28.6315, 77.2167] },
  { state: "Delhi", district: "New Delhi", area: "Lajpat Nagar", pin: "110024", at: [28.5677, 77.2433] },
  { state: "Delhi", district: "New Delhi", area: "Dwarka", pin: "110075", at: [28.5921, 77.046] },
  { state: "Delhi", district: "New Delhi", area: "Saket", pin: "110017", at: [28.5245, 77.2066] },
] as const;

const km = (a: readonly number[], b: readonly number[]) => {
  const r = Math.PI / 180;
  const h = Math.sin(((b[0] - a[0]) * r) / 2) ** 2 + Math.cos(a[0] * r) * Math.cos(b[0] * r) * Math.sin(((b[1] - a[1]) * r) / 2) ** 2;
  return 12742 * Math.asin(Math.sqrt(h));
};

interface Props {
  itemId: number;
  pincode: string;
  matches: Match[];
  canSelect: boolean;
  onChanged: () => void;
}

/** Schematic map: pins for 3 to 5 suggested providers. Not to scale, no live tracking. */
export function ProviderMap({ itemId, pincode, matches, canSelect, onChanged }: Props) {
  const { t } = useLang();
  const mt = useMotionT();
  const start = AREAS.find((a) => a.pin === pincode) ?? AREAS[0];
  const [origin, setOrigin] = useState<readonly number[]>(start.at);
  const [state, setState] = useState<string>(start.state);
  const [area, setArea] = useState<string>(start.pin);
  const [hover, setHover] = useState<number | null>(null);
  const [note, setNote] = useState<string | null>(null);

  const ranked = useMemo(
    () => [...matches].sort((a, b) => km(origin, [a.provider.lat, a.provider.lng]) - km(origin, [b.provider.lat, b.provider.lng])).slice(0, 5),
    [matches, origin],
  );
  const pts = [origin, ...ranked.map((m) => [m.provider.lat, m.provider.lng])];
  const lat = pts.map((p) => p[0]), lng = pts.map((p) => p[1]);
  const [minLat, maxLat, minLng, maxLng] = [Math.min(...lat), Math.max(...lat), Math.min(...lng), Math.max(...lng)];
  const W = 560, H = 300, pad = 46;
  const x = (v: number) => pad + ((v - minLng) / (maxLng - minLng || 1)) * (W - pad * 2);
  const y = (v: number) => H - pad - ((v - minLat) / (maxLat - minLat || 1)) * (H - pad * 2);

  const useGps = () =>
    navigator.geolocation?.getCurrentPosition(
      (p) => {
        setOrigin([p.coords.latitude, p.coords.longitude]);
        setNote("Using your location for this search only. It is not saved.");
      },
      () => setNote("Location is off. Choose your area instead."),
    );

  const pick = async (id: number) => {
    await api.pickProvider(itemId, id);
    onChanged();
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end gap-2">
        <label className="text-sm">
          <span className="block font-semibold">State</span>
          <select className="field w-auto py-1" value={state} onChange={(e) => {
            setState(e.target.value);
            const a = AREAS.find((r) => r.state === e.target.value)!;
            setArea(a.pin);
            setOrigin(a.at);
          }}>
            {[...new Set(AREAS.map((a) => a.state))].map((s) => <option key={s}>{s}</option>)}
          </select>
        </label>
        <label className="text-sm">
          <span className="block font-semibold">Area</span>
          <select className="field w-auto py-1" value={area} onChange={(e) => {
            setArea(e.target.value);
            setOrigin(AREAS.find((a) => a.pin === e.target.value)!.at);
            setNote(null);
          }}>
            {AREAS.filter((a) => a.state === state).map((a) => <option key={a.pin} value={a.pin}>{a.area} {a.pin}</option>)}
          </select>
        </label>
        <button className="btn btn-quiet btn-sm" onClick={useGps}>
          <NavigationArrow size={16} weight="duotone" aria-hidden /> Use my location
        </button>
      </div>
      {note && <p role="status" className="text-sm text-muted">{note}</p>}

      <svg viewBox={`0 0 ${W} ${H}`} className="w-full rounded-md border border-line bg-bg" role="img" aria-label="Schematic map of suggested providers">
        {[0.2, 0.4, 0.6, 0.8].map((f) => (
          <g key={f} stroke="var(--line)" strokeWidth="1.5" fill="none">
            <path d={`M0 ${H * f} C ${W * 0.3} ${H * f + 30}, ${W * 0.6} ${H * f - 30}, ${W} ${H * f}`} />
            <path d={`M${W * f} 0 C ${W * f + 30} ${H * 0.3}, ${W * f - 30} ${H * 0.6}, ${W * f} ${H}`} />
          </g>
        ))}
        <circle cx={x(origin[1])} cy={y(origin[0])} r="9" fill="var(--primary)" />
        <circle cx={x(origin[1])} cy={y(origin[0])} r="16" fill="none" stroke="var(--primary)" strokeWidth="2" />
        <text x={x(origin[1])} y={y(origin[0]) + 32} textAnchor="middle" fontSize="12" fill="var(--muted)">You</text>
        {ranked.map((m, i) => {
          const px = x(m.provider.lng), py = y(m.provider.lat);
          const on = hover === m.provider.id || m.selected;
          return (
            <motion.g
              key={m.provider.id}
              initial={{ y: -30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ ...mt(0.45, i * 0.09), type: "spring", stiffness: 260, damping: 18 }}
              onMouseEnter={() => setHover(m.provider.id)}
              onMouseLeave={() => setHover(null)}
              onFocus={() => setHover(m.provider.id)}
              tabIndex={0}
              role="button"
              aria-label={`${m.provider.name}, ${km(origin, [m.provider.lat, m.provider.lng]).toFixed(1)} kilometres`}
              style={{ cursor: "pointer" }}
              onClick={() => canSelect && pick(m.provider.id)}
            >
              <path d={`M${px} ${py} c -14 -18 -14 -34 0 -34 s 14 16 0 34z`} fill={on ? "var(--attention)" : "var(--primary)"} />
              <circle cx={px} cy={py - 24} r="5" fill="var(--surface)" />
              <text x={px} y={py + 14} textAnchor="middle" fontSize="12" fontWeight="600" fill="var(--ink)">{i + 1}</text>
            </motion.g>
          );
        })}
      </svg>
      <p className="text-sm text-muted">{t("suggestionOnly")} Schematic map, not to scale.</p>

      <div className="grid gap-3 md:grid-cols-2">
        {ranked.map((m, i) => (
          <div key={m.provider.id} onMouseEnter={() => setHover(m.provider.id)} onMouseLeave={() => setHover(null)}
            className={m.selected ? "rounded-md outline outline-2 outline-primary" : ""}>
            <ProviderCard p={m.provider} reasons={[...m.reasons, `${km(origin, [m.provider.lat, m.provider.lng]).toFixed(1)} km from the chosen spot`]} rank={i + 1} />
            {canSelect && (
              <button className="btn btn-quiet btn-sm mt-1" disabled={m.selected} onClick={() => pick(m.provider.id)}>
                <MapPin size={16} weight="duotone" aria-hidden /> {m.selected ? t("selected") : t("selectProvider")}
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
