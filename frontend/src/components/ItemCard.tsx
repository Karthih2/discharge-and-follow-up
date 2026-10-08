import { CalendarBlank, CheckCircle, Circle, Flag, Lock, MapPin, PhoneCall, SpeakerHigh } from "@phosphor-icons/react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { fmt } from "../i18n/strings";
import { api } from "../lib/api";
import { useLang } from "../lib/lang";
import { fmtDate, useMotionT } from "../lib/motion";
import { burst } from "../lib/ripple";
import type { Plan, PlanItem, PlanTask } from "../lib/types";
import { CategoryIcon, DrawCheck } from "./Fx";
import { SLOT_ICON } from "./Icons";
import { ProviderMap } from "./ProviderMap";
import { StatusBadge } from "./StatusBadge";

const SPEECH: Record<string, string> = { en: "en-IN", ta: "ta-IN", hi: "hi-IN", te: "te-IN", kn: "kn-IN", ml: "ml-IN" };

interface Props {
  item: PlanItem;
  plan: Plan;
  task?: PlanTask;
  onTask?: (taskId: number, status: "Pending" | "Completed") => void;
  onSource?: (i: PlanItem) => void;
  onRefresh?: () => void;
  preview?: boolean;
  large?: boolean;
}

export function MedicineCard({ item }: { item: PlanItem }) {
  const { t } = useLang();
  const mt = useMotionT();
  const m = item.med!;
  const cells: { label: string; icon?: React.ReactNode; value: React.ReactNode }[] = [
    { label: t("dose"), value: m.dose ?? t("notStated") },
    {
      label: t("when"),
      value: m.timing.length ? (
        <span className="flex gap-2">
          {m.timing.map((s) => {
            const I = SLOT_ICON[s as keyof typeof SLOT_ICON];
            return <span key={s} className="inline-flex items-center gap-1 text-primary"><I size={20} /> <span className="text-ink">{t(s as "morning")}</span></span>;
          })}
        </span>
      ) : t("notStated"),
    },
    { label: t("howLong"), value: m.duration_days ? fmt(t("daysN"), { n: m.duration_days }) : t("notStated") },
    { label: t("food"), value: m.food === "after" ? t("afterFood") : m.food === "before" ? t("beforeFood") : t("notStated") },
  ];
  return (
    <div className="mt-2 rounded-md border border-line bg-bg p-3">
      <dl className="grid grid-cols-2 gap-x-4 gap-y-2 md:grid-cols-4">
        {cells.map((c, i) => (
          <motion.div key={c.label} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={mt(0.3, 0.25 + i * 0.06)}>
            <dt className="text-xs text-muted">{c.label}</dt>
            <dd className="lang-text font-semibold">{c.value}</dd>
          </motion.div>
        ))}
      </dl>
      <motion.p className="lang-text mt-2 text-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={mt(0.3, 0.55)}>
        <span className="text-muted">{t("special")}: </span>
        {m.special ?? t("notStated")}
      </motion.p>
    </div>
  );
}

export function ItemCard({ item, plan, task, onTask, onSource, onRefresh, preview, large }: Props) {
  const { t, cat, lang } = useLang();
  const mt = useMotionT();
  const [showOrig, setShowOrig] = useState(false);
  const [maps, setMaps] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const role = plan.viewer.role;
  const mine = role === "patient";
  const full = plan.viewer.scope === "full";
  const canAct = !preview && !!onTask && (role === "patient" || (role === "manager" && plan.viewer.scope !== "appointments"));
  const canCall = !preview && full && (role === "patient" || role === "manager");
  const d = item.date_resolved ? new Date(item.date_resolved + "T00:00:00") : null;
  const locked = item.locked;

  const listen = async () => {
    setNote(null);
    try {
      new Audio(await api.audio(item.id, lang)).play();
    } catch (e) {
      const m = (e as Error).message;
      if (/not set up|failed/i.test(m) && item.simple_text && "speechSynthesis" in window) {
        const u = new SpeechSynthesisUtterance(item.simple_text);
        u.lang = SPEECH[lang];
        window.speechSynthesis.speak(u);
        setNote("Playing with the browser voice because the ElevenLabs voice is not set up.");
      } else setNote(m);
    }
  };
  const callback = async () => {
    try {
      const r = await api.callback(item.id);
      setNote(`Your number shows as ${r.masked_number}. This is a simulation, no real call is made.`);
      onRefresh?.();
    } catch (e) {
      setNote((e as Error).message);
    }
  };
  const flag = async () => {
    try {
      await api.flag(item.id);
      onRefresh?.();
    } catch (e) {
      setNote((e as Error).message);
    }
  };

  const cbLabel = item.callback_state === "requested" ? t("cbRequested") : item.callback_state === "connecting" ? t("cbConnecting") : item.callback_state === "completed" ? t("cbCompleted") : null;
  const btn = `btn btn-quiet btn-sm ${large ? "!px-4 !py-2.5 !text-base" : ""}`;
  const actions = (
    <>
          {!preview && (
            <div className="mt-3 flex flex-wrap gap-2">
              <button className={btn} onClick={listen} disabled={locked} title={locked ? t("waitingDoctor") : undefined}>
                <SpeakerHigh size={16} weight="duotone" aria-hidden /> {t("listen")}
              </button>
              {task && canAct && (
                <button className={btn} disabled={locked} onClick={(e) => { if (task.status === "Pending") burst(e.currentTarget); onTask!(task.id, task.status === "Pending" ? "Completed" : "Pending"); }}>
                  {task.status === "Pending" ? <Circle size={16} aria-hidden /> : <CheckCircle size={16} weight="fill" aria-hidden />}
                  {task.status === "Pending" ? t("markDone") : t("undo")}
                </button>
              )}
              {full && onSource && !locked && (
                <button className={btn} onClick={() => onSource(item)}>{t("seeSource")}</button>
              )}
              {canCall && !locked && (
                <button className={btn} onClick={callback}>
                  <PhoneCall size={16} weight="duotone" aria-hidden /> {t("requestCallback")}
                </button>
              )}
              {canCall && !locked && (
                <button className={btn} onClick={flag}>
                  <Flag size={16} weight="duotone" aria-hidden /> {t("flagIt")}
                </button>
              )}
              {item.matches.length > 0 && !locked && (
                <button className={btn} onClick={() => setMaps(!maps)} aria-expanded={maps}>
                  <MapPin size={16} weight="duotone" aria-hidden /> {t("findProvider")} ({item.matches.length})
                </button>
              )}
            </div>
          )}
    </>
  );

  return (
    <div
      className={`rounded-md border p-4 ${
        locked ? (mine || role === "doctor" ? "border-attention bg-attention-tint" : "border-line bg-bg text-muted") : "border-line bg-surface"
      }`}
    >
      <div className="flex gap-3">
        <CategoryIcon category={item.category} locked={locked && !mine} size={large ? 36 : 28} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className={large ? "text-2xl" : "text-lg"}>{item.title}</h3>
            {!locked && <span className="text-sm text-muted">{cat(item.category)}</span>}
            <StatusBadge status={task?.status === "Completed" ? "Completed" : item.status} />
            {d && (
              <span className="inline-flex items-center gap-1 rounded-sm border border-line px-2 text-sm text-muted">
                <CalendarBlank size={14} weight="duotone" aria-hidden /> {fmtDate(item.date_resolved!, { day: "numeric", month: "short" })}
              </span>
            )}
            {task?.status === "Completed" && <DrawCheck />}
          </div>

          {large && actions}
          {locked ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={mt(0.4)} className="mt-2 flex items-start gap-2">
              <motion.span animate={{ scale: [1, 1.18, 1] }} transition={mt(0.9)} className="mt-0.5 shrink-0"><Lock size={22} weight="duotone" aria-hidden /></motion.span>
              <div className="lang-text">
                <p className="font-semibold">{t("waitingDoctor")}</p>
                {mine && item.reason_plain && <p className="text-sm">{t("reasonLabel")}: {item.reason_plain}</p>}
              </div>
            </motion.div>
          ) : item.med ? (
            <MedicineCard item={item} />
          ) : (
            <>
              <p className="lang-text mt-1">{item.simple_text}</p>
              {item.shown_language !== lang && item.simple_text && <p className="text-sm text-muted">{t("tryEnglish")}</p>}
            </>
          )}
          {item.reviewed && !locked && <p className="mt-1 text-sm font-semibold text-primary">{t("doctorConfirmed")}</p>}
          {cbLabel && <p className="mt-1 text-sm font-semibold text-primary">{cbLabel}</p>}

          {!locked && item.original_text && plan.viewer.scope !== "reminders" && (
            <>
              <button className="mt-2 text-sm text-primary underline" onClick={() => setShowOrig(!showOrig)} aria-expanded={showOrig}>
                {showOrig ? t("hideOriginal") : t("showOriginal")}
              </button>
              <AnimatePresence initial={false}>
                {showOrig && (
                  <motion.p initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={mt(0.25)} className="overflow-hidden text-sm text-muted">
                    <span className="block pt-1">{t("originalLine")}: <span className="font-mono">“{item.original_text}”</span></span>
                  </motion.p>
                )}
              </AnimatePresence>
            </>
          )}

          {!large && actions}
          {note && <p role="status" className="mt-2 text-sm text-muted">{note}</p>}
          <AnimatePresence initial={false}>
            {maps && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={mt(0.3)} className="overflow-hidden">
                <div className="pt-3">
                  <ProviderMap itemId={item.id} pincode={plan.document.pincode} matches={item.matches} canSelect={mine} onChanged={() => onRefresh?.()} />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
