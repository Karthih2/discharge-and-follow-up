import { ClipboardText, Clock, Pulse, UsersFour, WarningCircle } from "@phosphor-icons/react";
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

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

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

  const statIcons = [ClipboardText, WarningCircle, Clock, UsersFour];
  const stats: [string, number | undefined, string, boolean][] = [
    [t("openReviews"), h?.open_reviews, "/queue", false],
    [t("overdueReviews"), h?.overdue_reviews, "/queue", true],
    [t("callbacksWaiting"), h?.callbacks_waiting, "/callbacks", false],
    [t("patientsOverdue"), h?.patients_overdue, "/patients", true],
  ];

  return (
    <div className="space-y-8">
      {h && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}>
          <p className="text-muted text-sm">{greeting()}</p>
          <h1 className="font-heading text-3xl">{h.name.startsWith("Dr") ? h.name : `Dr. ${h.name}`}</h1>
          <p className="text-muted">{h.specialty}</p>
        </motion.div>
      )}

      {h && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}>
          <Card className="flex items-center gap-3 p-3">
            <span className="relative inline-flex">
              <Pulse size={26} weight="duotone" className={h.available ? "text-primary" : "text-muted"} aria-hidden />
              {h.available && <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-primary" style={{ animation: "pulse 2s infinite" }} />}
            </span>
            <div className="leading-tight">
              <p className="font-semibold">{h.available ? t("available") : t("unavailable")}</p>
              <p className="text-sm text-muted">{t("backup")}: {h.backup?.name ?? t("none")}</p>
            </div>
            <Button small look={h.available ? "quiet" : "attention"} loading={busy} onClick={toggle} aria-pressed={h.available}>{h.available ? t("setUnavailable") : t("setAvailable")}</Button>
          </Card>
        </motion.div>
      )}

      {!h && !home.loading && <PageHead title={t("myDay")} />}
      {home.error && <p role="alert" className="text-attention">{home.error}</p>}
      {h && !h.available && <p className="rounded-lg border border-attention bg-attention-tint p-3 text-attention">{t("youAreAway")}</p>}

      {home.loading ? <StatsSkeleton /> : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map(([label, n, to, warn], i) => {
            const Icon = statIcons[i];
            return (
              <motion.div key={label} {...rise(i)}>
                <Link to={to} className="block no-underline hover:no-underline">
                  <Card className="group relative overflow-hidden p-4 hover:border-primary transition-colors">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className={`font-heading text-4xl tnum ${warn && n ? "text-attention" : ""}`}><CountUp to={n ?? 0} /></p>
                        <p className="mt-1 text-muted">{label}</p>
                      </div>
                      <span className={`rounded-[10px] p-2 ${warn && n ? "bg-attention/8 text-attention" : "bg-primary/8 text-primary"}`}>
                        <Icon size={22} weight="duotone" aria-hidden />
                      </span>
                    </div>
                  </Card>
                </Link>
              </motion.div>
            );
          })}
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
