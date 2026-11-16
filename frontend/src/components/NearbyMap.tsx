import { useMemo } from "react";
import { TYPE_COLOR } from "../lib/geo";
import type { Provider } from "../lib/types";
import { LeafletMap } from "./LeafletMap";
import { TYPE_LABEL } from "./ProviderCard";

export interface Spot {
  provider: Provider;
  km: number;
}

interface Props {
  origin: readonly [number, number];
  radiusKm: number | null;
  spots: Spot[];
  activeId: number | null;
  onActive: (id: number | null) => void;
}

/** Providers near the chosen area on a real map, with the search radius drawn around the area centre. */
export function NearbyMap({ origin, radiusKm, spots, activeId, onActive }: Props) {
  const pins = useMemo(() => spots.map(({ provider: p, km }, i) => ({
    id: p.id, lat: p.lat, lng: p.lng, label: String(i + 1), type: p.type,
    title: p.name, detail: `${TYPE_LABEL[p.type] ?? p.type}, ${km.toFixed(1)} km`,
  })), [spots]);
  const types = [...new Set(spots.map((s) => s.provider.type))];
  return (
    <div className="space-y-2">
      <LeafletMap pins={pins} origin={origin} originLabel="Area centre" radiusKm={radiusKm} activeId={activeId} onActive={onActive}
        className="h-[360px] sm:h-[460px]" label={`Map of ${spots.length} providers near the chosen area`} />
      <div className="flex flex-wrap items-center gap-x-5 gap-y-1 px-1 text-sm text-muted">
        {types.map((t) => (
          <span key={t} className="flex items-center gap-1.5">
            <span className="inline-block h-3 w-3 rounded-full" style={{ background: TYPE_COLOR[t] ?? "#05668D" }} />
            {TYPE_LABEL[t] ?? t}
          </span>
        ))}
        <span className="ml-auto text-xs">Dashed ring: search distance. Distances are straight-line.</span>
      </div>
    </div>
  );
}
