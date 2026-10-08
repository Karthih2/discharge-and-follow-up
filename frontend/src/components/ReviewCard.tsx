import { Check, NotePencil, X } from "@phosphor-icons/react";
import { motion } from "motion/react";
import { Fragment, useState } from "react";
import { api } from "../lib/api";
import { fmtDate, useMotionT } from "../lib/motion";
import type { ReviewEntry } from "../lib/types";
import { CategoryIcon } from "./Fx";

export const SEV: Record<string, string> = {
  high: "border-attention bg-attention text-surface",
  medium: "border-attention bg-attention-tint text-attention",
  low: "border-line text-muted",
};

const FLAGGED = /(as needed|if required|if needed|as advised|as required|sometime|to be decided|when better|adjust\w*|may increase|increase|decrease|reduce|stop|start(?:ed)?|continue|restrict|plenty|new medicine)/gi;

/** Original line with the unclear words marked. */
function Marked({ text }: { text: string }) {
  const parts = text.split(FLAGGED);
  return (
    <>
      {parts.map((p, i) =>
        i % 2 === 1 ? <mark key={i} className="hl-warn rounded-sm px-0.5 font-semibold text-attention">{p}</mark> : <Fragment key={i}>{p}</Fragment>,
      )}
    </>
  );
}

const SLOTS = ["morning", "afternoon", "night"] as const;

/** Doctor view of one queue entry: source line, flagged fields, reason in plain words, and the form to fix it. */
export function ReviewCard({ r, onDone }: { r: ReviewEntry; onDone: () => void }) {
  const mt = useMotionT();
  const [note, setNote] = useState("");
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState("");
  const [dose, setDose] = useState("");
  const [freq, setFreq] = useState(1);
  const [timing, setTiming] = useState<string[]>(["morning"]);
  const [days, setDays] = useState("");
  const [instr, setInstr] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const isOpen = r.state === "open";
  const med = r.item?.category === "medication";
  const hot = (code: string) => r.codes.includes(code);
  const row = (flag: boolean) => (flag ? "hl-warn rounded-sm px-1 text-attention font-semibold" : "");

  const act = async (action: "approve" | "edit" | "reject") => {
    setErr(null);
    try {
      await api.resolve(r.id, {
        action,
        note: note || undefined,
        edited_text: action === "edit" && !med ? text : undefined,
        fields: action === "edit" && med ? { dose, frequency: freq, timing, duration_days: days ? Number(days) : undefined, instructions: instr || undefined } : undefined,
      });
      onDone();
    } catch (e) {
      setErr((e as Error).message);
    }
  };

  return (
    <motion.li layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={mt(0.22)} className="card p-4">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        {r.item && <CategoryIcon category={r.item.category} size={22} />}
        <span className={`rounded-sm border px-2 text-sm font-semibold ${SEV[r.severity]}`}>{r.severity}</span>
        {r.codes.map((c) => (
          <span key={c} className="rounded-sm border border-attention px-2 font-mono text-xs text-attention">{c}</span>
        ))}
        <span className="text-muted">{r.patient_alias}, plan #{r.document_id}, waiting {r.age_hours < 1 ? "under an hour" : `${Math.round(r.age_hours)} h`}</span>
        {!isOpen && <span className="rounded-sm border border-primary px-2 text-sm text-primary">{r.state}</span>}
        {r.fallback_doctor && isOpen && <span className="text-sm text-muted">Backup: {r.fallback_doctor.name}</span>}
      </div>
      <p className="mb-1 font-semibold">Why this was held</p>
      <ul className="mb-3 list-disc pl-5 text-attention">
        {(r.reason_plain.length ? r.reason_plain : [r.reason]).map((x) => <li key={x}>{x}</li>)}
      </ul>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-sm border border-line bg-bg p-3">
          <p className="mb-1 text-sm text-muted">Source line</p>
          <p className="font-mono text-[0.95rem]"><Marked text={r.item?.original_text ?? ""} /></p>
        </div>
        <div className="rounded-sm border border-line p-3">
          <p className="mb-1 text-sm text-muted">Extracted fields (flagged ones are marked)</p>
          {r.item && (
            <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-[0.95rem]">
              <dt className="text-muted">Title</dt><dd>{r.item.title}</dd>
              <dt className="text-muted">Category</dt><dd>{r.item.category}</dd>
              {med && <><dt className="text-muted">Dose</dt><dd className={row(hot("MISSING_DOSE"))}>{hot("MISSING_DOSE") ? "missing" : "as written"}</dd></>}
              {med && <><dt className="text-muted">Duration</dt><dd className={row(false)}>{r.item.approved_fields && "duration_days" in r.item.approved_fields ? String(r.item.approved_fields.duration_days) : "not stated"}</dd></>}
              <dt className="text-muted">Date as written</dt><dd className={row(hot("MISSING_DATE"))}>{r.item.date_raw ?? "none"}</dd>
              <dt className="text-muted">Date worked out</dt><dd className={row(hot("MISSING_DATE"))}>{r.item.date_resolved ? fmtDate(r.item.date_resolved) : "could not work out"}</dd>
              <dt className="text-muted">Time of day</dt><dd>{r.item.time_of_day ?? "none"}</dd>
              <dt className="text-muted">Confidence</dt><dd className={row(hot("LOW_CONFIDENCE"))}>{Math.round(r.item.confidence * 100)}%</dd>
            </dl>
          )}
        </div>
      </div>

      {isOpen && (
        <div className="mt-4 space-y-3">
          {editing && med && (
            <fieldset className="grid gap-3 rounded-sm border border-line p-3 md:grid-cols-2">
              <legend className="px-1 text-sm font-semibold">Fill in the medicine values. The patient text is built from a fixed template.</legend>
              <label className="text-sm font-semibold">Dose (for example 75 mg)<input className="field mt-1" value={dose} onChange={(e) => setDose(e.target.value)} /></label>
              <label className="text-sm font-semibold">Times a day
                <select className="field mt-1" value={freq} onChange={(e) => setFreq(Number(e.target.value))}>
                  <option value={1}>Once</option><option value={2}>Twice</option><option value={3}>Three times</option>
                </select>
              </label>
              <div className="text-sm font-semibold">
                Time of day
                <div className="mt-1 flex gap-3 font-normal">
                  {SLOTS.map((s) => (
                    <label key={s} className="inline-flex items-center gap-1">
                      <input type="checkbox" checked={timing.includes(s)} onChange={() => setTiming(timing.includes(s) ? timing.filter((x) => x !== s) : [...timing, s])} /> {s}
                    </label>
                  ))}
                </div>
              </div>
              <label className="text-sm font-semibold">Duration in days (optional)<input className="field mt-1" inputMode="numeric" value={days} onChange={(e) => setDays(e.target.value.replace(/\D/g, ""))} /></label>
              <label className="text-sm font-semibold md:col-span-2">Special instruction (for example after food)<input className="field mt-1" value={instr} onChange={(e) => setInstr(e.target.value)} /></label>
            </fieldset>
          )}
          {editing && !med && (
            <label className="block">
              <span className="mb-1 block text-sm font-semibold">Corrected wording for the patient (English). Other languages are translated again.</span>
              <textarea className="field h-20" value={text} onChange={(e) => setText(e.target.value)} />
            </label>
          )}
          <label className="block">
            <span className="mb-1 block text-sm font-semibold">Note (saved in the audit log)</span>
            <input className="field" value={note} onChange={(e) => setNote(e.target.value)} />
          </label>
          {err && <p role="alert" className="text-attention">{err}</p>}
          <div className="flex flex-wrap gap-2">
            <button className="btn" onClick={() => act("approve")}><Check size={18} aria-hidden /> Confirm</button>
            {editing ? (
              <button className="btn btn-quiet" disabled={med ? !dose.trim() || timing.length === 0 : !text.trim()} onClick={() => act("edit")}>
                <NotePencil size={18} aria-hidden /> Save and release
              </button>
            ) : (
              <button className="btn btn-quiet" onClick={() => { setEditing(true); setText(r.item?.original_text ?? ""); }}>
                <NotePencil size={18} aria-hidden /> Correct
              </button>
            )}
            <button className="btn btn-quiet" onClick={() => act("reject")}><X size={18} aria-hidden /> Remove item</button>
          </div>
        </div>
      )}
      {!isOpen && r.reviewer_note && <p className="mt-3 text-muted">Note: {r.reviewer_note}</p>}
    </motion.li>
  );
}
