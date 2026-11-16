import { useEffect, useRef, useState } from "react";
import { TYPE_COLOR } from "../lib/geo";
import { loadLeaflet, type LatLng, type Leaflet, type LGroup, type LMap, type LMarker } from "../lib/leaflet";

export interface MapPin {
  id: number;
  lat: number;
  lng: number;
  /** Short text inside the pin, for example the rank. */
  label?: string;
  type?: string;
  color?: string;
  /** Plain text shown in the popup. */
  title: string;
  detail?: string;
}

export interface MapArea {
  id: string;
  lat: number;
  lng: number;
  /** Circle radius in metres. */
  radius: number;
  color: string;
  title: string;
  detail?: string;
}

interface Props {
  pins: MapPin[];
  origin?: readonly [number, number] | null;
  originLabel?: string;
  areas?: MapArea[];
  radiusKm?: number | null;
  activeId?: number | null;
  onActive?: (id: number | null) => void;
  onPick?: (id: number) => void;
  className?: string;
  label: string;
}

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

function pinIcon(L: Leaflet, p: MapPin, active: boolean) {
  const color = p.color ?? TYPE_COLOR[p.type ?? ""] ?? "#05668D";
  const size = active ? 36 : 30;
  return L.divIcon({
    className: "",
    html: `<div class="cb-pin" style="background:${color};width:${size}px;height:${size}px"><span>${esc(p.label ?? "")}</span></div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size],
    popupAnchor: [0, -size],
  });
}

/**
 * A real street map (OpenStreetMap tiles through Leaflet 1.9). The map is created once; pins, areas and the
 * origin are redrawn in their own layer whenever they change, and the view fits everything shown.
 */
export function LeafletMap({ pins, origin, originLabel = "You", areas = [], radiusKm, activeId, onActive, onPick, className = "h-[420px]", label }: Props) {
  const box = useRef<HTMLDivElement>(null);
  const lib = useRef<Leaflet | null>(null);
  const map = useRef<LMap | null>(null);
  const layer = useRef<LGroup | null>(null);
  const markers = useRef(new Map<number, LMarker>());
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState<string | null>(null);
  const cb = useRef({ onActive, onPick });
  cb.current = { onActive, onPick };

  useEffect(() => {
    let alive = true;
    let t = 0;
    loadLeaflet().then((L) => {
      if (!alive || !box.current || map.current) return;
      lib.current = L;
      const m = L.map(box.current, { scrollWheelZoom: false, zoomControl: true, attributionControl: true });
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      }).addTo(m);
      m.setView([20.6, 78.9], 4); // India until the data arrives
      layer.current = L.layerGroup().addTo(m);
      map.current = m;
      // The map often mounts inside a panel that is still animating; measure again once it settles.
      t = window.setTimeout(() => m.invalidateSize(), 250);
      setReady(true);
    }).catch((e: Error) => alive && setFailed(e.message));
    return () => {
      alive = false;
      window.clearTimeout(t);
      map.current?.remove();
      map.current = null;
      layer.current = null;
    };
  }, []);

  useEffect(() => {
    const m = map.current, g = layer.current, L = lib.current;
    if (!m || !g || !L) return;
    g.clearLayers();
    markers.current.clear();
    const bounds: LatLng[] = [];
    for (const a of areas) {
      L.circle([a.lat, a.lng], { radius: a.radius, color: a.color, weight: 1.5, fillColor: a.color, fillOpacity: 0.16 })
        .bindTooltip(`<strong>${esc(a.title)}</strong>${a.detail ? `<br/>${esc(a.detail)}` : ""}`)
        .addTo(g);
      bounds.push([a.lat, a.lng]);
    }
    if (origin) {
      if (radiusKm) L.circle(origin as LatLng, { radius: radiusKm * 1000, color: "#05668D", weight: 1, dashArray: "6 6", fill: false }).addTo(g);
      L.marker(origin as LatLng, { icon: L.divIcon({ className: "", html: '<div class="cb-you"></div>', iconSize: [18, 18], iconAnchor: [9, 9] }), keyboard: false })
        .bindTooltip(esc(originLabel), { direction: "top", offset: [0, -10] })
        .addTo(g);
      bounds.push(origin as LatLng);
    }
    for (const p of pins) {
      const mk = L.marker([p.lat, p.lng], { icon: pinIcon(L, p, p.id === activeId), title: p.title, riseOnHover: true })
        .bindPopup(`<strong>${esc(p.title)}</strong>${p.detail ? `<br/>${esc(p.detail)}` : ""}`)
        .on("mouseover", () => cb.current.onActive?.(p.id))
        .on("mouseout", () => cb.current.onActive?.(null))
        .on("click", () => cb.current.onPick?.(p.id))
        .addTo(g);
      markers.current.set(p.id, mk);
      bounds.push([p.lat, p.lng]);
    }
    if (bounds.length === 1) m.setView(bounds[0], 14);
    else if (bounds.length > 1) m.fitBounds(L.latLngBounds(bounds), { padding: [36, 36], maxZoom: 15 });
    // activeId is handled below without refitting the view.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, pins, areas, origin?.[0], origin?.[1], radiusKm, originLabel]);

  useEffect(() => {
    const L = lib.current;
    if (!L) return;
    for (const p of pins) markers.current.get(p.id)?.setIcon(pinIcon(L, p, p.id === activeId));
    if (activeId != null) markers.current.get(activeId)?.setZIndexOffset(1000);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId]);

  return (
    <div className="relative">
      <div ref={box} className={`cb-map w-full bg-[#eef3f5] ${className}`} role="region" aria-label={label} />
      {!ready && (
        <p className="pointer-events-none absolute inset-0 grid place-items-center text-sm text-muted" role="status">
          {failed ?? "Loading map"}
        </p>
      )}
    </div>
  );
}
