import { Search } from "lucide-react";
import { m as motion } from "motion/react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { PipelineBadge } from "./PatientReview";
import { Badge, EmptyState, ListSkeleton, PageHead, Pager } from "../../components/ui";
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
          <Search size={18} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted" aria-hidden />
          <input id="pt-search" className="field pl-9" value={search} onChange={(e) => { setSearch(e.target.value); setOffset(0); }} placeholder={t("searchPatients")} />
        </div>
      </div>
      {list.error && <p role="alert" className="text-attention">{list.error}</p>}
      {list.loading && <ListSkeleton rows={5} />}
      {list.data && list.data.rows.length === 0 && <EmptyState title={t("noPatients")} text={t("noPatientsText")} />}
      <ul className="space-y-2">
        {list.data?.rows.map((p, i) => (
          <motion.li key={p.document_id} {...rise(i)}>
            <Link to={`/patients/${p.document_id}`} className="card flex flex-wrap items-center justify-between gap-3 p-4 text-text no-underline hover:no-underline">
              <span className="min-w-0">
                <strong className="block text-ink">{p.patient_alias}</strong>
                <span className="text-muted">{p.title}. {p.department}. {t("leftHospital")} {fmtDate(p.discharge_date)}.</span>
              </span>
              <span className="flex flex-wrap gap-2">
                <PipelineBadge stage={p.pipeline} />
                {p.plan_state === "doctor_checked" && <Badge tone="good">{t("planChecked")}</Badge>}
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

export { DoctorPatient } from "./PatientReview";
