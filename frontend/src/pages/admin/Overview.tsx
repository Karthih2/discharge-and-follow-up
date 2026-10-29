import { ChartLineUp, CheckCircle, ClipboardText, Clock, Heartbeat, Phone, ShieldCheck, UsersFour, WarningCircle } from "@phosphor-icons/react";
import { m as motion } from "motion/react";
import { lazy, Suspense } from "react";
import { useSearchParams } from "react-router-dom";
import { CountUp } from "../../components/CountUp";
import { Button, Card, Select, Skeleton, StatsSkeleton } from "../../components/ui";
import { api } from "../../lib/api";
import { useAuth } from "../../lib/auth";
import { useLang } from "../../lib/lang";
import { useStagger } from "../../lib/motion";
import { useQuery } from "../../lib/query";

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

const Charts = lazy(() => import("./Charts"));
const RANGES = [7, 30, 90] as const;

export default function Overview() {
  const { t } = useLang();
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const days = RANGES.find((d) => d === Number(params.get("days"))) ?? 30;
  const dept = params.get("dept") ?? "";
  const stats = useQuery(`stats/${days}/${dept}`, () => api.stats(days, dept || undefined));
  const rise = useStagger("admin-overview");
  const s = stats.data;
  const set = (next: { days?: number; dept?: string }) => {
    const p = new URLSearchParams(params);
    if (next.days !== undefined) p.set("days", String(next.days));
    if (next.dept !== undefined) next.dept ? p.set("dept", next.dept) : p.delete("dept");
    setParams(p, { replace: true });
  };

  const n = s?.numbers;
  type Tint = "neutral" | "primary" | "warn";
  const statIcons = [ClipboardText, ShieldCheck, Clock, Heartbeat, CheckCircle, WarningCircle, ChartLineUp, WarningCircle, Phone, UsersFour];
  const cards: [string, number | null | undefined, string, boolean, number?, Tint?][] = [
    [t("plansCreated"), n?.plans_created, "", false, 0, "primary"],
    [t("needingReview"), n?.needing_review, "", false],
    [t("medianClear"), n?.median_clear_hours, " h", false, 1],
    [t("medianCheck"), n?.median_check_hours, " h", false, 1, "primary"],
    [t("pctChecked24h"), n?.pct_checked_24h, "%", false, 1, "primary"],
    [t("reviewsOverdue"), n?.reviews_overdue, "", true, 0, "warn"],
    [t("completionRate"), n?.task_completion_rate, "%", false, 1],
    [t("overdueTasks"), n?.overdue_tasks, "", true, 0, "warn"],
    [t("callbacksCompleted"), n?.callbacks_completed, "", false],
    [t("openFamilyAlerts"), n?.open_alerts, "", true, 0, "warn"],
  ];
  const tintClass = (t?: Tint) => t === "primary" ? "tint-primary" : t === "warn" ? "hl-warn" : "";

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}>
        <p className="text-muted text-sm">{greeting()}</p>
        <h1 className="font-heading text-3xl">{user?.name ?? t("overview")}</h1>
        <p className="text-muted">{t("overviewIntro")}</p>
      </motion.div>
      <div className="flex flex-wrap items-end gap-4">
        <div role="group" aria-label={t("dateRange")} className="flex gap-2">
          {RANGES.map((d) => (
            <Button key={d} small look={d === days ? "solid" : "quiet"} aria-pressed={d === days} onClick={() => set({ days: d })}>{d} {t("daysShort")}</Button>
          ))}
        </div>
        <Select label={t("department")} value={dept} onChange={(e) => set({ dept: e.target.value })}>
          <option value="">{t("allDepartments")}</option>
          {(s?.departments ?? (dept ? [dept] : [])).map((d) => <option key={d} value={d}>{d}</option>)}
        </Select>
      </div>
      {stats.error && <p role="alert" className="text-attention">{stats.error}</p>}

      {stats.loading ? <StatsSkeleton n={10} /> : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {cards.map(([label, v, unit, warn, dec, tint], i) => {
            const Icon = statIcons[i];
            return (
              <motion.div key={label} {...rise(i)}>
                <Card className={`h-full p-4 ${tintClass(tint)}`}>
                  <div className="flex items-start justify-between">
                    <div>
                      <p className={`font-heading text-3xl tnum ${warn && v ? "text-attention" : ""}`}>
                        {v === null || v === undefined ? "-" : <><CountUp to={v} decimals={dec ?? 0} />{unit}</>}
                      </p>
                      <p className="mt-1 text-sm text-muted">{label}</p>
                    </div>
                    <span className={`rounded-[10px] p-1.5 ${tint === "warn" ? "bg-attention/8 text-attention" : tint === "primary" ? "bg-primary/8 text-primary" : "bg-line text-muted"}`}>
                      <Icon size={18} weight="duotone" aria-hidden />
                    </span>
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}

      {s ? (
        <Suspense fallback={<ChartsSkeleton />}><Charts s={s} /></Suspense>
      ) : <ChartsSkeleton />}
    </div>
  );
}

function ChartsSkeleton() {
  return (
    <div className="grid gap-4 lg:grid-cols-2" role="status" aria-label="Loading">
      {[0, 1, 2, 3].map((i) => <Card key={i} className="space-y-3 p-4"><Skeleton className="h-6 w-1/3" /><Skeleton className="h-64 w-full" /><Skeleton className="h-20 w-full" /></Card>)}
    </div>
  );
}
