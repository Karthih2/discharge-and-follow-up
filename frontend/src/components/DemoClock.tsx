import { CalendarBlank } from "@phosphor-icons/react";
import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { fmtDate } from "../lib/motion";
import { Button } from ".//ui";

/** Demo control: moves the simulated "today" so escalation can be shown. */
export function DemoClock({ stack = false }: { stack?: boolean }) {
  const [today, setToday] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const load = () => api.clock().then((c) => setToday(c.today)).catch(() => setToday(null));
    load();
    window.addEventListener("cb-clock", load);
    return () => window.removeEventListener("cb-clock", load);
  }, []);

  const move = async (body: { days?: number; date?: string }) => {
    setBusy(true);
    try {
      const c = await api.moveClock(body);
      setToday(c.today);
      window.dispatchEvent(new Event("cb-plan-refresh"));
    } finally {
      setBusy(false);
    }
  };

  if (!today) return null;
  return (
    <div className={`flex gap-2 rounded-sm border border-line px-2 py-1 text-sm ${stack ? "flex-col items-stretch" : "flex-wrap items-center"}`} aria-label="Demo clock">
      <CalendarBlank size={18} aria-hidden />
      <span>
        Demo date: <strong>{fmtDate(today, { day: "numeric", month: "short" })}</strong>
      </span>
      <Button disabled={busy} onClick={() => move({ days: 1 })} look="quiet" small>+1 day</Button>
      <Button disabled={busy} onClick={() => move({ days: 3 })} look="quiet" small>+3 days</Button>
      <Button disabled={busy} onClick={() => move({ date: "2026-10-12" })} look="quiet" small>Reset</Button>
    </div>
  );
}
