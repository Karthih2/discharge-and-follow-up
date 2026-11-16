import { CalendarPlus, Check, CheckCircle2, CornerUpRight, FileText, ListChecks, Loader2, RotateCcw, Trash2, XCircle } from "lucide-react";
import { useMemo, useState, type FormEvent } from "react";
import { Link, useParams } from "react-router-dom";
import { CategoryIcon } from "../../components/Fx";
import { Badge, Button, Card, Input, ListSkeleton, Select, Skeleton } from "../../components/ui";
import { api } from "../../lib/api";
import { useLang } from "../../lib/lang";
import { fmtDate } from "../../lib/motion";
import { invalidate, useQuery } from "../../lib/query";
import { toast } from "../../lib/toast";
import type { PipelineStage, PlanItem } from "../../lib/types";

const STAGE_TONE: Record<PipelineStage, string> = {
  queued: "border-line bg-white text-muted",
  processing: "border-sky-200 bg-sky-50 text-sky-800",
  failed: "border-red-200 bg-red-50 text-red-700",
  ready: "border-[#bfe9dc] bg-[#effaf6] text-[#0b5d4b]",
};

/** Where the summary is in the reading pipeline, in the words the ward uses. */
export function PipelineBadge({ stage }: { stage: PipelineStage }) {
  const { t } = useLang();
  const Icon = stage === "processing" ? Loader2 : stage === "failed" ? XCircle : stage === "ready" ? FileText : ListChecks;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-sm font-medium ${STAGE_TONE[stage]}`}>
      <Icon size={14} className={stage === "processing" ? "animate-spin" : ""} aria-hidden /> {t(`pl_${stage}`)}
    </span>
  );
}

const todayIso = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

/** One patient's plan for the doctor: the summary beside the plan, line actions, a visit form and one Approve plan bar. */
export function DoctorPatient() {
  const { t } = useLang();
  const id = Number(useParams().id);
  const plan = useQuery(`plan/${id}/en`, () => api.plan(id, "en"));
  const src = useQuery(`source/${id}`, () => api.source(id));
  const hist = useQuery(`review/all/doc${id}`, () => api.review({ state: "all", document_id: id, limit: 200 }));
  const doctors = useQuery("doctor/available", api.availableDoctors);
  const p = plan.data;
  const [tab, setTab] = useState<"summary" | "plan">("plan");
  const [focus, setFocus] = useState<number | null>(null);
  const [busy, setBusy] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [removing, setRemoving] = useState<number | null>(null);
  const [note, setNote] = useState("");
  const [redirectTo, setRedirectTo] = useState("");
  const [visit, setVisit] = useState({ title: "", date: "", time: "10:00", note: "" });

  const openByItem = useMemo(() => new Map((hist.data?.rows ?? []).filter((r) => r.state === "open").map((r) => [r.item_id, r])), [hist.data]);
  const openCount = openByItem.size;
  const planState = p?.document.plan_state;
  const blocked = planState === "doctor_checked" ? t("blockedChecked") : openCount > 0 ? t("blockedOpen").replace("{n}", String(openCount)) : null;
  const hot = new Set(p?.items.find((i) => i.id === focus)?.source_line_nos ?? []);

  const refresh = () => {
    invalidate(`plan/${id}`);
    invalidate("review");
    invalidate("doctor");
  };
  const act = async (key: string, fn: () => Promise<unknown>, msg: string) => {
    setBusy(key);
    setErr(null);
    try {
      await fn();
      toast(msg);
      refresh();
      return true;
    } catch (e) {
      setErr((e as Error).message);
      return false;
    } finally {
      setBusy("");
    }
  };

  const approveLine = (i: PlanItem) => {
    const r = openByItem.get(i.id);
    if (r) act(`a${i.id}`, () => api.resolve(r.id, { action: "approve" }), t("toastConfirmed"));
  };
  const removeLine = async (i: PlanItem) => {
    if (await act(`r${i.id}`, () => api.removeItem(i.id, note.trim() || undefined), t("toastRemoved"))) {
      setRemoving(null);
      setNote("");
    }
  };
  const book = async (e: FormEvent) => {
    e.preventDefault();
    if (await act("visit", () => api.makeAppointment(id, visit), t("toastVisit"))) {
      setVisit({ title: "", date: "", time: "10:00", note: "" });
      invalidate("doctor/calendar");
    }
  };

  const statusOf = (i: PlanItem) =>
    i.status === "Rejected" ? <Badge className="border-line bg-gray-50 text-muted">{t("removed")}</Badge>
      : i.status === "Needs Review" ? <Badge tone="warn">{t("heldLine")}</Badge>
        : <Badge tone="good">{t("doctorConfirmed")}</Badge>;

  const summary = (
    <Card as="section" className="flex min-h-0 flex-col" aria-label={t("reviewSummary")}>
      <header className="flex items-center justify-between border-b border-line px-4 py-3">
        <h2 className="text-base">{t("originalSummary")}</h2>
        {focus && <button type="button" className="text-sm text-brand-700 hover:underline" onClick={() => setFocus(null)}>{t("cancel")}</button>}
      </header>
      <div className="max-h-[70vh] overflow-y-auto px-2 py-3">
        {!src.data ? <div className="space-y-2 px-2"><Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-5/6" /><Skeleton className="h-4 w-4/6" /></div> : (
          <ol className="font-mono text-[0.86rem] leading-relaxed">
            {src.data.map((l) => (
              <li key={l.line_no} className={`grid grid-cols-[2.25rem_1fr] gap-2 rounded-md px-2 py-0.5 ${hot.has(l.line_no) ? "bg-[#fff6d6] text-ink shadow-[inset_3px_0_0_#d4a106]" : "text-text"}`}>
                <span className="select-none text-right text-muted tnum">{l.line_no}</span>
                <span>{l.text}</span>
              </li>
            ))}
          </ol>
        )}
      </div>
    </Card>
  );

  const planPane = (
    <section className="space-y-3" aria-label={t("reviewPlan")}>
      {plan.loading && <ListSkeleton rows={4} />}
      <ul className="space-y-2">
        {p?.items.map((i) => {
          const open = openByItem.get(i.id);
          const removed = i.status === "Rejected";
          return (
            <li key={i.id}>
              <div className={`rounded-card border bg-white p-3 shadow-card transition-colors ${focus === i.id ? "border-primary/70 ring-2 ring-primary/15" : open ? "border-amber-300" : "border-line"} ${removed ? "opacity-70" : ""}`}>
                <button type="button" className="flex w-full items-start gap-3 text-left" onClick={() => { setFocus(i.id); }} aria-pressed={focus === i.id}>
                  <CategoryIcon category={i.category} size={22} />
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center justify-between gap-2">
                      <strong className={`text-ink ${removed ? "line-through" : ""}`}>{i.title}</strong>
                      {statusOf(i)}
                    </span>
                    <span className="mt-1 block font-mono text-[0.84rem] text-muted">{i.original_text}</span>
                    {open && <span className="mt-1 block text-sm text-amber-800">{open.reason_plain.join(" ") || open.reason}</span>}
                    {i.date_resolved && <span className="mt-1 block text-sm text-muted tnum">{fmtDate(i.date_resolved)}</span>}
                  </span>
                </button>
                {removing === i.id ? (
                  <div className="mt-3 space-y-2 border-t border-line pt-3">
                    <Input label={t("removeNote")} value={note} onChange={(e) => setNote(e.target.value)} autoFocus />
                    <div className="flex gap-2">
                      <Button small look="attention" loading={busy === `r${i.id}`} onClick={() => removeLine(i)}><Trash2 size={16} aria-hidden /> {t("removeLine")}</Button>
                      <Button small look="quiet" onClick={() => { setRemoving(null); setNote(""); }}>{t("cancel")}</Button>
                    </div>
                  </div>
                ) : (
                  <div className="mt-3 flex flex-wrap gap-2 border-t border-line pt-3">
                    {open && <Button small loading={busy === `a${i.id}`} onClick={() => approveLine(i)}><Check size={16} aria-hidden /> {t("approveLine")}</Button>}
                    {removed
                      ? <Button small look="quiet" loading={busy === `s${i.id}`} onClick={() => act(`s${i.id}`, () => api.restoreItem(i.id), t("toastRestored"))}><RotateCcw size={16} aria-hidden /> {t("restoreLine")}</Button>
                      : <Button small look="quiet" onClick={() => { setRemoving(i.id); setNote(""); }}><Trash2 size={16} aria-hidden /> {t("removeLine")}</Button>}
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );

  return (
    <div className="space-y-6 pb-28">
      <Link to="/patients" className="text-sm">{t("backToPatients")}</Link>
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-[1.75rem]">{p?.document.patient_alias ?? t("patient")}</h1>
          {p && <p className="mt-1 text-muted">{p.document.title}. {t("leftHospital")} {fmtDate(p.document.discharge_date)}.</p>}
        </div>
        {p && (
          <div className="flex flex-wrap items-center gap-2">
            {planState === "doctor_checked" ? <Badge tone="good"><CheckCircle2 size={14} className="mr-1" aria-hidden />{t("planChecked")}</Badge> : <Badge tone="warn">{t("checking")}</Badge>}
          </div>
        )}
      </header>

      {(plan.error || hist.error || err) && <p role="alert" className="rounded-input border border-red-200 bg-red-50 px-3 py-2 text-attention">{err ?? plan.error ?? hist.error}</p>}

      <div className="seg lg:hidden" role="tablist" aria-label={t("reviewPlan")}>
        <button type="button" role="tab" aria-selected={tab === "summary"} onClick={() => setTab("summary")}>{t("reviewSummary")}</button>
        <button type="button" role="tab" aria-selected={tab === "plan"} onClick={() => setTab("plan")}>{t("reviewPlan")}</button>
      </div>

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
        <div className={`lg:sticky lg:top-6 ${tab === "summary" ? "" : "hidden lg:block"}`}>{summary}</div>
        <div className={`space-y-5 ${tab === "plan" ? "" : "hidden lg:block"}`}>
          {planPane}

          <Card as="section" className="p-4" aria-labelledby="h-visit">
            <h2 id="h-visit" className="mb-3 flex items-center gap-2 text-base"><CalendarPlus size={18} className="text-brand-700" aria-hidden /> {t("makeAppointment")}</h2>
            <form onSubmit={book} className="grid gap-3 sm:grid-cols-[1.6fr_1fr_0.8fr]">
              <Input label={t("visitTitle")} placeholder={t("visitTitleHint")} value={visit.title} onChange={(e) => setVisit({ ...visit, title: e.target.value })} required />
              <Input label={t("date")} type="date" min={todayIso()} value={visit.date} onChange={(e) => setVisit({ ...visit, date: e.target.value })} required />
              <Input label={t("time")} type="time" value={visit.time} onChange={(e) => setVisit({ ...visit, time: e.target.value })} required />
              <div className="sm:col-span-3"><Input label={t("note")} value={visit.note} onChange={(e) => setVisit({ ...visit, note: e.target.value })} /></div>
              <div className="sm:col-span-3"><Button type="submit" small loading={busy === "visit"} disabled={!visit.title.trim() || !visit.date}><CalendarPlus size={16} aria-hidden /> {t("bookVisit")}</Button></div>
            </form>
          </Card>

          {openCount > 0 && (
            <Card as="section" className="flex flex-wrap items-end gap-3 p-4">
              <CornerUpRight size={20} className="mb-2 text-brand-700" aria-hidden />
              <div className="min-w-[14rem] flex-1">
                <Select label={t("redirectPatient")} value={redirectTo} onChange={(e) => setRedirectTo(e.target.value)}>
                  <option value="">{t("selectDoctor")}</option>
                  {(doctors.data ?? []).map((d) => <option key={d.id} value={d.id}>{d.name} ({d.specialty})</option>)}
                </Select>
              </div>
              <Button small look="quiet" disabled={!redirectTo} loading={busy === "redirect"}
                onClick={() => act("redirect", () => api.redirectPatient(id, Number(redirectTo)), t("redirected"))}>{t("redirectPatient")}</Button>
            </Card>
          )}
        </div>
      </div>

      {p && (
        <div className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-white/95 backdrop-blur md:left-64">
          <div className="mx-auto flex max-w-wide flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6 md:px-10">
            <p className={`text-sm ${blocked ? "text-amber-800" : "text-[#0b5d4b]"}`} role="status">{blocked ?? t("readyToApprove")}</p>
            <Button disabled={!!blocked} loading={busy === "plan"} onClick={() => act("plan", () => api.markChecked(id), t("toastPlanChecked"))}>
              <CheckCircle2 size={18} aria-hidden /> {t("approvePlan")}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
