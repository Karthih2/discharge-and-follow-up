import { useReducedMotion } from "motion/react";
import { useCallback, useEffect, useState } from "react";

/** Returns a transition builder that collapses to instant when the user prefers reduced motion. */
export function useMotionT() {
  const reduce = useReducedMotion();
  return useCallback(
    (duration: number, delay = 0) => (reduce ? { duration: 0 } : { duration, delay, ease: "easeOut" as const }),
    [reduce],
  );
}

export const fmtDate = (iso: string, opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", year: "numeric" }) =>
  new Date(iso.length === 10 ? iso + "T00:00:00" : iso).toLocaleDateString("en-IN", opts);

export const fmtTime = (iso: string) =>
  new Date(iso).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", hour12: true });

// Lists reveal with a short staggered fade and rise the first time they appear, not on every refresh.
const revealed = new Set<string>();

export function useStagger(id: string) {
  const mt = useMotionT();
  const [fresh] = useState(() => !revealed.has(id));
  useEffect(() => {
    revealed.add(id);
  }, [id]);
  return (i: number) => ({
    initial: fresh ? { opacity: 0, y: 8 } : false,
    animate: { opacity: 1, y: 0 },
    transition: mt(0.18, Math.min(i, 10) * 0.04),
  });
}

/** "3 h", "2 d": how long ago, for queues. */
export function ago(hours: number): string {
  if (hours < 1) return "under 1 h";
  if (hours < 48) return `${Math.round(hours)} h`;
  return `${Math.round(hours / 24)} d`;
}
