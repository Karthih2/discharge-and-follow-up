import { MagnifyingGlass } from "@phosphor-icons/react";
import { m as motion } from "motion/react";
import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { StatusBadge } from "../../components/StatusBadge";
import { Badge, Card, EmptyState, ListSkeleton, PageHead, Pager } from "../../components/ui";
import { api } from "../../lib/api";
import { useLang } from "../../lib/lang";
import { fmtDate, useStagger } from "../../lib/motion";
import { useDebounced, useQuery } from "../../lib/query";

const LIMIT = 20;

export function DoctorPatients() {
  const { t } = useLang();
  const [search, setSearch] = useState("");
  const q = useDebounced(search.trim());
  const [offset, setOffset] = useState(0);
  const list = useQuery(`doctor/patients/${q}/${offset}`, () => api.doctorPatients({ q: q || undefined, limit: LIMIT, offset }));
  const rise = useStagger("doctor-patients");

  return (
    <div className="space-y-5">
      <PageHead title={t("patients")} text={t("doctorPatientsIntro")} />
      <div className="max-w-sm">
        <label htmlFor="pt-search" className="mb-1 block text-sm font-semibold">{t("search")}</label>
        <div className="relative">
          <MagnifyingGlass size={18} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted" aria-hidden />
          <input id="pt-search" className="field pl-9" value={search} onChange={(e) => { setSearch(e.target.value); setOffset(0); }} placeholder={t("searchPatients")} />
        </div>
      </div>
      {list.error && <p role="alert" className="text-attention">{list.error}</p>}
      {list.loading && <ListSkeleton rows={5} />}
      {list.data && list.data.rows.length === 0 && <EmptyState title={t("noPatients")} text={t("noPatientsText")} />}
      <ul className="space-y-2">
        {list.data?.rows.map((p, i) => (
          <motion.li key={p.document_id} {...rise(i)}>
            <Link to={`/patients/${p.document_id}`} className="card flex flex-wrap items-center justify-between gap-3 p-4 no-underline hover:border-primary hover:no-underline">
              <span className="min-w-0">
                <strong className="block">{p.patient_alias}</strong>
                <span className="text-muted">{p.title}. {p.department}. {t("leftHospital")} {fmtDate(p.discharge_date)}.</span>
              </span>
              <span className="flex flex-wrap gap-2">
                {p.open_reviews > 0 && <Badge tone="warn">{p.open_reviews} {t("open")}</Badge>}
                {p.overdue_tasks > 0 && <Badge tone="warn">{p.overdue_tasks} {t("overdue")}</Badge>}
                <Badge>{p.reviewed} {t("reviewedWord")}</Badge>
              </span>
            </Link>
          </motion.li>
        ))}
      </ul>
      {list.data && <Pager offset={offset} limit={LIMIT} total={list.data.total} onPage={setOffset} labels={{ prev: t("previous"), next: t("next"), of: t("of") }} />}
    </div>
  );
}

/** One patient's plan, read only, with the review history for that plan. */
export function DoctorPatient() {
  const { t } = useLang();
  const id = Number(useParams().id);
  const plan = useQuery(`plan/${id}/en`, () => api.plan(id, "en"));
  const hist = useQuery(`review/all/doc${id}`, () => api.review({ state: "all", document_id: id, limit: 200 }));
  const p = plan.data;

  return (
    <div className="space-y-8">
      <Link to="/patients">{t("backToPatients")}</Link>
      <PageHead title={p?.document.patient_alias ?? t("patient")} text={p ? `${p.document.title}. ${t("leftHospital")} ${fmtDate(p.document.discharge_date)}. ${t("readOnly")}` : undefined} />
      {(plan.error || hist.error) && <p role="alert" className="text-attention">{plan.error ?? hist.error}</p>}
      <section aria-labelledby="h-plan" className="space-y-3">
        <h2 id="h-plan" className="text-2xl">{t("planItems")}</h2>
        {plan.loading && <ListSkeleton rows={4} />}
        <ul className="space-y-2">
          {p?.items.map((i) => (
            <li key={i.id}>
              <Card className="space-y-1 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <strong>{i.title}</strong>
                  <StatusBadge status={i.status} />
                </div>
                <p className="font-mono text-[0.92rem] text-muted">{i.original_text}</p>
                {i.date_resolved && <p className="text-sm text-muted tnum">{fmtDate(i.date_resolved)}</p>}
              </Card>
            </li>
          ))}
        </ul>
      </section>
      <section aria-labelledby="h-hist" className="space-y-3">
        <h2 id="h-hist" className="text-2xl">{t("reviewHistory")}</h2>
        {hist.loading && <ListSkeleton rows={3} />}
        {hist.data && hist.data.rows.length === 0 && <p className="text-muted">{t("noHistory")}</p>}
        <ul className="rule-list card px-4">
          {hist.data?.rows.map((r) => (
            <li key={r.id} className="flex flex-wrap items-baseline justify-between gap-2 py-2.5">
              <span className="min-w-0"><strong>{r.item?.title}</strong> {r.reviewer_note && <span className="text-muted">{r.reviewer_note}</span>}</span>
              <span className="flex items-center gap-2">
                <Badge tone={r.state === "open" ? "warn" : "mark"}>{t(`state_${r.state}` as "state_approved")}</Badge>
                <span className="tnum text-sm text-muted">{fmtDate(r.resolved_at ?? r.created_at, { day: "numeric", month: "short" })}</span>
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
