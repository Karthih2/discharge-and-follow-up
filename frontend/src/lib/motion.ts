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

/** Small async loader: data, error, reload. Keeps old data while reloading. */
export function useLoad<T>(fn: () => Promise<T>, deps: unknown[]) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  useEffect(() => {
    let live = true;
    fn()
      .then((d) => live && (setData(d), setError(null)))
      .catch((e: Error) => live && setError(e.message));
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick]);
  const reload = useCallback(() => setTick((n) => n + 1), []);
  return { data, error, reload, setData };
}

export const fmtDate = (iso: string, opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", year: "numeric" }) =>
  new Date(iso.length === 10 ? iso + "T00:00:00" : iso).toLocaleDateString("en-IN", opts);

export const fmtTime = (iso: string) =>
  new Date(iso).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", hour12: true });
