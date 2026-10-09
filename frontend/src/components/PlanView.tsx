import { Bell, CheckCircle, Clock, Columns, Rows, SquaresFour, WarningCircle } from "@phosphor-icons/react";
import { AnimatePresence, LayoutGroup, m as motion } from "motion/react";
import { useEffect, useState } from "react";
import { fmt } from "../i18n/strings";
import { api } from "../lib/api";
import { useLang } from "../lib/lang";
import { fmtDate, fmtTime, useMotionT } from "../lib/motion";
import { useQuery } from "../lib/query";
import type { Alert, AuditRow, Plan, PlanItem, PlanTask } from "../lib/types";
import { SLOT_ICON } from "./Icons";
import { ItemCard } from "./ItemCard";
import { CardView, TimelineView, TwoPanel } from "./Views";
import { Button, Card } from ".//ui";

interface Props {
  plan: Plan;
  preview?: boolean;
  elderly?: boolean;
  onTask?: (taskId: number, status: "Pending" | "Completed") => void;
  onAck?: (alertId: number) => void;
  onSource?: (item: PlanItem) => void;
  onRefresh?: () => void;
}

type Mode = "cards" | "panels" | "timeline";
const SLOTS = ["morning", "afternoon", "night"] as const;
const ORDER: Record<string, number> = { appointment: 0, test: 1, referral: 2, wound_care: 3, rehab: 4, medication: 5, diet: 6, activity: 7, other: 8, warning_sign: 9 };

function ViewSwitcher({ mode, set }: { mode: Mode; set: (m: Mode) => void }) {
  const { t } = useLang();
  const opts: { m: Mode; label: string; Icon: typeof Rows }[] = [
    { m: "cards", label: t("viewCards"), Icon: SquaresFour },
    { m: "panels", label: t("viewPanels"), Icon: Columns },
    { m: "timeline", label: t("timeline"), Icon: Rows },
  ];
  return (
    <div role="tablist" aria-label="Display" className="relative inline-flex max-w-full overflow-x-auto rounded-md border border-primary p-0.5">
      {opts.map(({ m, label, Icon }) => (
        <button key={m} role="tab" aria-selected={mode === m} onClick={() => set(m)} className="relative whitespace-nowrap px-2.5 py-1.5 text-sm font-semibold sm:px-3">
          {mode === m && <motion.span layoutId="mode-pill" className="absolute inset-0 rounded-sm bg-primary" transition={{ type: "spring", stiffness: 380, damping: 32 }} />}
          <span className={`relative inline-flex items-center gap-1.5 ${mode === m ? "text-surface" : "text-primary"}`}>
            <Icon size={18} weight="duotone" aria-hidden /> {label}
          </span>
        </button>
      ))}
    </div>
  );
}

export function PlanView({ plan, preview, elderly, onTask, onAck, onSource, onRefresh }: Props) {
  const { t } = useLang();
  const mt = useMotionT();
  const role = plan.viewer.role;
  const scope = plan.viewer.scope;
  const [mode, setMode] = useState<Mode>(elderly ? "cards" : "timeline");
  useEffect(() => setMode(elderly ? "cards" : "timeline"), [elderly]);
  const canTick = !preview && !!onTask && (role === "patient" || (role === "manager" && scope !== "appointments"));

  const taskMap = new Map(plan.tasks.map((x) => [x.id, x]));
  const items = [...plan.items].sort((a, b) => (a.date_resolved ?? "9999").localeCompare(b.date_resolved ?? "9999") || ORDER[a.category] - ORDER[b.category]);
  const held = plan.items.filter((i) => i.locked).length;
  const today = new Date(plan.today + "T00:00:00");
  const horizon = new Date(today.getTime() + 3 * 86400000);
  const shownTasks = plan.tasks.filter((x) => x.status === "Completed" || x.overdue || new Date(x.due_at) < horizon);
  const todo = shownTasks.filter((x) => x.status === "Pending");
  const done = shownTasks.filter((x) => x.status === "Completed");
  const ready = plan.tasks.filter((x) => x.status === "Pending").length;
  const meds = plan.items.filter((i) => i.category === "medication" && !i.locked);
  const warnings = plan.items.filter((i) => i.category === "warning_sign");

  const viewProps = { plan, items, tasks: taskMap, onTask, onSource, onRefresh, preview, elderly };

  return (
    <div className="space-y-8">
      {(role === "manager" || role === "family") && scope === "full" && (
        <motion.p initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} transition={mt(0.3)} className="lang-text rounded-md border border-primary tint-primary p-3 font-semibold text-primary">
          {fmt(t("helping"), { name: plan.patient.name })}
        </motion.p>
      )}

      {/* Home summary */}
      {scope !== "appointments" && (
        <motion.section initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={mt(0.35)} className="border-y border-line py-6" aria-label="Summary">
          <p className="lang-text font-heading text-2xl md:text-3xl" style={{ letterSpacing: "-0.015em" }}>
            {fmt(t("tasksReady"), { n: ready })}
            {held > 0 && <span className="text-attention">, {fmt(t("heldCount"), { n: held })}</span>}
          </p>
          <ProgressBar done={plan.tasks.filter((x) => x.status === "Completed").length} held={held} total={plan.tasks.length} />
          {plan.tasks.filter((x) => x.overdue).length > 0 && <p className="mt-2 text-sm font-semibold text-attention">{plan.tasks.filter((x) => x.overdue).length} {t("overdue").toLowerCase()}</p>}
        </motion.section>
      )}
      {!preview && plan.open_reviews > 0 && scope === "full" && role === "patient" && (
        <p className="lang-text flex items-center gap-2 rounded-sm border border-attention bg-attention-tint p-3 text-attention">
          <WarningCircle size={22} weight="duotone" aria-hidden /> {t("reviewBanner")}
        </p>
      )}
      {(role === "manager" || role === "family") && scope !== "appointments" && <AlertFeed alerts={plan.alerts} onAck={role === "manager" ? onAck : undefined} />}

      {/* Display modes */}
      {scope !== "reminders" && (
        <section aria-labelledby="h-plan" className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 id="h-plan" className="text-2xl">{t("planTitle")}</h2>
            <ViewSwitcher mode={mode} set={setMode} />
          </div>
          <AnimatePresence mode="wait" initial={false}>
            <motion.div key={mode} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={mt(0.22)}>
              {mode === "cards" && <CardView {...viewProps} />}
              {mode === "panels" && <TwoPanel {...viewProps} />}
              {mode === "timeline" && <TimelineView {...viewProps} />}
            </motion.div>
          </AnimatePresence>
        </section>
      )}

      {/* Checklist */}
      {scope !== "appointments" && (
        <section aria-labelledby="h-tasks">
          <h2 id="h-tasks" className="mb-3 text-2xl">{t("tasks")}</h2>
          <LayoutGroup>
            <h3 className="mb-2 text-lg text-muted">{t("toDo")} ({todo.length})</h3>
            <ul className="mb-6 space-y-2">
              <AnimatePresence initial={false}>
                {todo.map((x) => <TaskRow key={x.id} task={x} onTask={canTick ? onTask : undefined} />)}
              </AnimatePresence>
            </ul>
            <h3 className="mb-2 text-lg text-muted">{t("done")} ({done.length})</h3>
            <ul className="space-y-2">
              <AnimatePresence initial={false}>
                {done.map((x) => <TaskRow key={x.id} task={x} onTask={canTick ? onTask : undefined} />)}
              </AnimatePresence>
            </ul>
          </LayoutGroup>
        </section>
      )}

      {/* Medicine schedule graphic */}
      {scope === "full" && meds.some((m) => m.med?.timing.length) && (
        <section aria-labelledby="h-meds">
          <h2 id="h-meds" className="mb-3 text-2xl">{t("medicines")}</h2>
          <div className="grid gap-3 md:grid-cols-3">
            {SLOTS.map((slot, k) => {
              const Icon = SLOT_ICON[slot];
              const list = meds.filter((m) => m.med?.timing.includes(slot));
              return (
                <motion.div key={slot} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={mt(0.3, k * 0.08)} className="card p-4">
                  <h3 className="mb-2 flex items-center gap-2 text-lg text-primary"><Icon size={28} /> {t(slot)}</h3>
                  {list.length === 0 && <p className="text-sm text-muted">-</p>}
                  <ul className="space-y-1">
                    {list.map((m) => <li key={m.id} className="font-semibold">{m.title}</li>)}
                  </ul>
                </motion.div>
              );
            })}
          </div>
        </section>
      )}

      {/* Warning signs */}
      {scope === "full" && warnings.length > 0 && (
        <section aria-labelledby="h-warn" className="rounded-md border border-attention bg-attention-tint p-4">
          <h2 id="h-warn" className="flex items-center gap-2 text-2xl text-attention">
            <WarningCircle size={28} weight="duotone" aria-hidden /> {t("warningSigns")}
          </h2>
          <p className="lang-text my-2 font-semibold">{t("warningIntro")}</p>
          <ul className="space-y-3">
            {warnings.map((w) => (
              <li key={w.id}>
                {w.simple_text && <p className="lang-text">{w.simple_text}</p>}
                {!w.locked || role === "patient" ? (
                  <p className="text-sm text-muted">{t("doctorWords")} “{w.original_text}”</p>
                ) : null}
              </li>
            ))}
          </ul>
          <p className="lang-text mt-3 font-semibold text-attention">{t("emergency")}</p>
        </section>
      )}

      {role === "patient" && !preview && <Activity docId={plan.document.id} />}
      {/* Rule on every screen: footer disclaimer */}
      <p className="lang-text rounded-sm border border-line p-3 text-sm text-muted">{t("disclaimer")}</p>
    </div>
  );
}

/** Segmented bar: one segment per task. Done segments fill in, one after another. */
function ProgressBar({ done, held, total }: { done: number; held: number; total: number }) {
  const mt = useMotionT();
  const n = Math.min(total, 40);
  return (
    <div className="mt-4" role="img" aria-label={`${done} of ${total} tasks done, ${held} waiting for a doctor`}>
      <div className="flex gap-[3px]">
        {Array.from({ length: n }).map((_, i) => (
          <motion.span key={i} className="h-2.5 flex-1 rounded-sm" style={{ background: i < Math.round((done / total) * n) ? "var(--primary)" : "var(--line)", originY: 1 }} initial={{ scaleY: 0.3, opacity: 0 }} animate={{ scaleY: 1, opacity: 1 }} transition={mt(0.3, i * 0.012)} />
        ))}
      </div>
      <p className="mt-2 text-sm text-muted tnum">{done} of {total} done</p>
    </div>
  );
}

function TaskRow({ task, onTask }: { task: PlanTask; onTask?: (id: number, s: "Pending" | "Completed") => void }) {
  const { t } = useLang();
  const mt = useMotionT();
  const done = task.status === "Completed";
  return (
    <motion.li
      layout
      layoutId={`task-${task.id}`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={mt(0.25)}
      className={`card flex items-center justify-between gap-3 p-3 ${done ? "text-muted" : ""}`}
    >
      <div className="flex min-w-0 items-center gap-3">
        {done ? <CheckCircle size={22} weight="fill" className="text-primary" aria-hidden /> : <Clock size={22} weight="duotone" className={task.overdue ? "text-attention" : "text-primary"} aria-hidden />}
        <div className="min-w-0">
          <p className="lang-text font-semibold">{task.title}</p>
          <p className="text-sm text-muted">
            {fmtDate(task.due_at, { weekday: "short", day: "numeric", month: "short" })}, {fmtTime(task.due_at)}
            {task.overdue && <span className="ml-2 font-semibold text-attention">{t("overdue")}</span>}
          </p>
        </div>
      </div>
      {onTask && (
        <Button onClick={() => onTask(task.id, done ? "Pending" : "Completed")} look="quiet" small className="shrink-0">
          {done ? t("undo") : t("markDone")}
        </Button>
      )}
    </motion.li>
  );
}

function Activity({ docId }: { docId: number }) {
  const { t } = useLang();
  const { data } = useQuery(`audit/${docId}`, () => api.audit(docId));
  const rows: AuditRow[] = (data ?? []).filter((a) => ["viewed_plan", "item_flagged", "callback_requested", "provider_selected", "review_approved", "review_edited", "review_rejected", "task_completed"].includes(a.action)).slice(-8).reverse();
  return (
    <section aria-labelledby="h-act">
      <h2 id="h-act" className="text-2xl">{t("activity")}</h2>
      <p className="mb-2 text-sm text-muted">{t("activityHelp")}</p>
      {rows.length === 0 && <p className="text-muted">-</p>}
      <ul className="space-y-1 text-sm">
        {rows.map((a) => (
          <li key={a.id} className="flex flex-wrap gap-x-3 border-b border-line py-1">
            <span className="text-muted">{new Date(a.created_at).toLocaleString("en-IN")}</span>
            <span className="font-semibold">{a.actor}</span>
            <span>{a.action.replace(/_/g, " ")}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function AlertFeed({ alerts, onAck }: { alerts: Alert[]; onAck?: (id: number) => void }) {
  const { t } = useLang();
  const open = alerts.filter((a) => !a.acknowledged_at);
  return (
    <Card aria-labelledby="h-alerts" as="section" className="p-4">
      <h2 id="h-alerts" className="mb-2 flex items-center gap-2 text-2xl">
        <Bell size={26} weight="duotone" aria-hidden /> {t("alerts")}
      </h2>
      {open.length === 0 && <p className="text-muted">{t("noAlerts")}</p>}
      <ul className="space-y-2">
        {open.map((a) => (
          <motion.li layout key={a.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
            className={`flex flex-wrap items-center justify-between gap-2 rounded-sm border p-3 ${a.level === "urgent" ? "border-attention bg-attention-tint" : "border-line"}`}>
            <span className="lang-text">
              {a.level === "urgent" && <strong className="mr-2 text-attention">Urgent</strong>}
              {a.message}
            </span>
            {onAck && <Button look="quiet" small onClick={() => onAck(a.id)}>{t("acknowledge")}</Button>}
          </motion.li>
        ))}
      </ul>
    </Card>
  );
}

// Re-exported for the landing page preview, which renders a card without a server.
export { ItemCard };
