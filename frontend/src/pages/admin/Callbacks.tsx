import { PhoneCall } from "@phosphor-icons/react";
import { AnimatePresence, m as motion } from "motion/react";
import { useState } from "react";
import { Badge, Button, Card, EmptyState, ListSkeleton, PageHead, Pager, Select } from "../../components/ui";
import { api } from "../../lib/api";
import { useLang } from "../../lib/lang";
import { fmtDate, useMotionT, useStagger } from "../../lib/motion";
import { invalidate, useDebounced, useQuery } from "../../lib/query";
import { toast } from "../../lib/toast";
import type { Callback, DoctorRow } from "../../lib/types";

const LIMIT = 25;
const STATES = ["open", "requested", "scheduled", "connecting", "completed", "no_answer", ""] as const;

function Row({ c, doctors }: { c: Callback; doctors: DoctorRow[] }) {
  const { t } = useLang();
  const mt = useMotionT();
  const [busy, setBusy] = useState<string | null>(null);
  const [to, setTo] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const run = async (kind: string, fn: () => Promise<unknown>, ok: string) => {
    setBusy(kind);
    setErr(null);
    try {
      await fn();
      toast(ok);
      invalidate("admin/callbacks");
      invalidate("admin/doctors");
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(null);
    }
  };
  const open = ["requested", "scheduled", "connecting"].includes(c.state);
  return (
    <motion.li layout exit={{ opacity: 0 }} transition={mt(0.2)}>
      <Card className="space-y-3 p-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="flex min-w-0 items-start gap-3">
            <PhoneCall size={22} weight="duotone" className="mt-1 shrink-0 text-primary" aria-hidden />
            <div className="min-w-0">
              <p><strong>{c.patient_alias}</strong> <span className="text-muted">{c.department}</span></p>
              <p className="font-mono text-sm text-muted">{c.masked_number}</p>
              <p className="text-sm text-muted">{c.doctor ? `${t("assignedTo")} ${c.doctor.name}` : t("unassigned")}. {fmtDate(c.created_at, { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}
                {c.scheduled_for && `. ${t("scheduledFor")} ${fmtDate(c.scheduled_for, { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}`}</p>
            </div>
          </div>
          <Badge tone={open ? "warn" : "good"}>{t(`call_${c.state}` as "call_requested")}</Badge>
        </div>
        {open && (
          <div className="flex flex-wrap items-end gap-2">
            <Select label={t("assignTo")} value={to} onChange={(e) => setTo(e.target.value)}>
              <option value="">{t("chooseDoctor")}</option>
              {doctors.filter((d) => d.active && d.id !== c.doctor?.id).map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </Select>
            <Button small look="quiet" disabled={!to} loading={busy === "assign"} onClick={() => run("assign", () => api.callbackAssign(c.id, Number(to)), t("toastAssigned"))}>{t("assign")}</Button>
            {c.state !== "connecting" && <Button small loading={busy === "start"} onClick={() => run("start", () => api.callbackStart(c.id), t("toastCallStarted"))}>{t("startCall")}</Button>}
            {c.state === "connecting" && (
              <>
                <Button small loading={busy === "done"} onClick={() => run("done", () => api.callbackComplete(c.id), t("toastCallbackDone"))}>{t("markCompleted")}</Button>
                <Button small look="quiet" loading={busy === "na"} onClick={() => run("na", () => api.callbackNoAnswer(c.id), t("toastNoAnswer"))}>{t("noAnswer")}</Button>
              </>
            )}
          </div>
        )}
        {err && <p role="alert" className="text-attention">{err}</p>}
      </Card>
    </motion.li>
  );
}

export default function AdminCallbacks() {
  const { t } = useLang();
  const [state, setState] = useState<(typeof STATES)[number]>("open");
  const [doc, setDoc] = useState("");
  const [search, setSearch] = useState("");
  const q = useDebounced(search.trim());
  const [offset, setOffset] = useState(0);
  const rise = useStagger("admin-callbacks");
  const doctors = useQuery("admin/doctors", api.adminDoctors);
  const list = useQuery(`admin/callbacks/${state}/${doc}/${q}/${offset}`, () => api.adminCallbacks({ state: state || undefined, doctor_id: doc ? Number(doc) : undefined, q: q || undefined, limit: LIMIT, offset }));

  return (
    <div className="space-y-5">
      <PageHead title={t("callbacks")} text={t("adminCallbacksIntro")} />
      <div className="flex flex-wrap items-end gap-3">
        <Select label={t("status")} value={state} onChange={(e) => { setState(e.target.value as typeof state); setOffset(0); }}>
          {STATES.map((s) => <option key={s} value={s}>{s === "" ? t("allStatuses") : s === "open" ? t("tabOpen") : t(`call_${s}` as "call_requested")}</option>)}
        </Select>
        <Select label={t("doctor")} value={doc} onChange={(e) => { setDoc(e.target.value); setOffset(0); }}>
          <option value="">{t("allDoctors")}</option>
          {doctors.data?.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
        </Select>
        <div>
          <label htmlFor="cb-search" className="mb-1 block text-sm font-semibold">{t("search")}</label>
          <input id="cb-search" className="field" value={search} onChange={(e) => { setSearch(e.target.value); setOffset(0); }} placeholder={t("searchPatients")} />
        </div>
      </div>
      {list.error && <p role="alert" className="text-attention">{list.error}</p>}
      {list.loading && <ListSkeleton rows={4} />}
      {list.data && list.data.rows.length === 0 && <EmptyState title={t("noCallbacks")} text={t("noCallbacksText")} />}
      <motion.ul {...rise(0)} className="space-y-3">
        <AnimatePresence initial={false}>
          {list.data?.rows.map((c) => <Row key={c.id} c={c} doctors={doctors.data ?? []} />)}
        </AnimatePresence>
      </motion.ul>
      {list.data && <Pager offset={offset} limit={LIMIT} total={list.data.total} onPage={setOffset} labels={{ prev: t("previous"), next: t("next"), of: t("of") }} />}
    </div>
  );
}
