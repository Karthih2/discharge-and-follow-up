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
  pharmacy: "#6B7280",
  physio: "var(--primary)",
  home_care: "#6B7280",
};

interface Props {
  origin: readonly [number, number];
  radiusKm: number | null;
  spots: Spot[];
  activeId: number | null;
  onActive: (id: number | null) => void;
}

export function NearbyMap({ origin, radiusKm, spots, activeId, onActive }: Props) {
  const W = 640, H = 440, cx = W / 2, cy = H / 2, R = 175;
  const reach = radiusKm ?? Math.max(1, ...spots.map((s) => s.km));
  const k = R / reach;
  const cosLat = Math.cos((origin[0] * Math.PI) / 180);
  const pos = (p: Provider) => ({
    x: cx + (p.lng - origin[1]) * 111.32 * cosLat * k,
    y: cy - (p.lat - origin[0]) * 110.57 * k,
  });
  const types = [...new Set(spots.map((s) => s.provider.type))];

  return (
    <div className="space-y-3">
      <svg viewBox={`0 0 ${W} ${H}`} className="nearby-map w-full rounded-xl border border-line bg-surface" role="img"
        aria-label={`Schematic map of ${spots.length} providers near the chosen area`}>
        <defs>
          <radialGradient id="map-bg" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.03" />
            <stop offset="100%" stopColor="var(--primary)" stopOpacity="0" />
          </radialGradient>
          <filter id="pin-shadow">
            <feDropShadow dx="0" dy="1" stdDeviation="2" floodOpacity="0.2" />
          </filter>
        </defs>
        <circle cx={cx} cy={cy} r={R + 20} fill="url(#map-bg)" />
        {[0.25, 0.5, 0.75, 1].map((f) => (
          <circle key={f} cx={cx} cy={cy} r={R * f} fill="none" stroke="var(--line)" strokeWidth={f === 1 ? "2" : "1"} strokeDasharray={f === 1 ? "0" : "6 8"} opacity={f === 1 ? 0.6 : 0.4} />
        ))}
        <line x1={cx - R - 10} x2={cx + R + 10} y1={cy} y2={cy} stroke="var(--line)" strokeWidth="1" opacity="0.3" />
        <line y1={cy - R - 10} y2={cy + R + 10} x1={cx} x2={cx} stroke="var(--line)" strokeWidth="1" opacity="0.3" />
        <text x={cx + R * 0.5 + 6} y={cy - 6} fontSize="11" fill="var(--muted)" fontWeight="500">{(reach * 0.5).toFixed(0)} km</text>
        <text x={cx + R + 6} y={cy - 6} fontSize="11" fill="var(--muted)" fontWeight="500">{reach.toFixed(0)} km</text>
        <text x={cx} y={20} textAnchor="middle" fontSize="12" fill="var(--muted)" fontWeight="600">N</text>
        <polygon points={`${cx},10 ${cx - 4},18 ${cx + 4},18`} fill="var(--muted)" />

        {/* You marker */}
        <circle cx={cx} cy={cy} r="18" fill="var(--primary)" opacity="0.12" />
        <circle cx={cx} cy={cy} r="10" fill="var(--primary)" />
        <circle cx={cx} cy={cy} r="4" fill="var(--surface)" />
        <text x={cx} y={cy + 30} textAnchor="middle" fontSize="12" fontWeight="600" fill="var(--primary)">You</text>

        {/* Provider pins */}
        {spots.map(({ provider: p, km: d }) => {
          const { x, y } = pos(p);
          const on = activeId === p.id;
          const color = COLOR[p.type] ?? "var(--primary)";
          return (
            <g key={p.id} tabIndex={0} role="button" style={{ cursor: "pointer" }}
              aria-label={`${p.name}, ${TYPE_LABEL[p.type] ?? p.type}, ${d.toFixed(1)} kilometres`}
              onMouseEnter={() => onActive(p.id)} onMouseLeave={() => onActive(null)}
              onFocus={() => onActive(p.id)} onBlur={() => onActive(null)}>
              {/* Pin drop shape */}
              <g filter="url(#pin-shadow)">
                <path d={`M${x} ${y} c -10 -14 -10 -26 0 -26 s 10 12 0 26z`} fill={color} opacity={on ? 1 : 0.85} />
                <circle cx={x} cy={y - 18} r="4" fill="var(--surface)" />
              </g>
              {on && (
                <g>
                  <rect x={x - 80} y={y - 56} width="160" height="30" rx="6" fill="var(--ink)" opacity="0.92" />
                  <polygon points={`${x - 5},${y - 26} ${x + 5},${y - 26} ${x},${y - 20}`} fill="var(--ink)" opacity="0.92" />
                  <text x={x} y={y - 43} textAnchor="middle" fontSize="11" fontWeight="600" fill="var(--surface)">
                    {p.name.length > 22 ? p.name.slice(0, 20) + "…" : p.name}
                  </text>
                  <text x={x} y={y - 31} textAnchor="middle" fontSize="10" fill="var(--surface)" opacity="0.75">
                    {TYPE_LABEL[p.type] ?? p.type} · {d.toFixed(1)} km
                  </text>
                </g>
              )}
            </g>
          );
        })}
      </svg>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-1 px-1 text-sm text-muted">
        {types.map((t) => (
          <span key={t} className="flex items-center gap-1.5">
            <span className="inline-block h-3 w-3 rounded-full" style={{ background: COLOR[t] ?? "var(--primary)" }} />
            {TYPE_LABEL[t] ?? t}
          </span>
        ))}
        <span className="ml-auto text-xs">Rings show distance · Schematic, not to scale</span>
      </div>
    </div>
  );
}
