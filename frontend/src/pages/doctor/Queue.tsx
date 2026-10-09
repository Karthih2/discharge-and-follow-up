import { MagnifyingGlass } from "@phosphor-icons/react";
import { AnimatePresence, m as motion } from "motion/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { ReviewPane, type ReviewPaneHandle } from "../../components/ReviewPane";
import { Badge, Button, Card, EmptyState, ListSkeleton, PageHead, Select, Skeleton } from "../../components/ui";
import { api } from "../../lib/api";
import { useLang } from "../../lib/lang";
import { ago, useMotionT } from "../../lib/motion";
import { invalidate, useDebounced, useQuery } from "../../lib/query";
import { toast } from "../../lib/toast";
import type { ReviewEntry } from "../../lib/types";

const CODES = ["MISSING_DOSE", "VAGUE_WORDING", "MED_CHANGE", "MISSING_DATE", "SYMPTOM", "CONFLICT", "LOW_CONFIDENCE", "QUOTE_MISMATCH", "MODEL_FLAG", "PATIENT_FLAG", "OVERDUE"];
const typing = (el: EventTarget | null) => el instanceof HTMLElement && (el.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName));

export default function DoctorQueue() {
  const { t } = useLang();
  const mt = useMotionT();
  const [params, setParams] = useSearchParams();
  const [search, setSearch] = useState("");
  const q = useDebounced(search.trim(), 250);
  const [code, setCode] = useState("");
  const [patient, setPatient] = useState(params.get("plan") ?? "");
  const [showAll, setShowAll] = useState(false);
  const [limit, setLimit] = useState(100);
  const [gone, setGone] = useState<Set<number>>(new Set());
  const [pick, setPick] = useState<number | null>(null);
  const pane = useRef<ReviewPaneHandle>(null);

  const key = `review/${showAll ? "all" : "open"}/${q}/${code}/${limit}`;
  const queue = useQuery(key, () => api.review({ state: showAll ? "all" : "open", q: q || undefined, code: code || undefined, limit }));

  const rows = useMemo(
    () => (queue.data?.rows ?? []).filter((r) => !gone.has(r.id) && (!patient || String(r.document_id) === patient)),
    [queue.data, gone, patient],
  );
  const plans = useMemo(() => Array.from(new Map((queue.data?.rows ?? []).map((r) => [r.document_id, r.patient_alias]))), [queue.data]);
  const selected = rows.find((r) => r.id === pick) ?? rows[0] ?? null;
  const at = selected ? rows.indexOf(selected) : -1;

  const move = useCallback((d: number) => {
    if (!rows.length) return;
    const next = rows[Math.min(rows.length - 1, Math.max(0, at + d))];
    setPick(next.id);
    document.getElementById(`row-${next.id}`)?.scrollIntoView({ block: "nearest" });
  }, [rows, at]);

  // J and K move, C confirms, E corrects, S sends back. Ignored while typing in a field.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (typing(e.target) || e.ctrlKey || e.metaKey || e.altKey) return;
      const k = e.key.toLowerCase();
      if (k === "j") move(1);
      else if (k === "k") move(-1);
      else if (k === "c") pane.current?.confirm();
      else if (k === "e") { e.preventDefault(); pane.current?.correct(); }
      else if (k === "s") { e.preventDefault(); pane.current?.sendBack(); }
      else return;
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [move]);

  const act = async (r: ReviewEntry, body: Parameters<typeof api.resolve>[1]) => {
    await api.resolve(r.id, body);
    const nextId = rows[at + 1]?.id ?? rows[at - 1]?.id ?? null;
    setGone((g) => new Set(g).add(r.id));
    setPick(nextId);
    toast(body.action === "approve" ? t("toastConfirmed") : body.action === "edit" ? t("toastCorrected") : t("toastSentBack"));
    invalidate("review");
    invalidate("doctor/home");
    invalidate("doctor/patients");
  };

  useEffect(() => {
    if (patient) setParams({ plan: patient }, { replace: true });
    else if (params.get("plan")) setParams({}, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patient]);

  const total = queue.data?.total ?? 0;
  return (
    <div className="space-y-5">
      <PageHead title={t("reviewQueue")} text={t("reviewQueueIntro")} />

      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-[12rem] flex-1">
          <label htmlFor="rq-search" className="mb-1 block text-sm font-semibold">{t("search")}</label>
          <div className="relative">
            <MagnifyingGlass size={18} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted" aria-hidden />
            <input id="rq-search" className="field pl-9" value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t("searchQueue")} />
          </div>
        </div>
        <Select label={t("reason")} value={code} onChange={(e) => setCode(e.target.value)}>
          <option value="">{t("allReasons")}</option>
          {CODES.map((c) => <option key={c} value={c}>{c}</option>)}
        </Select>
        <Select label={t("patient")} value={patient} onChange={(e) => setPatient(e.target.value)}>
          <option value="">{t("allPatients")}</option>
          {plans.map(([id, alias]) => <option key={id} value={id}>{alias}</option>)}
        </Select>
        <Button look="quiet" onClick={() => { setShowAll(!showAll); setLimit(100); }} aria-pressed={showAll}>{showAll ? t("hideResolved") : t("showResolved")}</Button>
      </div>
      <p className="text-sm text-muted"><kbd className="kbd">J</kbd> <kbd className="kbd">K</kbd> {t("shortcutMove")}. <kbd className="kbd">C</kbd> {t("confirm")}. <kbd className="kbd">E</kbd> {t("correct")}. <kbd className="kbd">S</kbd> {t("sendBack")}.</p>

      {queue.error && <p role="alert" className="text-attention">{queue.error}</p>}
      {queue.loading && (
        <div className="grid gap-4 lg:grid-cols-[22rem_1fr]"><ListSkeleton rows={5} /><Card className="space-y-3 p-4"><Skeleton className="h-8 w-1/2" /><Skeleton className="h-40 w-full" /></Card></div>
      )}
      {queue.data && rows.length === 0 && <EmptyState title={t("queueEmpty")} text={t("queueEmptyText")} />}

      {queue.data && rows.length > 0 && (
        <div className="grid items-start gap-4 lg:grid-cols-[22rem_1fr]">
          <div>
            <ul className="max-h-[70vh] space-y-2 overflow-y-auto pr-1" aria-label={t("reviewQueue")}>
              <AnimatePresence initial={false}>
                {rows.map((r) => (
                  <motion.li layout key={r.id} id={`row-${r.id}`} exit={{ opacity: 0 }} transition={mt(0.18)}>
                    <button onClick={() => setPick(r.id)} aria-current={selected?.id === r.id}
                      className={`w-full rounded-sm border p-3 text-left ${selected?.id === r.id ? "border-primary bg-surface" : "border-line bg-bg hover:border-primary"}`}>
                      <span className="flex flex-wrap items-center gap-1">
                        {r.codes.slice(0, 2).map((c) => <Badge key={c} tone="warn" className="font-mono text-xs">{c}</Badge>)}
                        {r.state !== "open" && <Badge tone="mark">{t(`state_${r.state}` as "state_approved")}</Badge>}
                      </span>
                      <span className="mt-1 block font-semibold">{r.item?.title}</span>
                      <span className="block text-sm text-muted">{r.patient_alias}</span>
                      <span className="flex justify-between text-sm text-muted"><span>{r.department}</span><span className="tnum">{ago(r.age_hours)}</span></span>
                    </button>
                  </motion.li>
                ))}
              </AnimatePresence>
            </ul>
            {total > (queue.data.rows.length) && <Button look="quiet" small className="mt-2" onClick={() => setLimit(limit + 100)}>{t("showMore")} ({queue.data.rows.length} / {total})</Button>}
          </div>
          <Card className="min-w-0 p-4">
            <AnimatePresence mode="wait" initial={false}>
              {selected && (
                <motion.div key={selected.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={mt(0.15)}>
                  <ReviewPane ref={pane} r={selected} onAct={act} />
                </motion.div>
              )}
            </AnimatePresence>
          </Card>
        </div>
      )}
    </div>
  );
}
