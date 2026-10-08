import { FileArrowUp, ShieldCheck } from "@phosphor-icons/react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Skeleton } from "../components/Skeleton";
import { api, type Created } from "../lib/api";
import { useLoad } from "../lib/motion";
import type { Lang } from "../lib/types";

export default function Upload() {
  const nav = useNavigate();
  const { data: samples } = useLoad(() => api.samples(), []);
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [lang, setLang] = useState<Lang>("en");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [created, setCreated] = useState<Created | null>(null);

  const go = async (make: () => Promise<Created>) => {
    setBusy(true);
    setErr(null);
    try {
      const c = await make();
      if (c.masked.length === 0) nav(`/patient/run/${c.document.id}`);
      else setCreated(c);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  if (created)
    return (
      <div className="max-w-2xl space-y-5">
        <h1 className="text-4xl">We hid some personal details</h1>
        <p className="text-muted">These looked like real personal data. They were masked before anything was saved or sent to the AI model.</p>
        <ul className="space-y-2">
          {created.masked.map((m, i) => (
            <li key={i} className="card flex flex-wrap items-center gap-3 p-3">
              <span className="rounded-sm border border-line px-2 text-sm">{m.kind}</span>
              <span className="text-muted line-through">{m.original}</span>
              <span className="font-semibold">{m.masked}</span>
            </li>
          ))}
        </ul>
        <button className="btn" onClick={() => nav(`/patient/run/${created.document.id}`)}>
          Continue and build the plan
        </button>
      </div>
    );

  return (
    <div className="space-y-10">
      <header className="max-w-2xl">
        <h1 className="text-4xl">Add a discharge summary</h1>
        <p className="mt-2 text-muted">Use a synthetic summary only. Real names, phone numbers, Aadhaar, PAN and emails are masked before anything is saved.</p>
      </header>

      <div className="grid gap-10 lg:grid-cols-2">
        <section aria-labelledby="h-own" className="space-y-4">
          <h2 id="h-own" className="text-2xl">Paste text or choose a PDF</h2>
          <label className="block">
            <span className="mb-1 block font-semibold">Summary text</span>
            <textarea className="field h-56 font-mono text-sm" value={text} onChange={(e) => setText(e.target.value)} placeholder="Paste the discharge summary here" />
          </label>
          <label className="block">
            <span className="mb-1 block font-semibold">Or a PDF file</span>
            <input type="file" accept="application/pdf" className="field" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          </label>
          <label className="block max-w-xs">
            <span className="mb-1 block font-semibold">Preferred language</span>
            <select className="field" value={lang} onChange={(e) => setLang(e.target.value as Lang)}>
              <option value="en">English</option>
              <option value="ta">Tamil</option>
              <option value="hi">Hindi</option>
            </select>
          </label>
          <p className="flex items-center gap-2 text-sm text-muted">
            <ShieldCheck size={18} aria-hidden /> Privacy check runs first.
          </p>
          {err && <p role="alert" className="text-attention">{err}</p>}
          <button
            className="btn"
            disabled={busy || (!text.trim() && !file)}
            onClick={() => go(() => (file ? api.createFromPdf(file, lang) : api.createDocument({ text, preferred_language: lang })))}
          >
            <FileArrowUp size={20} aria-hidden /> Check and continue
          </button>
        </section>

        <section aria-labelledby="h-samples" className="space-y-3">
          <h2 id="h-samples" className="text-2xl">Or use a sample</h2>
          {!samples && (
            <div className="space-y-3">
              {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-20 w-full" />)}
            </div>
          )}
          <ul className="space-y-3">
            {samples?.map((s) => (
              <li key={s.key} className="card flex items-center justify-between gap-4 p-4">
                <div>
                  <h3 className="text-lg">{s.title}</h3>
                  <p className="text-muted">{s.blurb}</p>
                  <p className="text-sm text-muted">{s.patient_alias}. {s.city}.</p>
                </div>
                <button className="btn btn-quiet shrink-0" disabled={busy} onClick={() => go(() => api.createDocument({ sample_key: s.key }))}>
                  Use this
                </button>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
