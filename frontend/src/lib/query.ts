import { useCallback, useEffect, useRef, useState } from "react";

// Small in-memory store. A screen asks for data by key. A cached answer shows at once and is
// refreshed in the background. Saving something calls invalidate(prefix) to refetch what it changed.
const cache = new Map<string, unknown>();
const inflight = new Map<string, Promise<unknown>>();
const listeners = new Set<(prefix: string) => void>();

export function invalidate(prefix: string) {
  for (const k of cache.keys()) if (k.startsWith(prefix)) cache.delete(k);
  listeners.forEach((l) => l(prefix));
}

export const clearCache = () => cache.clear();

export function useQuery<T>(key: string | null, fn: () => Promise<T>) {
  const [state, setState] = useState<{ data: T | null; error: string | null }>({
    data: key && cache.has(key) ? (cache.get(key) as T) : null,
    error: null,
  });
  const fnRef = useRef(fn);
  fnRef.current = fn;

  const run = useCallback(() => {
    if (!key) return () => undefined;
    let live = true;
    const p = (inflight.get(key) as Promise<T> | undefined) ?? fnRef.current();
    inflight.set(key, p);
    p.then((d) => {
      cache.set(key, d);
      if (live) setState({ data: d, error: null });
    })
      .catch((e: Error) => live && setState((s) => ({ data: s.data, error: e.message })))
      .finally(() => inflight.delete(key));
    return () => {
      live = false;
    };
  }, [key]);

  useEffect(() => {
    // A key we have not seen: drop the old screen's data so it never flashes under a new filter.
    setState({ data: key && cache.has(key) ? (cache.get(key) as T) : null, error: null });
    return run();
  }, [run, key]);

  useEffect(() => {
    const on = (prefix: string) => key?.startsWith(prefix) && run();
    listeners.add(on);
    return () => void listeners.delete(on);
  }, [key, run]);

  const reload = useCallback(() => {
    if (key) invalidate(key);
  }, [key]);
  return { data: state.data, error: state.error, loading: state.data === null && !state.error, reload };
}

/** Value that settles after the user stops typing. */
export function useDebounced<T>(value: T, ms = 250): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const id = window.setTimeout(() => setV(value), ms);
    return () => window.clearTimeout(id);
  }, [value, ms]);
  return v;
}

// Come back to the tab and everything on screen refreshes, so a plan another person just changed shows up.
if (typeof window !== "undefined") {
  window.addEventListener("focus", () => listeners.forEach((l) => l("")));
  document.addEventListener("visibilitychange", () => { if (!document.hidden) listeners.forEach((l) => l("")); });
}
