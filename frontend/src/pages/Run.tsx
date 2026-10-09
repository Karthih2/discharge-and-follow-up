import { STRINGS, type StringKey } from "../i18n/strings";
import { useLang } from "../lib/lang";
import { CheckCircle, Circle, SpinnerGap, WarningCircle, XCircle } from "@phosphor-icons/react";
import { m as motion } from "motion/react";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { invalidate } from "../lib/query";
import { CountUp } from "../components/CountUp";
import { Button, LinkButton, Skeleton } from "../components/ui";
import { api } from "../lib/api";
import { useMotionT } from "../lib/motion";
import type { StepEvent } from "../lib/types";

type State = "waiting" | "running" | "done" | "flagged" | "failed";
interface Row {
  key: string;
  label: string;
  state: State;
  message?: string;
}

export default function Run() {
  const { t, lang } = useLang();
  const id = Number(useParams().id);
  const mt = useMotionT();
  const [rows, setRows] = useState<Row[]>([]);
  const [counts, setCounts] = useState({ items: 0, flagged: 0 });
  const [finished, setFinished] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const es = new EventSource(api.runUrl(id));
    es.onmessage = (m) => {
      const ev: StepEvent = JSON.parse(m.data);
      if (ev.step === "start" && ev.steps) {
        setRows(ev.steps.map((s) => ({ ...s, state: "waiting" as State })));
      } else if (ev.step === "complete") {
        setFinished(true);
        for (const k of ["today", "documents", "calendar", "plan", "family"]) invalidate(k); // the new plan shows up on every screen, family hub included
        setCounts({ items: ev.items ?? 0, flagged: ev.flagged ?? 0 });
        es.close();
      } else if (ev.step === "error") {
        setError(ev.message ?? "Something went wrong");
        es.close();
      } else {
        setRows((r) => r.map((x) => (x.key === ev.step ? { ...x, state: ev.state as State, message: ev.message ?? x.message } : x)));
        if (ev.items !== undefined) setCounts({ items: ev.items, flagged: ev.flagged ?? 0 });
      }
    };
    es.onerror = () => {
      es.close();
      setError((e) => e ?? "The connection was lost. Make sure the backend is running, then try again.");
    };
    return () => es.close();
  }, [id]);

  const doneCount = rows.filter((r) => r.state === "done" || r.state === "flagged").length;
  const pct = rows.length ? (doneCount / rows.length) * 100 : 0;

  return (
    <div className="max-w-3xl space-y-8">
      <header>
        <h1 className="text-4xl">{finished ? t("planReady") : t("readingSummary")}</h1>
        <p className="text-muted">{t("helpersIntro")}</p>
      </header>

      <div className="flex gap-6">
        <div className="relative w-1.5 shrink-0 rounded-sm bg-line" aria-hidden>
          <motion.div className="absolute left-0 top-0 w-full rounded-sm bg-secondary" animate={{ height: `${pct}%` }} transition={mt(0.3)} />
        </div>
        <ol className="flex-1 space-y-3" aria-live="polite">
          {rows.length === 0 && [0, 1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-14 w-full" />)}
          {rows.map((r, i) => (
            <motion.li
              key={r.key}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: r.state === "waiting" ? 0.55 : 1, y: 0 }}
              transition={mt(0.18, i * 0.03)}
              className="card flex items-start gap-3 p-3"
            >
              <span className="mt-0.5 shrink-0">
                {r.state === "waiting" && <Circle size={24} className="text-muted" aria-label="Waiting" />}
                {r.state === "running" && (
                  <span className="relative inline-flex">
                    <span className="pulse-ring absolute inset-0 rounded-full bg-secondary" aria-hidden />
                    <SpinnerGap size={24} weight="duotone" className="relative animate-spin text-primary" aria-label="Running" />
                  </span>
                )}
                {r.state === "done" && <CheckCircle size={24} weight="fill" className="text-primary" aria-label="Done" />}
                {r.state === "flagged" && <WarningCircle size={24} weight="fill" className="text-attention" aria-label="Needs a look" />}
                {r.state === "failed" && <XCircle size={24} weight="fill" className="text-attention" aria-label="Failed" />}
              </span>
              <div>
                <p className="font-semibold">{(`step_${r.key}` in STRINGS ? t(`step_${r.key}` as StringKey) : r.label)}</p>
                {r.message && lang === "en" && <p className={r.state === "flagged" || r.state === "failed" ? "text-attention" : "text-muted"}>{r.message}</p>}
              </div>
            </motion.li>
          ))}
        </ol>
      </div>

      <p className="text-lg" aria-live="polite">
        {t("instrFound")}: <strong className="font-heading text-2xl"><CountUp to={counts.items} /></strong>. {t("sentToDoctor")}: <strong className={`font-heading text-2xl ${counts.flagged ? "text-attention" : ""}`}><CountUp to={counts.flagged} /></strong>.
      </p>

      {error && (
        <div role="alert" className="space-y-3 rounded-sm border border-attention bg-attention-tint p-4">
          <p className="text-attention">{error}</p>
          <p className="text-sm">{t("nothingLost")}</p>
          <div className="flex gap-2">
            <Button small onClick={() => window.location.reload()}>{t("tryAgain")}</Button>
            <LinkButton to="/patient/upload" look="quiet" small>{t("enterByHand")}</LinkButton>
          </div>
        </div>
      )}

      {finished && (
        <div className="flex flex-wrap gap-3">
          <LinkButton to={`/plan/${id}`} >{t("openThePlan")}</LinkButton>
          {counts.flagged > 0 && <p className="self-center text-muted">{t("doctorWillCheck")}</p>}
        </div>
      )}
    </div>
  );
}
