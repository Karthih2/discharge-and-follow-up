import { CaretLeft, CaretRight, CheckCircle, Circle, Pill, Stethoscope } from "@phosphor-icons/react";
import { AnimatePresence, m as motion } from "motion/react";
import { useMemo, useState } from "react";
import { Badge, Button, Card, EmptyState, PageHead, Skeleton } from "../components/ui";
import { api } from "../lib/api";
import { useLang } from "../lib/lang";
import { fmtDate, fmtTime, useMotionT } from "../lib/motion";
import { invalidate, useQuery } from "../lib/query";
import { toast } from "../lib/toast";

const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const WEEK = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/** Every task of the month in one place: a month grid on the left, the chosen day on the right. */
export default function Calendar() {
  const { t } = useLang();
  const mt = useMotionT();
  const [cursor, setCursor] = useState<Date | null>(null);
  const [pick, setPick] = useState<string | null>(null);
  const [who, setWho] = useState("");
  const [busy, setBusy] = useState<number | null>(null);

  const first = useQuery("calendar/now", () => api.calendar(iso(new Date()).slice(0, 7)));
  const today = first.data?.today ?? iso(new Date());
  const month = (cursor ?? new Date(today + "T00:00:00"));
  const key = iso(month).slice(0, 7);
  const cal = useQuery(`calendar/${key}`, () => api.calendar(key));
  const all = cal.data?.tasks ?? [];
  const people = [...new Set(all.map((x) => x.patient))];
  const tasks = who ? all.filter((x) => x.patient === who) : all;
  const byDay = useMemo(() => {
    const m = new Map<string, typeof tasks>();
    for (const x of tasks) m.set(x.due_at.slice(0, 10), [...(m.get(x.due_at.slice(0, 10)) ?? []), x]);
    return m;
  }, [tasks]);

  const lead = (new Date(month.getFullYear(), month.getMonth(), 1).getDay() + 6) % 7;
  const days = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const selected = pick ?? (today.slice(0, 7) === key ? today : `${key}-01`);
  const dayTasks = byDay.get(selected) ?? [];
  const step = (n: number) => { setCursor(new Date(month.getFullYear(), month.getMonth() + n, 1)); setPick(null); };

  const flip = async (id: number, done: boolean) => {
    setBusy(id);
    try {
      await api.setTask(id, done ? "Pending" : "Completed");
      toast(done ? t("toastUndone") : t("toastTaken"));
      invalidate("calendar");
      invalidate("today");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-6">
      <PageHead title={t("calendar")} text={t("calendarIntro")} />
      <div className="flex flex-wrap items-center gap-3">
        <Button small look="quiet" aria-label={t("previous")} onClick={() => step(-1)}><CaretLeft size={16} aria-hidden /></Button>
        <h2 className="min-w-[10rem] text-center text-2xl">{month.toLocaleDateString("en-IN", { month: "long", year: "numeric" })}</h2>
        <Button small look="quiet" aria-label={t("next")} onClick={() => step(1)}><CaretRight size={16} aria-hidden /></Button>
        <Button small look="quiet" onClick={() => { setCursor(null); setPick(null); }}>{t("today")}</Button>
        {people.length > 1 && (
          <select className="field w-auto" aria-label={t("patient")} value={who} onChange={(e) => setWho(e.target.value)}>
            <option value="">{t("allPatients")}</option>
            {people.map((p) => <option key={p}>{p}</option>)}
          </select>
        )}
      </div>
      {cal.error && <p role="alert" className="text-attention">{cal.error}</p>}

      <div className="grid items-start gap-4 lg:grid-cols-[1.6fr_1fr]">
        <Card className="p-3">
          <div className="grid grid-cols-7 gap-1 text-center text-sm text-muted">{WEEK.map((d) => <span key={d}>{d}</span>)}</div>
          {cal.loading ? <Skeleton className="mt-2 h-72 w-full" /> : (
            <div className="mt-1 grid grid-cols-7 gap-1">
              {Array.from({ length: lead }).map((_, i) => <span key={`b${i}`} />)}
              {Array.from({ length: days }, (_, i) => {
                const d = `${key}-${String(i + 1).padStart(2, "0")}`;
                const list = byDay.get(d) ?? [];
                const late = list.some((x) => x.overdue);
                const open = list.filter((x) => x.status === "Pending").length;
                return (
                  <button key={d} onClick={() => setPick(d)} aria-pressed={d === selected} aria-label={`${d}, ${list.length}`}
                    className={`flex h-16 flex-col items-center rounded-sm border p-1 text-sm ${d === selected ? "border-primary bg-primary text-surface" : d === today ? "border-primary bg-surface" : "border-line bg-bg hover:border-primary"}`}>
                    <span className="tnum font-semibold">{i + 1}</span>
                    {list.length > 0 && (
                      <span className="mt-auto flex gap-0.5" aria-hidden>
                        {list.some((x) => x.kind === "medicine") && <i className={`h-1.5 w-1.5 rounded-full ${d === selected ? "bg-surface" : "bg-primary"}`} />}
                        {list.some((x) => x.kind !== "medicine") && <i className={`h-1.5 w-1.5 rounded-sm ${d === selected ? "bg-surface" : "bg-ink"}`} />}
                        {late && <i className="h-1.5 w-1.5 rounded-full bg-attention" />}
                      </span>
                    )}
                    {open > 0 && <span className={`tnum text-[0.7rem] ${d === selected ? "" : "text-muted"}`}>{open}</span>}
                  </button>
                );
              })}
            </div>
          )}
          <p className="mt-3 flex flex-wrap gap-4 text-sm text-muted">
            <span className="flex items-center gap-1"><i className="h-2 w-2 rounded-full bg-primary" />{t("medicines")}</span>
            <span className="flex items-center gap-1"><i className="h-2 w-2 rounded-sm bg-ink" />{t("visitsTests")}</span>
            <span className="flex items-center gap-1"><i className="h-2 w-2 rounded-full bg-attention" />{t("overdue")}</span>
          </p>
        </Card>

        <Card as="section" className="space-y-3 p-4" aria-live="polite">
          <h3 className="text-xl">{fmtDate(selected, { weekday: "long", day: "numeric", month: "long" })}</h3>
          {dayTasks.length === 0 && !cal.loading && <EmptyState title={t("nothingThisDay")} text={t("nothingThisDayText")} />}
          <ul className="space-y-2">
            <AnimatePresence initial={false} mode="popLayout">
              {dayTasks.map((x) => {
                const done = x.status === "Completed";
                return (
                  <motion.li layout key={x.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={mt(0.18)}
                    className={`rounded-sm border p-2 ${x.overdue ? "border-attention bg-attention-tint" : done ? "border-line bg-bg text-muted" : "border-line bg-surface"}`}>
                    <p className="flex items-start gap-2">
                      {x.kind === "medicine" ? <Pill size={18} weight="duotone" className="mt-0.5 shrink-0 text-primary" aria-hidden /> : <Stethoscope size={18} weight="duotone" className="mt-0.5 shrink-0 text-primary" aria-hidden />}
                      <span className="lang-text min-w-0">{x.title}</span>
                    </p>
                    <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted">
                      <span className="tnum">{fmtTime(x.due_at)}</span>
                      {people.length > 1 && <Badge>{x.patient}</Badge>}
                      {x.overdue && <Badge tone="warn">{t("overdue")}</Badge>}
                      {x.can_tick && (
                        <Button small look={done ? "quiet" : "solid"} className="ml-auto" loading={busy === x.id} onClick={() => flip(x.id, done)} aria-pressed={done}>
                          {done ? <><CheckCircle size={16} weight="fill" aria-hidden /> {t("done")}</> : <><Circle size={16} aria-hidden /> {t("markDone")}</>}
                        </Button>
                      )}
                    </p>
                  </motion.li>
                );
              })}
            </AnimatePresence>
          </ul>
        </Card>
      </div>
    </div>
  );
}
