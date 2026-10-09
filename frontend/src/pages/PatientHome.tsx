import { CalendarBlank, CheckCircle, SpeakerSimpleHigh, SpeakerSimpleSlash, Circle, FilePlus, MagnifyingGlass, MapPin, MapTrifold, Moon, PhoneCall, Printer, ShareNetwork, SpeakerHigh, Sun, SunHorizon } from "@phosphor-icons/react";
import { AnimatePresence, m as motion } from "motion/react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ActivityDots, DateTile, IconTile, MiniCalendar, Props, Stat, Tile } from "../components/Dash";
import { CategoryIcon, ProgressRing } from "../components/Fx";
import { Badge, Button, EmptyState, LinkButton, Skeleton } from "../components/ui";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";
import { useLang } from "../lib/lang";
import { fmtDate, fmtTime, useMotionT, useStagger } from "../lib/motion";
import { LangToggle } from "../components/LangToggle";
import { canSpeak, speakBest, stopSpeaking } from "../lib/speak";
import { invalidate, useQuery } from "../lib/query";
import { toast } from "../lib/toast";
import type { TodayMed } from "../lib/types";

const SLOT_ICON = { morning: SunHorizon, afternoon: Sun, night: Moon } as const;
const SLOTS = ["morning", "afternoon", "night"] as const;

export default function PatientHome() {
  const { user } = useAuth();
  const { t, lang } = useLang();
  const mt = useMotionT();
  const [talking, setTalking] = useState<string | null>(null);
  useEffect(() => stopSpeaking, []); // leaving the page stops the voice
  const today = useQuery("today", api.today);
  const docs = useQuery("documents", api.documents);
  const cal = useQuery("calendar/now", () => api.calendar("now"));
  const rise = useStagger("patient-home");
  const [busy, setBusy] = useState<number | null>(null);
  const [calling, setCalling] = useState(false);
  const [cmd, setCmd] = useState("");
  const d = today.data;

  const flip = async (m: TodayMed) => {
    setBusy(m.task_id);
    try {
      await api.setTask(m.task_id, m.status === "Pending" ? "Completed" : "Pending");
      toast(m.status === "Pending" ? t("toastTaken") : t("toastUndone"));
      invalidate("today");
      invalidate("calendar");
    } finally {
      setBusy(null);
    }
  };
  const askCallback = async () => {
    const itemId = d?.needs_review[0]?.item_id ?? d?.next_event?.item_id;
    if (!itemId) return;
    setCalling(true);
    try {
      await api.callback(itemId);
      toast(t("toastCallback"));
      invalidate("today");
    } finally {
      setCalling(false);
    }
  };

  // Read the plan aloud. The server writes the sentences (time first, then each medicine in your language) and ElevenLabs speaks them.
  const say = (key: string, slot: string) => {
    if (talking === key) { stopSpeaking(); setTalking(null); return; }
    setTalking(key);
    speakBest(() => api.speakToday(lang, slot), async () => (await api.todayScript(lang, slot)).lines, lang, () => setTalking(null));
  };

  const planId = d?.plan?.id;
  const shortcuts = useMemo(() => [
    { label: t("calendar"), icon: <CalendarBlank size={24} weight="duotone" />, to: "/calendar", act: false },
    { label: t("listen"), icon: <SpeakerHigh size={24} weight="duotone" />, to: planId ? `/plan/${planId}` : undefined, act: false },
    { label: t("requestCallback"), icon: <PhoneCall size={24} weight="duotone" />, to: undefined, act: true },
    { label: t("fridgeSheet"), icon: <Printer size={24} weight="duotone" />, to: planId ? `/plan/${planId}/print` : undefined, act: false },
    { label: t("shareFamily"), icon: <ShareNetwork size={24} weight="duotone" />, to: "/patient/sharing", act: false },
    { label: t("findProvider"), icon: <MapTrifold size={24} weight="duotone" />, to: "/providers", act: false },
    { label: t("addSummary"), icon: <FilePlus size={24} weight="duotone" />, to: "/patient/upload", act: false },
  ].filter((s) => s.label.toLowerCase().includes(cmd.trim().toLowerCase())), [t, planId, cmd]);

  if (today.loading) {
    return (
      <div className="grid gap-3 lg:grid-cols-12" role="status" aria-label="Loading">
        {[3, 3, 6, 6, 6].map((c, i) => <div key={i} className={`card p-3 ${c === 3 ? "lg:col-span-3" : "lg:col-span-6"}`}><Skeleton className="h-5 w-1/3" /><Skeleton className="mt-3 h-28 w-full" /></div>)}
      </div>
    );
  }
  if (today.error) return <p role="alert" className="text-attention">{today.error}</p>;
  if (!d) return null;
  const first = user?.name.split(" ")[0] ?? "";
  const overdue = d.progress.overdue;
  const taken = SLOTS.reduce((n, s) => n + d.medicines[s].filter((m) => m.status === "Completed").length, 0);
  const meds = SLOTS.reduce((n, s) => n + d.medicines[s].length, 0);

  return (
    <div className="grid auto-rows-min gap-3 lg:grid-flow-dense lg:grid-cols-12">
      <motion.div {...rise(0)} className="flex flex-col gap-3 lg:col-span-3 lg:row-span-2">
        <DateTile today={d.today} hello={`${t("hello")}, ${first}`} />
        <Tile title={t("progress")} aside={`${d.progress.done}/${d.progress.total}`} className="flex-1">
          <div className="flex items-center gap-3">
            <ProgressRing value={d.progress.done} total={d.progress.total} size={72} label={`${d.progress.done} / ${d.progress.total}`} />
            <p className="text-sm text-muted">{t("tasksDone").replace("{done}", String(d.progress.done)).replace("{due}", String(d.progress.total))}</p>
          </div>
          {overdue > 0 && <Badge tone="warn" className="mt-2">{overdue} {t("overdue")}</Badge>}
        </Tile>
      </motion.div>

      <motion.div {...rise(1)} className="lg:col-span-3">
        <Tile title={t("calendar")} aside={fmtDate(d.today, { month: "short", year: "numeric" })} className="h-full">
          {cal.data ? <MiniCalendar tasks={cal.data.tasks} today={d.today} /> : <Skeleton className="h-44 w-full" />}
        </Tile>
      </motion.div>

      <motion.div {...rise(2)} className="lg:col-span-6">
        <Tile className="h-full">
          <label className="relative block">
            <span className="sr-only">{t("search")}</span>
            <MagnifyingGlass size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" aria-hidden />
            <input className="field pl-10" placeholder={t("searchCommand")} value={cmd} onChange={(e) => setCmd(e.target.value)} />
          </label>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {shortcuts.map((s) => <IconTile key={s.label} icon={s.icon} label={s.label} to={s.to} disabled={!s.act && !s.to} loading={s.act && calling} onClick={s.act ? askCallback : undefined} />)}
            {shortcuts.length === 0 && <p className="col-span-full text-muted">{t("nothingHere")}</p>}
          </div>
        </Tile>
      </motion.div>

      <motion.div {...rise(3)} className="lg:col-span-9">
        <Tile title={t("medicinesToday")} aside={`${taken}/${meds}`} className="h-full">
          {canSpeak() && (
            <div className="mb-3 flex flex-wrap items-center gap-3">
            <LangToggle compact />
            <Button small look={talking === "day" ? "attention" : "quiet"} onClick={() => say("day", "all")} aria-pressed={talking === "day"}>
              {talking === "day" ? <><SpeakerSimpleSlash size={16} aria-hidden /> {t("stopReading")}</> : <><SpeakerSimpleHigh size={16} aria-hidden /> {t("readDayAloud")}</>}
            </Button>
            </div>
          )}
          {meds === 0 ? (
            <EmptyState title={t("noMedsToday")} text={t("noMedsTodayText")} action={planId && <LinkButton to={`/plan/${planId}`} look="quiet" small>{t("openPlan")}</LinkButton>} />
          ) : (
            <div className="grid gap-3 md:grid-cols-3">
              {SLOTS.map((slot) => {
                const Icon = SLOT_ICON[slot];
                const rows = [...d.medicines[slot]].sort((a, b) => Number(a.status === "Completed") - Number(b.status === "Completed"));
                return (
                  <div key={slot}>
                    <h3 className="mb-1 flex items-center gap-1.5 text-sm font-bold"><Icon size={18} weight="duotone" className="text-primary" aria-hidden /> {t(slot)}
                      {canSpeak() && rows.length > 0 && (
                        <button className="ml-auto rounded-sm p-1 text-primary hover:bg-line" aria-label={`${t("readAloud")}: ${t(slot)}`} aria-pressed={talking === slot}
                          onClick={() => say(slot, slot)}>
                          {talking === slot ? <SpeakerSimpleSlash size={18} aria-hidden /> : <SpeakerSimpleHigh size={18} aria-hidden />}
                        </button>
                      )}
                    </h3>
                    {rows.length === 0 && <p className="text-sm text-muted">{t("nothingThisTime")}</p>}
                    <ul className="space-y-1">
                      <AnimatePresence initial={false}>
                        {rows.map((m) => (
                          <motion.li layout key={m.task_id} transition={mt(0.2)}>
                            <button onClick={() => flip(m)} disabled={busy === m.task_id} role="checkbox" aria-checked={m.status === "Completed"}
                              className={`flex w-full items-start gap-2 rounded-sm border px-2 py-1.5 text-left text-sm ${m.status === "Completed" ? "border-line bg-bg text-muted line-through" : "border-line bg-surface hover:border-primary"}`}>
                              {m.status === "Completed" ? <CheckCircle size={18} weight="fill" className="mt-0.5 shrink-0 text-primary" aria-hidden /> : <Circle size={18} className="mt-0.5 shrink-0 text-muted" aria-hidden />}
                              <span className="lang-text">{m.medicines.join(", ")}</span>
                            </button>
                          </motion.li>
                        ))}
                      </AnimatePresence>
                    </ul>
                  </div>
                );
              })}
            </div>
          )}
        </Tile>
      </motion.div>

      <motion.div {...rise(4)} className="lg:col-span-3">
        <Tile title={t("nextVisit")} className="h-full">
          {d.next_event ? (
            <>
              <p className="flex items-center gap-2"><CategoryIcon category={d.next_event.category ?? "appointment"} size={16} /><strong className="lang-text">{d.next_event.title}</strong></p>
              <div className="mt-2">
                <Props rows={[
                  [t("date"), <span className="font-mono">{fmtDate(d.next_event.due_at, { day: "numeric", month: "short" })}, {fmtTime(d.next_event.due_at)}</span>],
                  [t("place"), <span className="flex items-center gap-1"><MapPin size={14} aria-hidden />{d.next_event.place}</span>],
                  [t("plan"), <Link to={`/plan/${d.next_event.document_id}`}>{t("openPlan")}</Link>],
                ]} />
              </div>
            </>
          ) : <p className="text-muted">{t("nothingBooked")}</p>}
        </Tile>
      </motion.div>

      <motion.div {...rise(5)} className="lg:col-span-3">
        <Tile title={t("waitingDoctor")} aside={d.needs_review_count} className="h-full">
          {d.needs_review.length === 0 ? <p className="text-muted">{t("noReview")}</p> : (
            <ul className="space-y-1.5">
              {d.needs_review.slice(0, 3).map((r) => (
                <li key={r.item_id} className="rounded-sm border border-attention bg-attention-tint px-2 py-1">
                  <p className="lang-text text-sm font-semibold">{r.title}</p>
                  <p className="text-xs text-attention">{r.reason}</p>
                </li>
              ))}
              {d.needs_review_count > 3 && <li className="text-xs text-muted">{t("andMore").replace("{n}", String(d.needs_review_count - 3))}</li>}
            </ul>
          )}
        </Tile>
      </motion.div>

      <motion.div {...rise(6)} className="lg:col-span-3">
        <Tile title={t("next7")} className="h-full">
          {d.upcoming.length === 0 ? (
            <p className="text-sm text-muted">{d.next_event ? t("nothingThisWeekNext").replace("{title}", d.next_event.title).replace("{date}", fmtDate(d.next_event.due_at, { day: "numeric", month: "short" })) : t("nothingThisWeek")}</p>
          ) : (
            <ul className="rule-list text-sm">
              {d.upcoming.slice(0, 5).map((e) => (
                <li key={e.task_id} className="flex justify-between gap-2 py-1"><span className="lang-text truncate">{e.title}</span><span className="shrink-0 font-mono text-xs text-muted">{fmtDate(e.due_at, { day: "numeric", month: "short" })}</span></li>
              ))}
            </ul>
          )}
        </Tile>
      </motion.div>

      <motion.div {...rise(7)} className="lg:col-span-3">
        <Tile title={t("activity")} className="h-full">
          {cal.data ? <ActivityDots tasks={cal.data.tasks} today={d.today} /> : <Skeleton className="h-16 w-full" />}
        </Tile>
      </motion.div>

      <motion.div {...rise(8)} className="grid grid-cols-3 gap-2 sm:grid-cols-5 lg:col-span-6">
        <Stat n={d.plans} label={t("plans")} />
        <Stat n={d.progress.done} label={t("done")} />
        <Stat n={overdue} label={t("overdue")} warn={overdue > 0} />
        <Stat n={d.needs_review_count} label={t("waitingDoctor")} warn={d.needs_review_count > 0} />
        <Stat n={d.open_callbacks} label={t("callbacks")} />
      </motion.div>

      <motion.div {...rise(9)} className="lg:col-span-6">
        <Tile title={t("yourPlans")} aside={docs.data?.length} className="h-full">
          {docs.loading && <Skeleton className="h-12 w-full" />}
          {docs.data?.length === 0 && <EmptyState title={t("noPlanYet")} text={t("noPlanYetText")} action={<LinkButton to="/patient/upload" small>{t("getStarted")}</LinkButton>} />}
          <ul className="rule-list">
            {docs.data?.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 py-1.5">
                <span className="min-w-0 text-sm"><Link to={`/plan/${p.id}`} className="font-semibold">{p.title}</Link> <span className="font-mono text-xs text-muted">{fmtDate(p.discharge_date, { day: "numeric", month: "short" })}</span></span>
                <span className="font-mono text-xs text-muted">{p.items ?? 0} {t("instructions")}{p.needs_review ? `, ${p.needs_review} ${t("waitingForDoctor")}` : ""}</span>
              </li>
            ))}
          </ul>
        </Tile>
      </motion.div>
    </div>
  );
}
