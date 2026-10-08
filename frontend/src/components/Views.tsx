import { CaretLeft, CaretRight } from "@phosphor-icons/react";
import { motion } from "motion/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { api } from "../lib/api";
import { useLang } from "../lib/lang";
import { fmtDate, useLoad, useMotionT } from "../lib/motion";
import type { Plan, PlanItem, PlanTask } from "../lib/types";
import { ItemCard } from "./ItemCard";
import { Skeleton } from "./Skeleton";

export interface ViewProps {
  plan: Plan;
  items: PlanItem[];
  tasks: Map<number, PlanTask>;
  onTask?: (taskId: number, status: "Pending" | "Completed") => void;
  onSource?: (i: PlanItem) => void;
  onRefresh?: () => void;
  preview?: boolean;
  elderly?: boolean;
}

const cardProps = (p: ViewProps, item: PlanItem) => ({
  item, plan: p.plan, task: item.task_id ? p.tasks.get(item.task_id) : undefined,
  onTask: p.onTask, onSource: p.onSource, onRefresh: p.onRefresh, preview: p.preview,
});

/** One large card at a time. Slides sideways. */
export function CardView(p: ViewProps) {
  const { t } = useLang();
  const mt = useMotionT();
  const [[i, dir], set] = useState<[number, number]>([0, 0]);
  const n = p.items.length;
  const idx = Math.min(i, Math.max(n - 1, 0));
  const go = (d: number) => set([Math.min(Math.max(idx + d, 0), n - 1), d]);
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLElement && /INPUT|SELECT|TEXTAREA/.test(e.target.tagName)) return;
      if (e.key === "ArrowRight") go(1);
      if (e.key === "ArrowLeft") go(-1);
    };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  });
  if (n === 0) return <p className="text-muted">-</p>;
  const item = p.items[idx];
  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-3">
        <button className="btn btn-quiet btn-sm" onClick={() => go(-1)} disabled={idx === 0} aria-label={t("previous")}>
          <CaretLeft size={18} aria-hidden /> {t("previous")}
        </button>
        <div className="flex flex-wrap justify-center gap-1.5" role="tablist" aria-label="Cards">
          {p.items.map((it, k) => (
            <button
              key={it.id}
              role="tab"
              aria-selected={k === idx}
              aria-label={it.title}
              onClick={() => set([k, k > idx ? 1 : -1])}
              className={`h-2.5 rounded-full transition-all ${k === idx ? "w-7 bg-primary" : it.locked ? "w-2.5 bg-attention" : "w-2.5 bg-line hover:bg-secondary"}`}
            />
          ))}
        </div>
        <button className="btn btn-quiet btn-sm" onClick={() => go(1)} disabled={idx === n - 1} aria-label={t("next")}>
          {t("next")} <CaretRight size={18} aria-hidden />
        </button>
      </div>
      <p className="mb-2 text-sm text-muted">{idx + 1} / {n}</p>
      <motion.div key={item.id} initial={{ opacity: 0, x: dir * 40 }} animate={{ opacity: 1, x: 0 }} transition={mt(0.3)}>
        <ItemCard {...cardProps(p, item)} large />
      </motion.div>
    </div>
  );
}

const HL = (c: string) => (c === "medication" ? "hl-med" : c === "warning_sign" ? "hl-warn" : "hl-appt");

/** Left: the original summary with colour highlights. Right: the tasks. Clicking a task flashes its lines. */
export function TwoPanel(p: ViewProps) {
  const full = p.plan.viewer.scope === "full";
  const { data: lines } = useLoad(() => (full && !p.preview ? api.source(p.plan.document.id) : Promise.resolve(null)), [p.plan.document.id, full]);
  const [flash, setFlash] = useState<{ lines: number[]; n: number }>({ lines: [], n: 0 });
  const refs = useRef(new Map<number, HTMLLIElement>());
  const cat = useMemo(() => {
    const m = new Map<number, string>();
    p.items.forEach((it) => it.source_line_nos.forEach((n) => m.set(n, it.locked && p.plan.viewer.role !== "patient" ? "other" : it.category)));
    return m;
  }, [p.items, p.plan.viewer.role]);

  const pick = (it: PlanItem) => {
    setFlash((f) => ({ lines: it.source_line_nos, n: f.n + 1 }));
    const first = Math.min(...it.source_line_nos);
    refs.current.get(first)?.scrollIntoView({ block: "center", behavior: "smooth" });
  };

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <section aria-label="Original summary" className="card max-h-[70vh] overflow-y-auto p-3">
        <div className="mb-2 flex flex-wrap gap-2 text-xs">
          <span className="hl-appt rounded-sm px-2 py-0.5">Appointments and tests</span>
          <span className="hl-med rounded-sm px-2 py-0.5">Medicines</span>
          <span className="hl-warn rounded-sm px-2 py-0.5 text-attention">Warnings</span>
        </div>
        {!full && <p className="text-muted">The patient did not share the original summary with you.</p>}
        {full && !lines && !p.preview && <div className="space-y-2">{[0, 1, 2, 3, 4, 5].map((k) => <Skeleton key={k} className="h-5 w-full" />)}</div>}
        {p.preview && <p className="text-muted">The original summary appears here, with colour highlights.</p>}
        <ol className="font-mono text-[0.9rem] leading-relaxed">
          {lines?.map((l) => {
            const on = flash.lines.includes(l.line_no);
            return (
              <li
                key={`${l.line_no}-${on ? flash.n : 0}`}
                ref={(el) => { if (el) refs.current.set(l.line_no, el); }}
                className={`flex gap-3 rounded-sm px-2 py-0.5 ${cat.has(l.line_no) ? HL(cat.get(l.line_no)!) : ""} ${on ? "line-flash" : ""}`}
              >
                <span className="w-6 shrink-0 text-right text-muted">{l.line_no}</span>
                <span>{l.text}</span>
              </li>
            );
          })}
        </ol>
      </section>
      <section aria-label="Tasks" className="max-h-[70vh] space-y-3 overflow-y-auto">
        {p.items.map((it) => (
          <div key={it.id} onClickCapture={() => pick(it)}>
            <ItemCard {...cardProps(p, it)} />
          </div>
        ))}
      </section>
    </div>
  );
}

/** Tasks ordered by date, with a "No date yet" group. The line draws itself in. */
export function TimelineView(p: ViewProps) {
  const { t } = useLang();
  const mt = useMotionT();
  const dated = p.items.filter((i) => i.date_resolved).sort((a, b) => a.date_resolved!.localeCompare(b.date_resolved!));
  const undated = p.items.filter((i) => !i.date_resolved);
  const groups: { key: string; label: string; items: PlanItem[] }[] = [];
  dated.forEach((i) => {
    const g = groups.find((x) => x.key === i.date_resolved);
    if (g) g.items.push(i);
    else groups.push({ key: i.date_resolved!, label: fmtDate(i.date_resolved!, { weekday: "short", day: "numeric", month: "long" }), items: [i] });
  });
  if (undated.length) groups.push({ key: "none", label: t("noDateYet"), items: undated });
  return (
    <div className="relative pl-8">
      <motion.div
        className="absolute left-[11px] top-2 w-0.5 origin-top bg-line"
        style={{ bottom: 8 }}
        initial={{ scaleY: 0 }}
        animate={{ scaleY: 1 }}
        transition={mt(0.9)}
        aria-hidden
      />
      <ol className="space-y-8">
        {groups.map((g, gi) => (
          <motion.li key={g.key} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={mt(0.3, gi * 0.07)} className="relative">
            <motion.span
              className={`absolute -left-8 top-1 h-6 w-6 rounded-full border-2 ${g.key === "none" ? "border-attention bg-attention-tint" : "border-primary bg-bg"}`}
              initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ ...mt(0.35, gi * 0.07 + 0.2), type: "spring", stiffness: 300, damping: 16 }}
              aria-hidden
            />
            <h3 className="mb-2 text-xl">{g.label}</h3>
            <ul className="space-y-3">
              {g.items.map((it) => (
                <li key={it.id}><ItemCard {...cardProps(p, it)} /></li>
              ))}
            </ul>
          </motion.li>
        ))}
      </ol>
    </div>
  );
}
