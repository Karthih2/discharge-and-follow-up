import { PhoneCall } from "@phosphor-icons/react";
import { AnimatePresence, m as motion } from "motion/react";
import { useState } from "react";
import { Badge, Button, Card, EmptyState, ListSkeleton, PageHead, Textarea } from "../../components/ui";
import { api } from "../../lib/api";
import { useLang } from "../../lib/lang";
import { fmtDate, useMotionT, useStagger } from "../../lib/motion";
import { invalidate, useQuery } from "../../lib/query";
import { toast } from "../../lib/toast";
import type { Callback } from "../../lib/types";

const OPEN = ["requested", "scheduled", "connecting"];
const TABS = ["open", "completed", "no_answer"] as const;

function Row({ c }: { c: Callback }) {
  const { t } = useLang();
  const mt = useMotionT();
  const [notes, setNotes] = useState(c.call_notes ?? "");
  const [busy, setBusy] = useState<string | null>(null);
  const [when, setWhen] = useState(false);
  const [at, setAt] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const open = OPEN.includes(c.state);

  const act = async (action: "complete" | "no_answer" | "reschedule" | "notes") => {
    setErr(null);
    setBusy(action);
    try {
      await api.callbackAct(c.id, { action, call_notes: notes, scheduled_for: action === "reschedule" ? at : undefined });
      toast(action === "notes" ? t("toastNotesSaved") : action === "reschedule" ? t("toastRescheduled") : t("toastCallbackDone"));
      invalidate("doctor");
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  return (
    <motion.li layout exit={{ opacity: 0 }} transition={mt(0.2)}>
      <Card className="space-y-3 p-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="flex min-w-0 items-start gap-3">
            <PhoneCall size={24} weight="duotone" className="mt-1 shrink-0 text-primary" aria-hidden />
            <div className="min-w-0">
              <p><strong>{c.patient_alias}</strong> {t("askedAbout")} {c.item_title}.</p>
              <p className="font-mono text-sm text-muted">{c.masked_number}</p>
              {c.note && <p className="text-muted">{t("patientSaid")}: {c.note}</p>}
              {c.scheduled_for && <p className="text-sm tnum">{t("scheduledFor")} {fmtDate(c.scheduled_for, { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}</p>}
            </div>
          </div>
          <Badge tone={open ? "warn" : "good"}>{t(`call_${c.state}` as "call_requested")}</Badge>
        </div>
        <Textarea label={t("callNotes")} className="h-16" value={notes} onChange={(e) => setNotes(e.target.value)} />
        {when && (
          <div className="max-w-xs">
            <label htmlFor={`at-${c.id}`} className="mb-1 block text-sm font-semibold">{t("newTime")}</label>
            <input id={`at-${c.id}`} type="datetime-local" className="field" value={at} onChange={(e) => setAt(e.target.value)} />
          </div>
        )}
        {err && <p role="alert" className="text-attention">{err}</p>}
        <div className="flex flex-wrap gap-2">
          <Button small look="quiet" onClick={() => act("notes")} loading={busy === "notes"} disabled={notes === (c.call_notes ?? "")}>{t("saveNotes")}</Button>
          {open && (
            <>
              <Button small onClick={() => act("complete")} loading={busy === "complete"}>{t("markCompleted")}</Button>
              <Button small look="quiet" onClick={() => act("no_answer")} loading={busy === "no_answer"}>{t("noAnswer")}</Button>
              {when ? (
                <Button small look="quiet" onClick={() => act("reschedule")} loading={busy === "reschedule"} disabled={!at}>{t("saveNewTime")}</Button>
              ) : (
                <Button small look="quiet" onClick={() => setWhen(true)}>{t("reschedule")}</Button>
              )}
            </>
          )}
        </div>
      </Card>
    </motion.li>
  );
}

export default function DoctorCallbacks() {
  const { t } = useLang();
  const [tab, setTab] = useState<(typeof TABS)[number]>("open");
  const cbs = useQuery("doctor/callbacks", () => api.callbacks());
  const rise = useStagger("doctor-callbacks");
  const rows = (cbs.data?.rows ?? []).filter((c) => (tab === "open" ? OPEN.includes(c.state) : c.state === tab));
  const label = { open: t("tabOpen"), completed: t("tabCompleted"), no_answer: t("tabNoAnswer") };

  return (
    <div className="space-y-5">
      <PageHead title={t("callbacks")} text={t("callbacksIntro")} />
      <div className="flex flex-wrap gap-2" role="tablist" aria-label={t("callbacks")}>
        {TABS.map((k) => (
          <Button key={k} small role="tab" aria-selected={tab === k} look={tab === k ? "solid" : "quiet"} onClick={() => setTab(k)}>{label[k]}</Button>
        ))}
      </div>
      {cbs.error && <p role="alert" className="text-attention">{cbs.error}</p>}
      {cbs.loading && <ListSkeleton rows={3} />}
      {cbs.data && rows.length === 0 && <EmptyState title={t("noCallbacks")} text={t("noCallbacksText")} />}
      <motion.ul {...rise(0)} className="space-y-3">
        <AnimatePresence initial={false}>
          {rows.map((c) => <Row key={c.id} c={c} />)}
        </AnimatePresence>
      </motion.ul>
    </div>
  );
}
