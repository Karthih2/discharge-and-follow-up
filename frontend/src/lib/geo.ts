/** Straight-line distance in kilometres between two [lat, lng] points (haversine). */
export const km = (a: readonly number[], b: readonly number[]) => {
  const r = Math.PI / 180;
  const h = Math.sin(((b[0] - a[0]) * r) / 2) ** 2 + Math.cos(a[0] * r) * Math.cos(b[0] * r) * Math.sin(((b[1] - a[1]) * r) / 2) ** 2;
  return 12742 * Math.asin(Math.sqrt(h));
};

/** Mean point of a set of [lat, lng] points. */
export const centre = (pts: readonly (readonly number[])[]): [number, number] | null =>
  pts.length ? [pts.reduce((t, p) => t + p[0], 0) / pts.length, pts.reduce((t, p) => t + p[1], 0) / pts.length] : null;

/** One colour per provider type. Red stays reserved for warnings, so hospitals use Baltic. */
export const TYPE_COLOR: Record<string, string> = {
  hospital: "#05668D",
  clinic: "#028090",
  lab: "#0a2540",
  pharmacy: "#00A896",
  physio: "#3b7f9e",
  home_care: "#5b6b7f",
  blood_bank: "#9a3b3b",
};
