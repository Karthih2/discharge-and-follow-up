import { CalendarPlus, Printer, ShareNetwork, TextAa } from "@phosphor-icons/react";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { PlanView } from "../components/PlanView";
import { Button, LinkButton, PlanSkeleton } from "../components/ui";
import { SourceDrawer } from "../components/SourceDrawer";
import { api } from "../lib/api";
import { useLang } from "../lib/lang";
import { fmtDate } from "../lib/motion";
import { useAuth } from "../lib/auth";
import { invalidate, useQuery } from "../lib/query";
import { toast } from "../lib/toast";
import type { PlanItem } from "../lib/types";


/** One plan screen for every role. The server decides what each viewer may see. */
export default function Plan() {
  const id = Number(useParams().id);
  const { lang, t } = useLang();
  const { user } = useAuth();
  const q = useQuery(`plan/${id}/${lang}`, () => api.plan(id, lang));
  const plan = q.data;
  // A patient opens the source lines and the activity log too. Ask for all three together, not one after another.
  useQuery(user?.role === "patient" ? `source/${id}` : null, () => api.source(id));
  useQuery(user?.role === "patient" ? `audit/${id}` : null, () => api.audit(id));
  const reload = () => { invalidate(`plan/${id}`); invalidate("today"); invalidate("family"); };
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

  if (q.error && !plan) return <p role="alert" className="text-attention">{t("couldNotOpen")} {q.error}</p>;
  if (!plan) return <PlanSkeleton />;

  const role = plan.viewer.role;
  const mine = role === "patient";
  const elderly = big ?? plan.patient.elderly;
  const setTask = async (taskId: number, status: "Pending" | "Completed") => {
    await api.setTask(taskId, status);
    toast(t(status === "Completed" ? "toastDone" : "toastNotDone"));
    reload();
  };

  return (
    <div className={`space-y-8 ${elderly ? "elderly" : ""}`}>
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          {!mine && <p className="text-muted">{t("viewingAs")} {role === "manager" ? t("roleManager") : role === "family" ? t("roleFamily") : role}. {plan.viewer.scope === "appointments" ? t("scopeApptsNote") : plan.viewer.scope === "reminders" ? t("scopeRemNote") : ""}</p>}
          <h1 className="text-4xl">{mine ? t("planTitle") : plan.document.patient_alias}</h1>
          <p className="lang-text text-muted">
            {mine && `${plan.document.patient_alias}. `}
            {t("discharged")} {fmtDate(plan.document.discharge_date)}.
          </p>
        </div>
      </header>
      {plan.viewer.scope !== "none" && (
        <div className="no-print flex flex-wrap gap-2">
          <Button look="quiet" onClick={() => api.downloadIcs(id, lang)}>
            <CalendarPlus size={20} aria-hidden /> {t("downloadReminders")}
          </Button>
          {mine && (
            <>
              <LinkButton look="quiet" to={`/plan/${id}/print`}>
                <Printer size={20} aria-hidden /> {t("fridgeSheet")}
              </LinkButton>
              <Button look="quiet" aria-pressed={elderly} onClick={() => { setBig(!elderly); api.setElderly(!elderly).catch(() => undefined); }}>
                <TextAa size={20} weight="duotone" aria-hidden /> {t("bigText")}
              </Button>
              <LinkButton look="quiet" to="/patient/sharing">
                <ShareNetwork size={20} aria-hidden /> {t("sharing")}
              </LinkButton>
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
          toast(t("toastAck"));
          reload();
        }}
      />
      <SourceDrawer docId={source ? id : null} cited={source?.source_line_nos ?? []} title={source?.title ?? ""} onClose={() => setSource(null)} />
    </div>
  );
}
