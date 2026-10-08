import { CalendarPlus, Printer, ShareNetwork, TextAa } from "@phosphor-icons/react";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { PlanView } from "../components/PlanView";
import { PlanSkeleton } from "../components/Skeleton";
import { SourceDrawer } from "../components/SourceDrawer";
import { api } from "../lib/api";
import { useLang } from "../lib/lang";
import { fmtDate, useLoad } from "../lib/motion";
import type { PlanItem } from "../lib/types";

const SCOPE_NOTE = {
  appointments: "The patient shared appointments only.",
  reminders: "The patient shared reminders only.",
  full: "",
  none: "",
};

/** One plan screen for every role. The server decides what each viewer may see. */
export default function Plan() {
  const id = Number(useParams().id);
  const { lang, t } = useLang();
  const { data: plan, error, reload } = useLoad(() => api.plan(id, lang), [id, lang]);
  const [source, setSource] = useState<PlanItem | null>(null);
  const [big, setBig] = useState<boolean | null>(null);

  useEffect(() => {
    window.addEventListener("cb-plan-refresh", reload);
    return () => window.removeEventListener("cb-plan-refresh", reload);
  }, [reload]);

  useEffect(() => {
    if (plan?.viewer.role === "patient") {
      try {
        localStorage.setItem("cb_last_doc", String(id));
      } catch {
        /* ignore */
      }
    }
  }, [plan, id]);

  if (error) return <p className="text-attention">Could not open this plan. {error}</p>;
  if (!plan) return <PlanSkeleton />;

  const role = plan.viewer.role;
  const mine = role === "patient";
  const elderly = big ?? plan.patient.elderly;
  const setTask = async (taskId: number, status: "Pending" | "Completed") => {
    await api.setTask(taskId, status);
    reload();
  };

  return (
    <div className={`space-y-8 ${elderly ? "elderly" : ""}`}>
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          {!mine && <p className="text-muted">Viewing as {role === "manager" ? "hub manager" : role === "family" ? "family viewer" : role}. {SCOPE_NOTE[plan.viewer.scope]}</p>}
          <h1 className="text-4xl">{mine ? t("planTitle") : plan.document.patient_alias}</h1>
          <p className="lang-text text-muted">
            {mine && `${plan.document.patient_alias}. `}
            {t("discharged")} {fmtDate(plan.document.discharge_date)}.
          </p>
        </div>
      </header>
      {plan.viewer.scope !== "none" && (
        <div className="no-print flex flex-wrap gap-2">
          <button className="btn btn-quiet" onClick={() => api.downloadIcs(id, lang)}>
            <CalendarPlus size={20} aria-hidden /> {t("downloadReminders")}
          </button>
          {mine && (
            <>
              <Link className="btn btn-quiet" to={`/plan/${id}/print`}>
                <Printer size={20} aria-hidden /> {t("fridgeSheet")}
              </Link>
              <button className="btn btn-quiet" aria-pressed={elderly} onClick={() => { setBig(!elderly); api.setElderly(!elderly).catch(() => undefined); }}>
                <TextAa size={20} weight="duotone" aria-hidden /> {t("bigText")}
              </button>
              <Link className="btn btn-quiet" to="/patient/sharing">
                <ShareNetwork size={20} aria-hidden /> {t("sharing")}
              </Link>
            </>
          )}
        </div>
      )}
      <PlanView
        plan={plan}
        elderly={elderly}
        onRefresh={reload}
        onTask={setTask}
        onSource={setSource}
        onAck={async (aid) => {
          await api.ackAlert(aid);
          reload();
        }}
      />
      <SourceDrawer docId={source ? id : null} cited={source?.source_line_nos ?? []} title={source?.title ?? ""} onClose={() => setSource(null)} />
    </div>
  );
}
