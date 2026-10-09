import { MagnifyingGlass } from "@phosphor-icons/react";
import { AnimatePresence, m as motion } from "motion/react";
import { useState } from "react";
import { Badge, Button, Card, EmptyState, ListSkeleton, PageHead, Pager, Select } from "../../components/ui";
import { api } from "../../lib/api";
import { useLang } from "../../lib/lang";
import { ago, useMotionT, useStagger } from "../../lib/motion";
import { invalidate, useDebounced, useQuery } from "../../lib/query";
import { toast } from "../../lib/toast";
import type { DoctorRow, ReviewEntry } from "../../lib/types";

const LIMIT = 25;
type View = "all" | "unassigned" | "overdue";

function Row({ r, doctors }: { r: ReviewEntry; doctors: DoctorRow[] }) {
  const { t } = useLang();
  const mt = useMotionT();
  const [to, setTo] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const go = async () => {
    setBusy(true);
    setErr(null);
    try {
      await api.assign(r.id, Number(to));
      toast(t("toastAssigned"));
      setTo("");
      invalidate("admin/queue");
      invalidate("admin/doctors");
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <motion.li layout exit={{ opacity: 0 }} transition={mt(0.2)}>
      <Card className="flex flex-wrap items-center justify-between gap-3 p-3">
        <div className="min-w-0 space-y-1">
          <p className="flex flex-wrap items-center gap-2">
            <strong>{r.patient_alias}</strong>
            <span className="text-muted">{r.department}</span>
            {r.codes.slice(0, 2).map((c) => <Badge key={c} tone="warn" className="font-mono text-xs">{c}</Badge>)}
          </p>
          <p className="text-sm text-muted">
            {t("waited")} <span className="tnum">{ago(r.age_hours)}</span>. {r.assigned_doctor ? `${t("assignedTo")} ${r.assigned_doctor.name}` : <span className="text-attention">{t("unassigned")}</span>}
            {r.fallback_doctor && `. ${t("backup")}: ${r.fallback_doctor.name}`}
          </p>
          {err && <p role="alert" className="text-sm text-attention">{err}</p>}
        </div>
        <div className="flex items-end gap-2">
          <Select label={t("assignTo")} value={to} onChange={(e) => setTo(e.target.value)}>
            <option value="">{t("chooseDoctor")}</option>
            {doctors.filter((d) => d.active && d.id !== r.assigned_doctor?.id).map((d) => <option key={d.id} value={d.id}>{d.name}{d.available ? "" : ` (${t("unavailable")})`}</option>)}
          </Select>
          <Button small loading={busy} disabled={!to} onClick={go}>{r.assigned_doctor ? t("reassign") : t("assign")}</Button>
        </div>
      </Card>
    </motion.li>
  );
}

export default function Reviews() {
  const { t } = useLang();
  const [view, setView] = useState<View>("all");
  const [doc, setDoc] = useState("");
  const [search, setSearch] = useState("");
  const q = useDebounced(search.trim());
  const [offset, setOffset] = useState(0);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [bulkBusy, setBulkBusy] = useState(false);
  const rise = useStagger("admin-reviews");

  const doctors = useQuery("admin/doctors", api.adminDoctors);
  const list = useQuery(`admin/queue/${view}/${doc}/${q}/${offset}`, () => api.adminQueue({
    unassigned: view === "unassigned", overdue: view === "overdue", doctor_id: doc ? Number(doc) : undefined, q: q || undefined, limit: LIMIT, offset,
  }));
  const away = doctors.data?.filter((d) => (!d.available || !d.active) && d.open_items > 0) ?? [];
  const reset = (fn: () => void) => () => { fn(); setOffset(0); };

  const bulk = async () => {
    if (!from) return;
    setBulkBusy(true);
    try {
      const r = await api.bulkReassign(Number(from), to ? Number(to) : undefined);
      toast(t("toastMoved").replace("{n}", String(r.moved)));
      setFrom("");
      invalidate("admin");
    } finally {
      setBulkBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHead title={t("reviewAssignment")} text={t("reviewAssignmentIntro")} />
      {away.length > 0 && (
        <p className="rounded-sm border border-attention bg-attention-tint p-3 text-attention">
          {away.map((d) => `${d.name} (${d.open_items})`).join(", ")}: {t("awayWithItems")}
        </p>
      )}

      <Card className="space-y-3 p-4">
        <h2 className="text-xl">{t("bulkReassign")}</h2>
        <div className="flex flex-wrap items-end gap-3">
          <Select label={t("moveAllFrom")} value={from} onChange={(e) => setFrom(e.target.value)}>
            <option value="">{t("chooseDoctor")}</option>
            {doctors.data?.filter((d) => d.open_items > 0).map((d) => <option key={d.id} value={d.id}>{d.name} ({d.open_items})</option>)}
          </Select>
          <Select label={t("moveTo")} value={to} onChange={(e) => setTo(e.target.value)}>
            <option value="">{t("bestAvailable")}</option>
            {doctors.data?.filter((d) => d.active && d.available && String(d.id) !== from).map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </Select>
          <Button onClick={bulk} loading={bulkBusy} disabled={!from}>{t("moveItems")}</Button>
        </div>
      </Card>

      <div className="flex flex-wrap items-end gap-3">
        <div role="group" aria-label={t("view")} className="flex gap-2">
          {(["all", "unassigned", "overdue"] as View[]).map((v) => (
            <Button key={v} small look={view === v ? "solid" : "quiet"} aria-pressed={view === v} onClick={reset(() => setView(v))}>{t(`view_${v}` as "view_all")}</Button>
          ))}
        </div>
        <Select label={t("doctor")} value={doc} onChange={(e) => reset(() => setDoc(e.target.value))()}>
          <option value="">{t("allDoctors")}</option>
          {doctors.data?.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
        </Select>
        <div className="min-w-[12rem]">
          <label htmlFor="ar-search" className="mb-1 block text-sm font-semibold">{t("search")}</label>
          <div className="relative">
            <MagnifyingGlass size={18} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted" aria-hidden />
            <input id="ar-search" className="field pl-9" value={search} onChange={(e) => { setSearch(e.target.value); setOffset(0); }} placeholder={t("searchPatients")} />
          </div>
        </div>
      </div>

      {list.error && <p role="alert" className="text-attention">{list.error}</p>}
      {list.loading && <ListSkeleton rows={5} />}
      {list.data && list.data.rows.length === 0 && <EmptyState title={t("nothingHere")} text={t("nothingHereText")} />}
      <motion.ul {...rise(0)} className="space-y-2">
        <AnimatePresence initial={false}>
          {list.data?.rows.map((r) => <Row key={r.id} r={r} doctors={doctors.data ?? []} />)}
        </AnimatePresence>
      </motion.ul>
      {list.data && <Pager offset={offset} limit={LIMIT} total={list.data.total} onPage={setOffset} labels={{ prev: t("previous"), next: t("next"), of: t("of") }} />}
    </div>
  );
}
