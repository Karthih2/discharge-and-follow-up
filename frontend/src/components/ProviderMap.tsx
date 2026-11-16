import { MapPin, Navigation } from "lucide-react";
import { useMemo, useState } from "react";
import { api } from "../lib/api";
import { centre, km } from "../lib/geo";
import { useLang } from "../lib/lang";
import { useQuery } from "../lib/query";
import type { Match } from "../lib/types";
import { LeafletMap } from "./LeafletMap";
import { ProviderCard, TYPE_LABEL } from "./ProviderCard";
import { Button } from "./ui";

interface Props {
  itemId: number;
  pincode: string;
  matches: Match[];
  canSelect: boolean;
  onChanged: () => void;
}

/**
 * Suggested providers for one plan line on a real map. The starting point is the patient's own location when they
 * share it, otherwise the centre of the providers listed under their pincode, otherwise the centre of the suggestions.
 */
export function ProviderMap({ itemId, pincode, matches, canSelect, onChanged }: Props) {
  const { t } = useLang();
  const all = useQuery("providers", api.providers);
  const home = useMemo(() => centre((all.data ?? []).filter((p) => p.pincode === pincode).map((p) => [p.lat, p.lng])), [all.data, pincode]);
  const fallback = useMemo(() => centre(matches.map((m) => [m.provider.lat, m.provider.lng])), [matches]);
  const [gps, setGps] = useState<[number, number] | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [hover, setHover] = useState<number | null>(null);
  const origin = gps ?? home ?? fallback;

  const ranked = useMemo(
    () => (origin ? [...matches].sort((a, b) => km(origin, [a.provider.lat, a.provider.lng]) - km(origin, [b.provider.lat, b.provider.lng])) : matches).slice(0, 5),
    [matches, origin],
  );
  const pins = useMemo(() => ranked.map((m, i) => ({
    id: m.provider.id, lat: m.provider.lat, lng: m.provider.lng, label: String(i + 1), type: m.provider.type,
    color: m.selected ? "#0a2540" : undefined, title: m.provider.name,
    detail: `${TYPE_LABEL[m.provider.type] ?? m.provider.type}${origin ? `, ${km(origin, [m.provider.lat, m.provider.lng]).toFixed(1)} km` : ""}`,
  })), [ranked, origin]);

  const useGps = () => {
    if (!navigator.geolocation) { setNote("This browser cannot share a location."); return; }
    navigator.geolocation.getCurrentPosition(
      (p) => { setGps([p.coords.latitude, p.coords.longitude]); setNote("Using your location for this search only. It is not saved."); },
      () => setNote("Location is off. Distances are from your pincode instead."),
    );
  };
  const pick = async (id: number) => {
    await api.pickProvider(itemId, id);
    onChanged();
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted">{gps ? "Distances from your location." : `Distances from pincode ${pincode}.`}</p>
        <Button look="quiet" small onClick={useGps}><Navigation size={16} aria-hidden /> Use my location</Button>
      </div>
      {note && <p role="status" className="text-sm text-muted">{note}</p>}
      <LeafletMap pins={pins} origin={origin} originLabel={gps ? "You" : `Pincode ${pincode}`} activeId={hover} onActive={setHover}
        onPick={canSelect ? pick : undefined} className="h-[300px] sm:h-[340px]" label="Map of suggested providers" />
      <p className="text-sm text-muted">{t("suggestionOnly")}</p>
      <div className="grid gap-3 md:grid-cols-2">
        {ranked.map((m, i) => (
          <div key={m.provider.id} onMouseEnter={() => setHover(m.provider.id)} onMouseLeave={() => setHover(null)}
            className={m.selected ? "rounded-card outline outline-2 outline-primary" : ""}>
            <ProviderCard p={m.provider} reasons={[...m.reasons, ...(origin ? [`${km(origin, [m.provider.lat, m.provider.lng]).toFixed(1)} km away`] : [])]} rank={i + 1} />
            {canSelect && (
              <Button look="quiet" small className="mt-1" disabled={m.selected} onClick={() => pick(m.provider.id)}>
                <MapPin size={16} aria-hidden /> {m.selected ? t("selected") : t("selectProvider")}
              </Button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
