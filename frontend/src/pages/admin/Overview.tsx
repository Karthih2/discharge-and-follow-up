import { m as motion } from "motion/react";
import { lazy, Suspense } from "react";
import { useSearchParams } from "react-router-dom";
import { CountUp } from "../../components/CountUp";
import { Button, Card, PageHead, Select, Skeleton, StatsSkeleton } from "../../components/ui";
import { api } from "../../lib/api";
import { useLang } from "../../lib/lang";
import { useStagger } from "../../lib/motion";
import { useQuery } from "../../lib/query";

const Charts = lazy(() => import("./Charts"));
const RANGES = [7, 30, 90] as const;

export default function Overview() {
  const { t } = useLang();
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
  const cards: [string, number | null | undefined, string, boolean, number?][] = [
    [t("plansCreated"), n?.plans_created, "", false],
    [t("needingReview"), n?.needing_review, "", false],
    [t("medianClear"), n?.median_clear_hours, " h", false, 1],
    [t("reviewsOverdue"), n?.reviews_overdue, "", true],
    [t("completionRate"), n?.task_completion_rate, "%", false, 1],
    [t("overdueTasks"), n?.overdue_tasks, "", true],
    [t("callbacksCompleted"), n?.callbacks_completed, "", false],
    [t("openFamilyAlerts"), n?.open_alerts, "", true],
  ];

  return (
    <div className="space-y-6">
      <PageHead title={t("overview")} text={t("overviewIntro")} />
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

      {stats.loading ? <StatsSkeleton n={8} /> : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {cards.map(([label, v, unit, warn, dec], i) => (
            <motion.div key={label} {...rise(i)}>
              <Card className="h-full p-4">
                <p className={`font-heading text-4xl tnum ${warn && v ? "text-attention" : ""}`}>
                  {v === null || v === undefined ? "-" : <><CountUp to={v} decimals={dec ?? 0} />{unit}</>}
                </p>
                <p className="text-muted">{label}</p>
              </Card>
            </motion.div>
          ))}
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
