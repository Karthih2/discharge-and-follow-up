import { MagnifyingGlass } from "@phosphor-icons/react";
import { m as motion } from "motion/react";
import { useState } from "react";
import { Badge, Card, EmptyState, ListSkeleton, PageHead, Pager } from "../../components/ui";
import { api } from "../../lib/api";
import { useLang } from "../../lib/lang";
import { fmtDate, useStagger } from "../../lib/motion";
import { useDebounced, useQuery } from "../../lib/query";

const LIMIT = 25;

export default function AdminPatients() {
  const { t } = useLang();
  const [search, setSearch] = useState("");
  const q = useDebounced(search.trim());
  const [offset, setOffset] = useState(0);
  const list = useQuery(`admin/patients/${q}/${offset}`, () => api.adminPatients({ q: q || undefined, limit: LIMIT, offset }));
  const rise = useStagger("admin-patients");

  return (
    <div className="space-y-5">
      <PageHead title={t("patients")} text={t("adminPatientsIntro")} />
      <div className="max-w-sm">
        <label htmlFor="ap-search" className="mb-1 block text-sm font-semibold">{t("search")}</label>
        <div className="relative">
          <MagnifyingGlass size={18} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted" aria-hidden />
          <input id="ap-search" className="field pl-9" value={search} onChange={(e) => { setSearch(e.target.value); setOffset(0); }} placeholder={t("searchPatients")} />
        </div>
      </div>
      {list.error && <p role="alert" className="text-attention">{list.error}</p>}
      {list.loading && <ListSkeleton rows={6} />}
      {list.data && list.data.rows.length === 0 && <EmptyState title={t("noPatients")} />}
      {list.data && list.data.rows.length > 0 && (
        <Card className="overflow-x-auto">
          <table className="w-full min-w-[40rem] text-left">
            <thead className="border-b border-line bg-bg text-sm">
              <tr>{[t("patient"), t("city"), t("plans"), t("completionRate"), t("overdue"), t("lastActivity")].map((h) => <th key={h} className="px-3 py-2 font-semibold">{h}</th>)}</tr>
            </thead>
            <tbody>
              {list.data.rows.map((p, i) => (
                <motion.tr key={p.id} {...rise(i)} className="border-t border-line">
                  <td className="px-3 py-2 font-semibold">{p.alias}</td>
                  <td className="px-3 py-2">{p.city ?? "-"}</td>
                  <td className="px-3 py-2 tnum">{p.plans}</td>
                  <td className="px-3 py-2 tnum">{p.completion_rate}%</td>
                  <td className="px-3 py-2">{p.overdue_tasks > 0 ? <Badge tone="warn">{p.overdue_tasks}</Badge> : <span className="tnum">0</span>}</td>
                  <td className="px-3 py-2 tnum text-muted">{p.last_activity ? fmtDate(p.last_activity, { day: "numeric", month: "short" }) : "-"}</td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
      {list.data && <Pager offset={offset} limit={LIMIT} total={list.data.total} onPage={setOffset} labels={{ prev: t("previous"), next: t("next"), of: t("of") }} />}
    </div>
  );
}
