import { Pulse } from "@phosphor-icons/react";
import { m as motion } from "motion/react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { CountUp } from "../../components/CountUp";
import { Badge, Button, Card, EmptyState, LinkButton, ListSkeleton, PageHead, StatsSkeleton } from "../../components/ui";
import { api } from "../../lib/api";
import { useLang } from "../../lib/lang";
import { ago, useStagger } from "../../lib/motion";
import { invalidate, useQuery } from "../../lib/query";
import { toast } from "../../lib/toast";

export default function DoctorHome() {
  const { t } = useLang();
  const home = useQuery("doctor/home", api.doctorHome);
  const next = useQuery("review/open//preview", () => api.review({ limit: 5 }));
  const rise = useStagger("doctor-home");
  const [busy, setBusy] = useState(false);
  const h = home.data;

  const toggle = async () => {
    if (!h) return;
    setBusy(true);
    try {
      await api.setAvailability(!h.available);
      toast(h.available ? t("toastUnavailable") : t("toastAvailable"));
      invalidate("doctor");
      invalidate("review");
    } finally {
      setBusy(false);
    }
  };

  const stats: [string, number | undefined, string, boolean][] = [
    [t("openReviews"), h?.open_reviews, "/queue", false],
    [t("overdueReviews"), h?.overdue_reviews, "/queue", true],
    [t("callbacksWaiting"), h?.callbacks_waiting, "/callbacks", false],
    [t("patientsOverdue"), h?.patients_overdue, "/patients", true],
  ];

  return (
    <div className="space-y-8">
      <PageHead title={t("myDay")} text={h ? `${h.name}. ${h.specialty}.` : undefined}>
        {h && (
          <Card className="flex items-center gap-3 p-3">
            <span className="relative inline-flex"><Pulse size={26} weight="duotone" className={h.available ? "text-primary" : "text-muted"} aria-hidden /></span>
            <div className="leading-tight">
              <p className="font-semibold">{h.available ? t("available") : t("unavailable")}</p>
              <p className="text-sm text-muted">{t("backup")}: {h.backup?.name ?? t("none")}</p>
            </div>
            <Button small look={h.available ? "quiet" : "attention"} loading={busy} onClick={toggle} aria-pressed={h.available}>{h.available ? t("setUnavailable") : t("setAvailable")}</Button>
          </Card>
        )}
      </PageHead>
      {home.error && <p role="alert" className="text-attention">{home.error}</p>}
      {h && !h.available && <p className="rounded-sm border border-attention bg-attention-tint p-3 text-attention">{t("youAreAway")}</p>}

      {home.loading ? <StatsSkeleton /> : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map(([label, n, to, warn], i) => (
            <motion.div key={label} {...rise(i)}>
              <Link to={to} className="block no-underline hover:no-underline">
                <Card className="p-4 hover:border-primary">
                  <p className={`font-heading text-4xl tnum ${warn && n ? "text-attention" : ""}`}><CountUp to={n ?? 0} /></p>
                  <p className="text-muted">{label}</p>
                </Card>
              </Link>
            </motion.div>
          ))}
        </div>
      )}

      <section aria-labelledby="h-next" className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 id="h-next" className="text-2xl">{t("oldestFirst")}</h2>
          <LinkButton to="/queue" look="quiet" small>{t("openQueue")}</LinkButton>
        </div>
        {next.loading && <ListSkeleton rows={3} />}
        {next.data && next.data.rows.length === 0 && <EmptyState title={t("queueEmpty")} text={t("queueEmptyText")} />}
        <ul className="rule-list card px-4">
          {next.data?.rows.map((r, i) => (
            <motion.li key={r.id} {...rise(4 + i)} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
              <span className="min-w-0"><strong>{r.item?.title}</strong> <span className="text-muted">{r.patient_alias}</span></span>
              <span className="flex items-center gap-2">
                {r.codes.slice(0, 1).map((c) => <Badge key={c} tone="warn" className="font-mono text-xs">{c}</Badge>)}
                <span className="tnum text-muted">{ago(r.age_hours)}</span>
              </span>
            </motion.li>
          ))}
        </ul>
      </section>
    </div>
  );
}
