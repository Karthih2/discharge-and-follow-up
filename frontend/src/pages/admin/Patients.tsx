import { ChevronRight, Search } from "lucide-react";
import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Badge, Card, EmptyState, ListSkeleton, PageHead, Pager } from "../../components/ui";
import { api } from "../../lib/api";
import { useLang } from "../../lib/lang";
import { fmtDate } from "../../lib/motion";
import { useDebounced, useQuery } from "../../lib/query";

const LIMIT = 25;

/** Patients for management. Opens on "Needs you now": only the people someone should act on today. */
export default function AdminPatients() {
  const { t } = useLang();
  const [params, setParams] = useSearchParams();
  const all = params.get("view") === "all";
  const [search, setSearch] = useState("");
  const q = useDebounced(search.trim());
  const [offset, setOffset] = useState(0);
  const list = useQuery(`admin/patients/${all ? "all" : "now"}/${q}/${offset}`, () => api.adminPatients({ q: q || undefined, attention: !all, limit: LIMIT, offset }));
  const setView = (v: "now" | "all") => { setOffset(0); setParams(v === "all" ? { view: "all" } : {}, { replace: true }); };

  return (
    <div className="space-y-5">
      <PageHead title={all ? t("patients") : t("needsYouNow")} text={all ? t("adminPatientsIntro") : t("needsYouNowText")} />
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="seg" role="tablist" aria-label={t("patients")}>
          <button type="button" role="tab" aria-selected={!all} onClick={() => setView("now")}>{t("needsYouNow")}</button>
          <button type="button" role="tab" aria-selected={all} onClick={() => setView("all")}>{t("allPatientsTab")}</button>
        </div>
        <div className="w-full max-w-sm">
          <label htmlFor="ap-search" className="sr-only">{t("search")}</label>
          <div className="relative">
            <Search size={18} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted" aria-hidden />
            <input id="ap-search" className="field pl-9" value={search} onChange={(e) => { setSearch(e.target.value); setOffset(0); }} placeholder={t("searchPatients")} />
          </div>
        </div>
      </div>
      {list.error && <p role="alert" className="text-attention">{list.error}</p>}
      {list.loading && <ListSkeleton rows={6} />}
      {list.data && list.data.rows.length === 0 && <EmptyState title={all ? t("noPatients") : t("noOneNeeds")} />}
      {list.data && list.data.rows.length > 0 && (
        <Card className="overflow-x-auto">
          <table className="w-full min-w-[44rem] text-left">
            <thead className="border-b border-line bg-[#f6f9fa] text-sm text-muted">
              <tr>{[t("patient"), t("city"), t("status"), t("completionRate"), t("lastActivity"), ""].map((h, i) => <th key={i} className="px-4 py-2.5 font-medium">{h}</th>)}</tr>
            </thead>
            <tbody>
              {list.data.rows.map((p) => (
                <tr key={p.id} className="border-t border-line transition-colors hover:bg-brand-50/60">
                  <td className="px-4 py-3"><Link to={`/patients/${p.id}`} className="font-semibold text-ink">{p.alias}</Link><span className="block text-xs text-muted">{p.plans} {t("plans").toLowerCase()}</span></td>
                  <td className="px-4 py-3">{p.city ?? "-"}</td>
                  <td className="px-4 py-3">
                    <span className="flex flex-wrap gap-1.5">
                      {p.overdue_tasks > 0 && <Badge tone="warn">{p.overdue_tasks} {t("overdue").toLowerCase()}</Badge>}
                      {p.open_reviews > 0 && <Badge tone="mark">{p.open_reviews} {t("openReviews").toLowerCase()}</Badge>}
                      {p.open_callbacks > 0 && <Badge>{p.open_callbacks} {t("callbacks").toLowerCase()}</Badge>}
                      {!p.overdue_tasks && !p.open_reviews && !p.open_callbacks && (p.plan_state === "doctor_checked" ? <Badge tone="good">{t("planChecked")}</Badge> : <span className="text-sm text-muted">-</span>)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="meter w-20"><i style={{ width: `${Math.min(100, p.completion_rate)}%` }} /></div>
                      <span className="tnum text-sm">{p.completion_rate}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 tnum text-sm text-muted">{p.last_activity ? fmtDate(p.last_activity, { day: "numeric", month: "short" }) : "-"}</td>
                  <td className="px-4 py-3 text-right"><Link to={`/patients/${p.id}`} aria-label={`${t("details")}: ${p.alias}`} className="inline-flex text-muted hover:text-brand-700"><ChevronRight size={18} /></Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
      {list.data && <Pager offset={offset} limit={LIMIT} total={list.data.total} onPage={setOffset} labels={{ prev: t("previous"), next: t("next"), of: t("of") }} />}
    </div>
  );
}
