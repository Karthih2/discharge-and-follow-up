import { ChevronLeft, ChevronRight } from "lucide-react";
import { m as motion } from "motion/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Badge, Button, Card, EmptyState, PageHead } from "../../components/ui";
import { api } from "../../lib/api";
import { useLang } from "../../lib/lang";
import { useStagger } from "../../lib/motion";
import { useQuery } from "../../lib/query";
import type { DoctorCalEvent } from "../../lib/types";

const DAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

function pad(n: number) {
  return n < 10 ? `0${n}` : String(n);
}

function dayKey(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function buildGrid(year: number, month: number) {
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  const startDay = (first.getDay() + 6) % 7;
  const days: (number | null)[] = Array(startDay).fill(null);
  for (let d = 1; d <= last.getDate(); d++) days.push(d);
  while (days.length % 7) days.push(null);
  return days;
}

function eventsByDay(events: DoctorCalEvent[]) {
  const map: Record<string, DoctorCalEvent[]> = {};
  for (const e of events) {
    const d = e.due_at.slice(0, 10);
    (map[d] ??= []).push(e);
  }
  return map;
}

function formatTime(iso: string) {
  const d = new Date(iso);
  const h = d.getHours();
  const m = d.getMinutes();
  return `${h}:${pad(m)}`;
}

const CAT_COLORS: Record<string, string> = {
  medication: "bg-secondary/20 text-ink",
  appointment: "bg-primary/20 text-ink",
  test: "bg-attention/10 text-attention",
  followup: "bg-primary/30 text-ink",
};

export default function DoctorCalendar() {
  const { t } = useLang();
  const rise = useStagger("doctor-cal");
  const [cursor, setCursor] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });
  const [selected, setSelected] = useState<string | null>(null);

  const mk = `${cursor.year}-${pad(cursor.month + 1)}`;
  const cal = useQuery(`doctor/calendar/${mk}`, () => api.doctorCalendar(mk));
  const today = cal.data?.today ?? dayKey(new Date());

  const grid = useMemo(() => buildGrid(cursor.year, cursor.month), [cursor.year, cursor.month]);
  const byDay = useMemo(() => eventsByDay(cal.data?.events ?? []), [cal.data]);

  // Open on the server's today (the hospital clock), not the browser's, until the doctor moves months.
  const moved = useRef(false);
  useEffect(() => {
    if (moved.current || !cal.data?.today) return;
    const [y, m] = cal.data.today.split("-").map(Number);
    if (y !== cursor.year || m - 1 !== cursor.month) setCursor({ year: y, month: m - 1 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cal.data?.today]);
  const go = (d: number) => {
    moved.current = true;
    setSelected(null);
    setCursor((c) => {
      const n = new Date(c.year, c.month + d, 1);
      return { year: n.getFullYear(), month: n.getMonth() };
    });
  };
  const prev = () => go(-1);
  const next = () => go(1);

  const monthName = new Date(cursor.year, cursor.month).toLocaleString("en", { month: "long", year: "numeric" });
  const selectedDay = selected ?? (today.slice(0, 7) === mk ? today : `${mk}-01`);
  const dayEvents = byDay[selectedDay] ?? [];

  return (
    <div className="space-y-6">
      <PageHead title={t("doctorCalendar")} text={t("doctorCalendarIntro")} />

      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        {/* Calendar grid */}
        <Card className="p-4">
          <div className="mb-4 flex items-center justify-between">
            <Button small look="quiet" onClick={prev} aria-label="Previous month"><ChevronLeft size={18} /></Button>
            <h2 className="text-xl">{monthName}</h2>
            <Button small look="quiet" onClick={next} aria-label="Next month"><ChevronRight size={18} /></Button>
          </div>
          <div className="grid grid-cols-7 text-center text-sm font-semibold text-muted">
            {DAYS.map((d) => <span key={d} className="py-1">{d}</span>)}
          </div>
          <div className="grid grid-cols-7">
            {grid.map((day, i) => {
              if (day === null) return <span key={`e${i}`} />;
              const dk = `${cursor.year}-${pad(cursor.month + 1)}-${pad(day)}`;
              const has = (byDay[dk]?.length ?? 0) > 0;
              const isToday = dk === today;
              const isSel = dk === selectedDay;
              const overdue = byDay[dk]?.some((e) => e.overdue);
              return (
                <button
                  key={dk}
                  type="button"
                  onClick={() => setSelected(dk)}
                  aria-pressed={isSel}
                  aria-label={`${dk}${has ? `, ${byDay[dk].length} events` : ""}`}
                  className={[
                    "relative mx-auto my-0.5 flex h-11 w-11 items-center justify-center rounded-input text-sm tnum transition-colors",
                    isSel ? "bg-primary font-semibold text-white shadow-card" : isToday ? "font-semibold text-primary ring-2 ring-inset ring-primary/60" : "text-ink hover:bg-brand-50",
                  ].join(" ")}
                >
                  {day}
                  {has && !isSel && (
                    <span className={`absolute bottom-1 left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full ${overdue ? "bg-attention" : "bg-primary"}`} />
                  )}
                </button>
              );
            })}
          </div>
        </Card>

        {/* Day detail */}
        <div className="space-y-3">
          <h3 className="text-lg">
            {new Date(selectedDay + "T00:00").toLocaleDateString("en", { weekday: "long", day: "numeric", month: "long" })}
          </h3>
          {dayEvents.length === 0 && <EmptyState title={t("noEvents")} text={t("noEventsText")} />}
          {dayEvents.map((e, i) => (
            <motion.div key={e.id} {...rise(i)}>
              <Card className="space-y-1 p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold tnum">{formatTime(e.due_at)}</span>
                  <span className={`rounded-md px-1.5 py-0.5 text-xs font-semibold ${CAT_COLORS[e.category ?? ""] ?? "bg-bg text-muted"}`}>
                    {e.category ?? "task"}
                  </span>
                </div>
                <p className="font-semibold">{e.title}</p>
                <p className="text-sm text-muted">{e.patient_alias}</p>
                <div className="flex flex-wrap items-center gap-2">
                  {e.overdue && <Badge tone="warn">Overdue</Badge>}
                  {e.plan_state === "checking" && <Badge tone="plain">{t("checking")}</Badge>}
                  {e.plan_state === "doctor_checked" && <Badge tone="good">{t("planChecked")}</Badge>}
                  <Badge tone={e.status === "Completed" ? "good" : "plain"}>{e.status}</Badge>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
