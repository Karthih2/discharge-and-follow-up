import { CheckCircle2, Circle, Clock3, ShieldCheck } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { PipelineBadge } from "../doctor/PatientReview";
import { Badge, Card, ListSkeleton, PageHead } from "../../components/ui";
import { api } from "../../lib/api";
import { useLang } from "../../lib/lang";
import { fmtDate, fmtTime } from "../../lib/motion";
import { useQuery } from "../../lib/query";

const ACTION_LABEL: Record<string, string> = {
  review_approved: "Doctor approved a line",
  review_edited: "Doctor corrected a line",
  review_rejected: "Doctor removed a line",
  item_removed: "Doctor removed a line",
  item_restored: "Doctor restored a line",
  appointment_made: "Doctor booked a visit",
  plan_checked: "Plan approved",
  task_completed: "Task marked done",
  task_pending: "Task reopened",
  task_skipped: "Task skipped",
  redirect: "Moved to another doctor",
  callback_assigned: "Callback assigned",
};
const label = (a: string) => ACTION_LABEL[a] ?? a.replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase());

/** One patient for management: plan make-up beside the approval timeline, then the follow-up checklist and the edit history. */
export default function AdminPatientDetail() {
  const { t, cat } = useLang();
  const id = Number(useParams().id);
  const q = useQuery(`admin/patient/${id}`, () => api.adminPatient(id));
  const d = q.data;
  return (
    <div className="space-y-6">
      <Link to="/" className="text-sm">{t("needsYouNow")}</Link>
      <PageHead title={d?.patient.alias ?? t("patientDetail")} text={d ? [d.patient.city, d.patient.language.toUpperCase()].filter(Boolean).join(", ") : undefined}>
        {d?.plans[0] && (
          <div className="flex flex-wrap gap-2">
            <PipelineBadge stage={d.plans[0].pipeline} />
            {d.plans[0].plan_state === "doctor_checked" ? <Badge tone="good">{t("planChecked")}</Badge> : <Badge tone="warn">{t("checking")}</Badge>}
          </div>
        )}
      </PageHead>
      <p className="flex items-center gap-2 text-sm text-muted"><ShieldCheck size={16} aria-hidden /> {t("noClinicalText")}</p>
      {q.error && <p role="alert" className="text-attention">{q.error}</p>}
      {q.loading && <ListSkeleton rows={4} />}
      {d && (
        <>
          <div className="grid items-start gap-5 lg:grid-cols-2">
            <Card as="section" className="p-5" aria-labelledby="h-makeup">
              <h2 id="h-makeup" className="mb-3 text-lg">{t("planMakeup")}</h2>
              {d.makeup.length === 0 ? <p className="text-muted">{t("noPlanAdded")}</p> : (
                <table className="w-full text-sm">
                  <thead className="text-muted"><tr><th className="py-1 text-left font-medium">{t("fieldCategory")}</th><th className="py-1 text-right font-medium">{t("count")}</th><th className="py-1 text-right font-medium">{t("held")}</th><th className="py-1 text-right font-medium">{t("removed")}</th></tr></thead>
                  <tbody>
                    {d.makeup.map((m) => (
                      <tr key={m.category} className="border-t border-line">
                        <td className="py-1.5">{cat(m.category)}</td>
                        <td className="tnum py-1.5 text-right">{m.total}</td>
                        <td className={`tnum py-1.5 text-right ${m.held ? "font-semibold text-amber-700" : "text-muted"}`}>{m.held}</td>
                        <td className="tnum py-1.5 text-right text-muted">{m.removed}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              <div className="mt-4 space-y-1.5">
                <p className="flex justify-between text-sm"><span>{t("medsTaken")}</span><span className="tnum">{d.medicines.done} / {d.medicines.due}</span></p>
                <div className="meter"><i style={{ width: `${d.medicines.due ? (d.medicines.done / d.medicines.due) * 100 : 0}%` }} /></div>
              </div>
              {d.plans.map((p) => p.checked_by && (
                <p key={p.id} className="mt-3 text-sm text-muted">{t("checkedBy")} {p.checked_by}{p.checked_at ? `, ${fmtDate(p.checked_at)}` : ""}</p>
              ))}
            </Card>

            <Card as="section" className="p-5" aria-labelledby="h-timeline">
              <h2 id="h-timeline" className="mb-3 text-lg">{t("approvalTimeline")}</h2>
              {d.timeline.length === 0 ? <p className="text-muted">{t("noHistory")}</p> : (
                <ol className="relative space-y-3 border-l border-line pl-5">
                  {d.timeline.map((r) => (
                    <li key={r.id} className="relative">
                      <span className={`absolute -left-[1.6rem] top-1 grid h-4 w-4 place-items-center rounded-full ring-4 ring-white ${r.state === "open" ? "bg-amber-400" : r.state === "rejected" ? "bg-gray-400" : "bg-verdigris"}`} aria-hidden />
                      <p className="flex flex-wrap items-center gap-2 text-sm">
                        <strong className="text-ink">{cat(r.category)}</strong>
                        <Badge tone={r.state === "open" ? "warn" : "mark"}>{t(`state_${r.state}` as "state_open")}</Badge>
                        {r.severity === "high" && <Badge tone="solid">{t("sevHigh")}</Badge>}
                      </p>
                      <p className="text-xs text-muted">{r.doctor ?? t("unassigned")}. {fmtDate(r.created_at, { day: "numeric", month: "short" })}{r.resolved_at ? ` to ${fmtDate(r.resolved_at, { day: "numeric", month: "short" })}` : ""}</p>
                    </li>
                  ))}
                </ol>
              )}
            </Card>
          </div>

          <div className="grid items-start gap-5 lg:grid-cols-2">
            <Card as="section" className="p-5" aria-labelledby="h-check">
              <h2 id="h-check" className="mb-3 text-lg">{t("followUpChecklist")}</h2>
              {d.checklist.length === 0 ? <p className="text-muted">{t("nothingBooked")}</p> : (
                <ul className="rule-list">
                  {d.checklist.map((c) => (
                    <li key={c.task_id} className="flex items-center gap-3 py-2 text-sm">
                      {c.status === "Completed" ? <CheckCircle2 size={18} className="text-verdigris" aria-hidden /> : c.overdue ? <Clock3 size={18} className="text-attention" aria-hidden /> : <Circle size={18} className="text-muted" aria-hidden />}
                      <span className="flex-1">{cat(c.category)}</span>
                      <span className="tnum text-muted">{fmtDate(c.due_at, { day: "numeric", month: "short" })}, {fmtTime(c.due_at)}</span>
                      {c.overdue && <Badge tone="warn">{t("overdue")}</Badge>}
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            <Card as="section" className="p-5" aria-labelledby="h-hist">
              <h2 id="h-hist" className="mb-3 text-lg">{t("editHistory")}</h2>
              {d.history.length === 0 ? <p className="text-muted">{t("noHistory")}</p> : (
                <ul className="rule-list max-h-[28rem] overflow-y-auto pr-1">
                  {d.history.map((h) => (
                    <li key={h.id} className="flex flex-wrap items-baseline justify-between gap-2 py-2 text-sm">
                      <span><strong className="font-medium text-ink">{label(h.action)}</strong> <span className="text-muted">{h.actor}</span></span>
                      <span className="tnum text-xs text-muted">{fmtDate(h.created_at, { day: "numeric", month: "short" })}, {fmtTime(h.created_at)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
