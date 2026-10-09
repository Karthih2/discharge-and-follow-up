import { ArrowUUpLeft, Check, NotePencil } from "@phosphor-icons/react";
import { forwardRef, Fragment, useEffect, useImperativeHandle, useRef, useState } from "react";
import { api } from "../lib/api";
import { useLang } from "../lib/lang";
import { fmtDate } from "../lib/motion";
import { useQuery } from "../lib/query";
import type { ReviewEntry } from "../lib/types";
import { CategoryIcon } from "./Fx";
import { Badge, Button, Input, Select, Skeleton, Textarea } from "./ui";

const FLAGGED = /(as needed|if required|if needed|as advised|as required|sometime|to be decided|when better|adjust\w*|may increase|increase|decrease|reduce|stop|start(?:ed)?|continue|restrict|plenty|new medicine)/gi;
const SLOTS = ["morning", "afternoon", "night"] as const;

/** Words that make a line unclear are marked. */
function Marked({ text }: { text: string }) {
  return (
    <>
      {text.split(FLAGGED).map((p, i) => (i % 2 === 1 ? <mark key={i} className="hl-warn rounded-sm px-0.5 font-semibold text-attention">{p}</mark> : <Fragment key={i}>{p}</Fragment>))}
    </>
  );
}

export interface ReviewPaneHandle {
  confirm: () => void;
  correct: () => void;
  sendBack: () => void;
}

/** Source lines on the left with the held lines marked. Only a few lines around them show. */
function SourceLines({ docId, marked }: { docId: number; marked: number[] }) {
  const { t } = useLang();
  const src = useQuery(`source/${docId}`, () => api.source(docId));
  const first = useRef<HTMLLIElement>(null);
  useEffect(() => {
    first.current?.scrollIntoView({ block: "nearest" });
  }, [src.data, marked.join(",")]);
  if (!src.data) return <div className="space-y-2" role="status" aria-label="Loading"><Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-5/6" /><Skeleton className="h-4 w-4/6" /></div>;
  const lo = Math.max(1, Math.min(...marked, 9999) - 3);
  const hi = Math.max(...marked, 0) + 3;
  const rows = src.data.filter((l) => (marked.length ? l.line_no >= lo && l.line_no <= hi : l.line_no <= 8));
  return (
    <ol className="max-h-72 space-y-0.5 overflow-y-auto font-mono text-[0.92rem]" aria-label={t("sourceLines")}>
      {rows.map((l, i) => {
        const hot = marked.includes(l.line_no);
        return (
          <li key={l.line_no} ref={hot && !rows.slice(0, i).some((x) => marked.includes(x.line_no)) ? first : undefined}
            className={`grid grid-cols-[2rem_1fr] gap-2 rounded-sm px-1 ${hot ? "hl-warn" : "text-muted"}`}>
            <span className="text-right tnum opacity-70">{l.line_no}</span>
            <span>{hot ? <Marked text={l.text} /> : l.text}</span>
          </li>
        );
      })}
    </ol>
  );
}

/** One review item: the source next to the extracted fields, then Confirm, Correct and Send back. */
export const ReviewPane = forwardRef<ReviewPaneHandle, { r: ReviewEntry; onAct: (r: ReviewEntry, body: Parameters<typeof api.resolve>[1]) => Promise<void> }>(function ReviewPane({ r, onAct }, ref) {
  const { t } = useLang();
  const [mode, setMode] = useState<"view" | "correct" | "back">("view");
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [text, setText] = useState(r.item?.original_text ?? "");
  const [dose, setDose] = useState("");
  const [freq, setFreq] = useState(1);
  const [timing, setTiming] = useState<string[]>(["morning"]);
  const [days, setDays] = useState("");
  const [instr, setInstr] = useState("");
  const firstField = useRef<HTMLInputElement>(null);
  const noteBox = useRef<HTMLTextAreaElement>(null);

  const isOpen = r.state === "open";
  const med = r.item?.category === "medication";
  const hot = (code: string) => r.codes.includes(code);
  const mark = (flag: boolean) => (flag ? "hl-warn rounded-sm px-1 font-semibold text-attention" : "");

  const run = async (kind: string, body: Parameters<typeof api.resolve>[1]) => {
    setErr(null);
    setBusy(kind);
    try {
      await onAct(r, body);
    } catch (e) {
      setErr((e as Error).message);
      setBusy(null);
    }
  };
  const confirm = () => isOpen && run("approve", { action: "approve", note: note || undefined });
  const save = () => run("edit", {
    action: "edit", note: note || undefined,
    edited_text: med ? undefined : text,
    fields: med ? { dose, frequency: freq, timing, duration_days: days ? Number(days) : undefined, instructions: instr || undefined } : undefined,
  });
  const sendBack = () => {
    if (!note.trim()) {
      setErr(t("noteNeeded"));
      noteBox.current?.focus();
      return;
    }
    run("reject", { action: "reject", note: note.trim() });
  };

  useImperativeHandle(ref, () => ({
    confirm,
    correct: () => { if (isOpen) { setMode("correct"); setTimeout(() => firstField.current?.focus(), 30); } },
    sendBack: () => { if (isOpen) { setMode("back"); setTimeout(() => noteBox.current?.focus(), 30); } },
  }));

  return (
    <article className="space-y-4" aria-label={r.item?.title}>
      <header className="flex flex-wrap items-center gap-2">
        {r.item && <CategoryIcon category={r.item.category} size={22} />}
        <h2 className="min-w-0 text-2xl">{r.item?.title}</h2>
        <Badge tone={r.severity === "high" ? "solid" : r.severity === "medium" ? "warn" : "plain"}>{t(r.severity === "high" ? "sevHigh" : r.severity === "medium" ? "sevMedium" : "sevLow")}</Badge>
        {!isOpen && <Badge tone="mark">{t(`state_${r.state}` as "state_approved")}</Badge>}
      </header>
      <p className="text-muted">{r.patient_alias}. {r.department}. {t("waited")} {r.age_hours < 1 ? t("underHour") : `${Math.round(r.age_hours)} h`}.</p>

      <div>
        <p className="mb-1 font-semibold">{t("whyHeld")}</p>
        <ul className="list-disc pl-5 text-attention">
          {(r.reason_plain.length ? r.reason_plain : [r.reason]).map((x) => <li key={x}>{x}</li>)}
        </ul>
        <p className="mt-1 flex flex-wrap gap-1">{r.codes.map((c) => <Badge key={c} tone="warn" className="font-mono text-xs">{c}</Badge>)}</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-sm border border-line bg-bg p-3" aria-label={t("originalSummary")}>
          <p className="mb-2 text-sm text-muted">{t("originalSummary")}</p>
          <SourceLines docId={r.document_id} marked={r.item?.source_line_nos ?? []} />
        </section>
        <section className="rounded-sm border border-line p-3" aria-label={t("extractedItem")}>
          <p className="mb-2 text-sm text-muted">{t("extractedItem")}</p>
          {r.item && (
            <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-[0.95rem]">
              <dt className="text-muted">{t("fieldTitle")}</dt><dd>{r.item.title}</dd>
              <dt className="text-muted">{t("fieldCategory")}</dt><dd>{r.item.category}</dd>
              {med && <><dt className="text-muted">{t("fieldDose")}</dt><dd className={mark(hot("MISSING_DOSE"))}>{hot("MISSING_DOSE") ? t("missing") : t("asWritten")}</dd></>}
              <dt className="text-muted">{t("fieldDateWritten")}</dt><dd className={mark(hot("MISSING_DATE"))}>{r.item.date_raw ?? t("none")}</dd>
              <dt className="text-muted">{t("fieldDateWorked")}</dt><dd className={mark(hot("MISSING_DATE"))}>{r.item.date_resolved ? fmtDate(r.item.date_resolved) : t("couldNot")}</dd>
              <dt className="text-muted">{t("fieldTime")}</dt><dd>{r.item.time_of_day ?? t("none")}</dd>
              <dt className="text-muted">{t("fieldConfidence")}</dt><dd className={mark(hot("LOW_CONFIDENCE"))}>{Math.round(r.item.confidence * 100)}%</dd>
            </dl>
          )}
        </section>
      </div>

      {isOpen && mode === "correct" && med && (
        <fieldset className="grid gap-3 rounded-sm border border-line p-3 md:grid-cols-2">
          <legend className="px-1 text-sm font-semibold">{t("fillMedValues")}</legend>
          <Input ref={firstField} label={t("doseHint")} value={dose} onChange={(e) => setDose(e.target.value)} />
          <Select label={t("timesADay")} value={freq} onChange={(e) => setFreq(Number(e.target.value))}>
            <option value={1}>{t("once")}</option><option value={2}>{t("twice")}</option><option value={3}>{t("threeTimes")}</option>
          </Select>
          <div className="text-sm font-semibold">
            {t("timeOfDay")}
            <div className="mt-1 flex gap-3 font-normal">
              {SLOTS.map((s) => (
                <label key={s} className="inline-flex items-center gap-1">
                  <input type="checkbox" checked={timing.includes(s)} onChange={() => setTiming(timing.includes(s) ? timing.filter((x) => x !== s) : [...timing, s])} /> {t(s)}
                </label>
              ))}
            </div>
          </div>
          <Input label={t("durationDays")} inputMode="numeric" value={days} onChange={(e) => setDays(e.target.value.replace(/\D/g, ""))} />
          <div className="md:col-span-2"><Input label={t("specialInstruction")} value={instr} onChange={(e) => setInstr(e.target.value)} /></div>
        </fieldset>
      )}
      {isOpen && mode === "correct" && !med && (
        <Textarea label={t("correctedWording")} className="h-20" value={text} onChange={(e) => setText(e.target.value)} />
      )}

      {isOpen && (
        <div className="space-y-3">
          <div>
            <label htmlFor={`note-${r.id}`} className="mb-1 block font-semibold">{mode === "back" ? t("noteSendBack") : t("noteAudit")}</label>
            <textarea ref={noteBox} id={`note-${r.id}`} className="field h-16" value={note} onChange={(e) => { setNote(e.target.value); setErr(null); }}
              onKeyDown={(e) => { if (mode === "back" && e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendBack(); } }} />
          </div>
          {err && <p role="alert" className="text-attention">{err}</p>}
          <div className="flex flex-wrap gap-2">
            <Button onClick={confirm} loading={busy === "approve"} disabled={!!busy && busy !== "approve"}><Check size={18} aria-hidden /> {t("confirm")} <kbd className="kbd">C</kbd></Button>
            {mode === "correct" ? (
              <Button look="quiet" onClick={save} loading={busy === "edit"} disabled={(med ? !dose.trim() || timing.length === 0 : !text.trim()) || (!!busy && busy !== "edit")}><NotePencil size={18} aria-hidden /> {t("saveRelease")}</Button>
            ) : (
              <Button look="quiet" onClick={() => { setMode("correct"); setTimeout(() => firstField.current?.focus(), 30); }}><NotePencil size={18} aria-hidden /> {t("correct")} <kbd className="kbd">E</kbd></Button>
            )}
            <Button look="quiet" onClick={() => (mode === "back" ? sendBack() : (setMode("back"), setTimeout(() => noteBox.current?.focus(), 30)))} loading={busy === "reject"} disabled={!!busy && busy !== "reject"}>
              <ArrowUUpLeft size={18} aria-hidden /> {t("sendBack")} <kbd className="kbd">S</kbd>
            </Button>
          </div>
        </div>
      )}
      {!isOpen && r.reviewer_note && <p className="text-muted">{t("note")}: {r.reviewer_note}</p>}
    </article>
  );
});
