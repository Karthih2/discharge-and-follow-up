import { DownloadSimple } from "@phosphor-icons/react";
import { useState } from "react";
import { Button, Card, EmptyState, ListSkeleton, PageHead, Pager, Select } from "../../components/ui";
import { api } from "../../lib/api";
import { useLang } from "../../lib/lang";
import { fmtDate } from "../../lib/motion";
import { useQuery } from "../../lib/query";
import { toast } from "../../lib/toast";

const LIMIT = 50;
const detailText = (d: Record<string, unknown>) =>
  Object.entries(d).map(([k, v]) => `${k}: ${typeof v === "object" ? JSON.stringify(v) : String(v)}`).join(", ");

export default function Audit() {
  const { t } = useLang();
  const [f, setF] = useState({ actor: "", action: "", from: "", to: "" });
  const [offset, setOffset] = useState(0);
  const [busy, setBusy] = useState(false);
  const opts = useQuery("admin/audit-filters", api.auditFilters);
  const q = { actor: f.actor || undefined, action: f.action || undefined, date_from: f.from || undefined, date_to: f.to || undefined };
  const list = useQuery(`admin/audit/${JSON.stringify(q)}/${offset}`, () => api.adminAudit({ ...q, limit: LIMIT, offset }));
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => { setF({ ...f, [k]: e.target.value }); setOffset(0); };
  const bad = f.from && f.to && f.from > f.to;

  const exportCsv = async () => {
    setBusy(true);
    try {
      await api.downloadAudit(q);
      toast(t("toastExported"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-5">
      <PageHead title={t("auditLog")} text={t("auditIntro")}>
        <Button look="quiet" onClick={exportCsv} loading={busy} disabled={!!bad}><DownloadSimple size={18} aria-hidden /> {t("exportCsv")}</Button>
      </PageHead>
      <div className="flex flex-wrap items-end gap-3">
        <Select label={t("actor")} value={f.actor} onChange={set("actor")}>
          <option value="">{t("everyone")}</option>
          {opts.data?.actors.map((a) => <option key={a.key} value={a.key}>{a.label}</option>)}
        </Select>
        <Select label={t("action")} value={f.action} onChange={set("action")}>
          <option value="">{t("allActions")}</option>
          {opts.data?.actions.map((a) => <option key={a} value={a}>{a}</option>)}
        </Select>
        <div><label htmlFor="au-from" className="mb-1 block text-sm font-semibold">{t("from")}</label><input id="au-from" type="date" className="field" value={f.from} onChange={set("from")} /></div>
        <div><label htmlFor="au-to" className="mb-1 block text-sm font-semibold">{t("to")}</label><input id="au-to" type="date" className="field" value={f.to} onChange={set("to")} /></div>
      </div>
      {bad && <p role="alert" className="text-attention">{t("errDates")}</p>}
      {list.error && <p role="alert" className="text-attention">{list.error}</p>}
      {list.loading && <ListSkeleton rows={6} />}
      {list.data && list.data.rows.length === 0 && <EmptyState title={t("nothingHere")} text={t("nothingHereText")} />}
      {list.data && list.data.rows.length > 0 && (
        <Card className="overflow-x-auto">
          <table className="w-full min-w-[44rem] text-left text-sm">
            <thead className="border-b border-line bg-bg"><tr>{[t("time"), t("actor"), t("action"), t("details")].map((h) => <th key={h} className="px-3 py-2 font-semibold">{h}</th>)}</tr></thead>
            <tbody>
              {list.data.rows.map((r) => (
                <tr key={r.id} className="border-t border-line align-top">
                  <td className="whitespace-nowrap px-3 py-1.5 tnum text-muted">{fmtDate(r.created_at, { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}</td>
                  <td className="px-3 py-1.5">{r.actor}</td>
                  <td className="px-3 py-1.5 font-mono text-xs">{r.action}</td>
                  <td className="px-3 py-1.5 text-muted">{detailText(r.detail)}</td>
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
