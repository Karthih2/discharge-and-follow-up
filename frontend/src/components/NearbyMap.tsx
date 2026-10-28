import type { Provider } from "../lib/types";
import { TYPE_LABEL } from "./ProviderCard";

export interface Spot {
  provider: Provider;
  km: number;
}

const COLOR: Record<string, string> = {
  hospital: "var(--attention)",
  clinic: "var(--primary)",
  lab: "var(--ink)",
  pharmacy: "var(--muted)",
  physio: "var(--primary)",
  home_care: "var(--muted)",
};

interface Props {
  origin: readonly [number, number];
  radiusKm: number | null;
  spots: Spot[];
  activeId: number | null;
  onActive: (id: number | null) => void;
}

/** Schematic map: you in the centre, a ring at the chosen radius, one pin per nearby provider. Not to scale. */
export function NearbyMap({ origin, radiusKm, spots, activeId, onActive }: Props) {
  const W = 640, H = 420, cx = W / 2, cy = H / 2, R = 170;
  // Scale: the ring (or the farthest pin when "any distance") fills the radius R.
  const reach = radiusKm ?? Math.max(1, ...spots.map((s) => s.km));
  const k = R / reach;
  const cosLat = Math.cos((origin[0] * Math.PI) / 180);
  const pos = (p: Provider) => ({
    x: cx + (p.lng - origin[1]) * 111.32 * cosLat * k,
    y: cy - (p.lat - origin[0]) * 110.57 * k,
  });
  const types = [...new Set(spots.map((s) => s.provider.type))];

  return (
    <div className="space-y-2">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full rounded-md border border-line bg-bg" role="img"
        aria-label={`Schematic map of ${spots.length} providers near the chosen area`}>
        {[0.25, 0.5, 0.75, 1].map((f) => (
          <circle key={f} cx={cx} cy={cy} r={R * f} fill="none" stroke="var(--line)" strokeWidth="1.5" strokeDasharray={f === 1 ? "0" : "4 6"} />
        ))}
        <line x1={cx - R - 20} x2={cx + R + 20} y1={cy} y2={cy} stroke="var(--line)" />
        <line y1={cy - R - 20} y2={cy + R + 20} x1={cx} x2={cx} stroke="var(--line)" />
        <text x={cx + R * 0.5 + 4} y={cy - 4} fontSize="11" fill="var(--muted)">{(reach * 0.5).toFixed(0)} km</text>
        <text x={cx + R + 4} y={cy - 4} fontSize="11" fill="var(--muted)">{reach.toFixed(0)} km</text>
        <text x={cx} y={18} textAnchor="middle" fontSize="11" fill="var(--muted)">N</text>
        <circle cx={cx} cy={cy} r="9" fill="var(--primary)" />
        <circle cx={cx} cy={cy} r="16" fill="none" stroke="var(--primary)" strokeWidth="2" />
        <text x={cx} y={cy + 32} textAnchor="middle" fontSize="12" fill="var(--muted)">You</text>
        {spots.map(({ provider: p, km }) => {
          const { x, y } = pos(p);
          const on = activeId === p.id;
          return (
            <g key={p.id} tabIndex={0} role="button" style={{ cursor: "pointer" }}
              aria-label={`${p.name}, ${TYPE_LABEL[p.type] ?? p.type}, ${km.toFixed(1)} kilometres`}
              onMouseEnter={() => onActive(p.id)} onMouseLeave={() => onActive(null)}
              onFocus={() => onActive(p.id)} onBlur={() => onActive(null)}>
              <circle cx={x} cy={y} r={on ? 11 : 7} fill={COLOR[p.type] ?? "var(--primary)"} stroke="var(--surface)" strokeWidth="2" />
              {on && (
                <text x={x} y={y - 16} textAnchor="middle" fontSize="12" fontWeight="600" fill="var(--ink)">
                  {p.name} · {km.toFixed(1)} km
                </text>
              )}
            </g>
          );
        })}
      </svg>
      <ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted" aria-label="Legend">
        {types.map((t) => (
          <li key={t} className="flex items-center gap-1.5">
            <span className="inline-block h-3 w-3 rounded-full" style={{ background: COLOR[t] ?? "var(--primary)" }} />
            {TYPE_LABEL[t] ?? t}
          </li>
        ))}
        <li>Rings show distance. Schematic, not to scale.</li>
      </ul>
    </div>
  );
}
