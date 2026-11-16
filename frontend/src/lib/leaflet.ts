/**
 * Leaflet 1.9.4 from the unpkg CDN, loaded once on first use and checked with Subresource Integrity.
 * Loading it at runtime keeps the app free of a build-time map dependency; only screens with a map pay for it.
 */
const VERSION = "1.9.4";
const CSS = { href: `https://unpkg.com/leaflet@${VERSION}/dist/leaflet.css`, integrity: "sha512-Zcn6bjR/8RZbLEpLIeOwNtzREBAJnUKESxces60Mpoj+2okopSAcSUIUOseddDm0cxnGQzxIR7vJgsLZbdLE3w==" };
const JS = { src: `https://unpkg.com/leaflet@${VERSION}/dist/leaflet.js`, integrity: "sha512-BwHfrr4c9kmRkLw6iXFdzcdWV/PGkVgiIyIWLLlTSXzWQzxuSg4DiQUCpauz/EWjgk5TYQqX/kvn9pG1NpYfqg==" };

export type LatLng = [number, number];
/** The small part of the Leaflet API this app uses. */
export interface LMarker { setIcon(i: unknown): LMarker; setZIndexOffset(n: number): LMarker; bindPopup(html: string): LMarker; bindTooltip(html: string, o?: object): LMarker; on(ev: string, fn: () => void): LMarker; addTo(t: unknown): LMarker }
export interface LLayer { bindTooltip(html: string, o?: object): LLayer; addTo(t: unknown): LLayer }
export interface LGroup { clearLayers(): LGroup; addTo(m: LMap): LGroup }
export interface LMap { setView(c: LatLng, z: number): LMap; fitBounds(b: unknown, o?: object): LMap; invalidateSize(): LMap; remove(): void }
export interface Leaflet {
  map(el: HTMLElement, o?: object): LMap;
  tileLayer(url: string, o?: object): { addTo(m: LMap): unknown };
  layerGroup(): LGroup;
  marker(p: LatLng, o?: object): LMarker;
  circle(p: LatLng, o?: object): LLayer;
  divIcon(o: object): unknown;
  latLngBounds(p: LatLng[]): unknown;
}

let pending: Promise<Leaflet> | null = null;

export function loadLeaflet(): Promise<Leaflet> {
  const w = window as unknown as { L?: Leaflet };
  if (w.L) return Promise.resolve(w.L);
  if (pending) return pending;
  pending = new Promise<Leaflet>((resolve, reject) => {
    if (!document.querySelector(`link[href="${CSS.href}"]`)) {
      const l = document.createElement("link");
      l.rel = "stylesheet";
      l.href = CSS.href;
      l.integrity = CSS.integrity;
      l.crossOrigin = "";
      document.head.appendChild(l);
    }
    const s = document.createElement("script");
    s.src = JS.src;
    s.integrity = JS.integrity;
    s.crossOrigin = "";
    s.async = true;
    s.onload = () => (w.L ? resolve(w.L) : reject(new Error("Leaflet did not start")));
    s.onerror = () => { pending = null; reject(new Error("The map could not load. Check the internet connection.")); };
    document.head.appendChild(s);
  });
  return pending;
}
