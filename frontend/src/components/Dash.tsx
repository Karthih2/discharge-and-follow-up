import { m as motion } from "motion/react";
import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { fmtDate, useMotionT } from "../lib/motion";
import type { CalTask } from "../lib/types";

// Building blocks for the home dashboards: a dense mosaic of small tiles, in the style of an Obsidian homepage.
// Flat tiles, 1px borders, the CareBridge palette. Mono type for numbers, dates and small labels.

export function Tile({ title, aside, className = "", children, id }: { title?: string; aside?: ReactNode; className?: string; children: ReactNode; id?: string }) {
  return (
    <section className={`card flex min-h-0 flex-col ${className}`} aria-labelledby={id}>
      {title && (
        <header className="flex items-center justify-between gap-2 border-b border-line px-3 py-2">
          <h2 id={id} className="text-sm font-bold">{title}</h2>
          {aside && <span className="font-mono text-xs text-muted">{aside}</span>}
        </header>
      )}
      <div className="min-h-0 flex-1 p-3">{children}</div>
    </section>
  );
}

/** Big day number in a scalloped badge, the weekday and the full date. */
export function DateTile({ today, hello, sub }: { today: string; hello: string; sub?: string }) {
  const d = new Date(today + "T00:00:00");
  return (
    <section className="card relative flex flex-col items-center justify-center gap-1 overflow-hidden p-4 text-center" aria-label={fmtDate(today)}>
      <p className="text-sm font-semibold text-muted">{hello}</p>
      <div className="flex h-28 w-28 items-center justify-center bg-secondary" style={{ clipPath: "polygon(50% 0%, 61% 8%, 75% 6%, 82% 18%, 94% 25%, 92% 39%, 100% 50%, 92% 61%, 94% 75%, 82% 82%, 75% 94%, 61% 92%, 50% 100%, 39% 92%, 25% 94%, 18% 82%, 6% 75%, 8% 61%, 0% 50%, 8% 39%, 6% 25%, 18% 18%, 25% 6%, 39% 8%)" }} aria-hidden>
        <span className="font-mono text-5xl font-semibold text-ink">{d.getDate()}</span>
      </div>
      <p className="font-mono text-sm font-semibold text-primary">{d.toLocaleDateString("en-IN", { month: "long", year: "numeric" })}</p>
      <p className="font-mono text-xs text-muted">{d.toLocaleDateString("en-IN", { weekday: "long" })}{sub ? `. ${sub}` : ""}</p>
    </section>
  );
}

/** Small month grid with a dot under days that have tasks. Opens the full calendar. */
export function MiniCalendar({ tasks, today }: { tasks: CalTask[]; today: string }) {
  const nav = useNavigate();
  const d = new Date(today + "T00:00:00");
  const key = today.slice(0, 7);
  const lead = (new Date(d.getFullYear(), d.getMonth(), 1).getDay() + 6) % 7;
  const days = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  const by = new Map<string, CalTask[]>();
  for (const t of tasks) by.set(t.due_at.slice(0, 10), [...(by.get(t.due_at.slice(0, 10)) ?? []), t]);
  return (
    <div>
      <div className="grid grid-cols-7 gap-y-0.5 text-center font-mono text-[0.7rem] text-muted" aria-hidden>
        {["M", "T", "W", "T", "F", "S", "S"].map((x, i) => <span key={i}>{x}</span>)}
      </div>
      <div className="grid grid-cols-7 gap-y-0.5">
        {Array.from({ length: lead }).map((_, i) => <span key={`b${i}`} />)}
        {Array.from({ length: days }, (_, i) => {
          const date = `${key}-${String(i + 1).padStart(2, "0")}`;
          const list = by.get(date) ?? [];
          const late = list.some((t) => t.overdue);
          const isToday = date === today;
          return (
            <button key={date} onClick={() => nav("/calendar")} aria-label={`${date}, ${list.length}`}
              className={`flex h-8 flex-col items-center justify-center rounded-sm font-mono text-xs ${isToday ? "bg-primary font-semibold text-surface" : "hover:bg-line"}`}>
              {i + 1}
              <i className={`h-1 w-1 rounded-full ${list.length === 0 ? "bg-transparent" : late ? "bg-attention" : isToday ? "bg-surface" : "bg-primary"}`} />
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** One square per day this month. Darker means more tasks done that day. */
export function ActivityDots({ tasks, today }: { tasks: CalTask[]; today: string }) {
  const key = today.slice(0, 7);
  const days = new Date(+key.slice(0, 4), +key.slice(5, 7), 0).getDate();
  const done = new Map<string, number>();
  for (const t of tasks) if (t.status === "Completed") done.set(t.due_at.slice(0, 10), (done.get(t.due_at.slice(0, 10)) ?? 0) + 1);
  const max = Math.max(1, ...done.values());
  return (
    <div>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(14px,1fr))] gap-1" role="img" aria-label="Tasks done each day">
        {Array.from({ length: days }, (_, i) => {
          const date = `${key}-${String(i + 1).padStart(2, "0")}`;
          const n = done.get(date) ?? 0;
          const future = date > today;
          return <i key={date} title={`${date}: ${n}`} className="block aspect-square rounded-sm"
            style={{ background: future ? "transparent" : n === 0 ? "var(--line)" : "var(--primary)", opacity: n === 0 ? 0.6 : 0.3 + (0.7 * n) / max, border: future ? "1px dashed var(--line)" : "none" }} />;
        })}
      </div>
      <p className="mt-2 flex items-center justify-end gap-1 font-mono text-[0.7rem] text-muted">Less {[0.3, 0.55, 0.8, 1].map((o) => <i key={o} className="h-2.5 w-2.5 rounded-sm bg-primary" style={{ opacity: o }} />)} More</p>
    </div>
  );
}

/** Number with a label under it. */
export function Stat({ n, label, warn }: { n: number | string; label: string; warn?: boolean }) {
  return (
    <div className="card flex flex-col items-center justify-center px-2 py-3 text-center">
      <span className={`font-mono text-2xl font-semibold ${warn ? "text-attention" : "text-ink"}`}>{n}</span>
      <span className="text-xs text-muted">{label}</span>
    </div>
  );
}

/** Square icon button with a small label, like the shortcut grid on an Obsidian homepage. */
export function IconTile({ icon, label, onClick, to, disabled, loading }: { icon: ReactNode; label: string; onClick?: () => void; to?: string; disabled?: boolean; loading?: boolean }) {
  const nav = useNavigate();
  const mt = useMotionT();
  return (
    <motion.button whileTap={{ scale: 0.96 }} transition={mt(0.1)} disabled={disabled || loading} aria-busy={loading || undefined} onClick={() => (to ? nav(to) : onClick?.())}
      className="card flex h-20 flex-col items-center justify-center gap-1 px-2 text-center text-sm font-semibold text-ink hover:border-primary hover:text-primary">
      <span className="text-primary" aria-hidden>{icon}</span>
      {label}
    </motion.button>
  );
}

/** Key and value rows, like the Properties panel. */
export function Props({ rows }: { rows: [string, ReactNode][] }) {
  return (
    <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
      {rows.map(([k, v]) => (
        <div key={k} className="contents">
          <dt className="font-mono text-xs text-muted">{k}</dt>
          <dd className="min-w-0">{v}</dd>
        </div>
      ))}
    </dl>
  );
}
