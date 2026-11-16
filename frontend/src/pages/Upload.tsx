import { FileUp, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button, Card } from "../components/ui";
import { api, type Created } from "../lib/api";
import { LANG_NAMES, useLang } from "../lib/lang";
import type { Lang } from "../lib/types";

export default function Upload() {
  const nav = useNavigate();
  const { t, lang: ui } = useLang();
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [lang, setLang] = useState<Lang>(ui);
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
        <h1 className="text-4xl">{t("maskedTitle")}</h1>
        <p className="text-muted">{t("maskedText")}</p>
        <ul className="space-y-2">
          {created.masked.map((m, i) => (
            <Card key={i} as="li" className="flex flex-wrap items-center gap-3 p-3">
              <span className="rounded-md border border-line px-2 text-sm">{m.kind}</span>
              <span className="text-muted line-through">{m.original}</span>
              <span className="font-semibold">{m.masked}</span>
            </Card>
          ))}
        </ul>
        <Button  onClick={() => nav(`/patient/run/${created.document.id}`)}>
          {t("continueBuild")}
        </Button>
      </div>
    );

  return (
    <div className="space-y-10">
      <header className="page-hero">
        <div>
          <h1>{t("addSummaryTitle")}</h1>
          <p className="mt-1 text-muted">{t("uploadIntro")}</p>
        </div>
      </header>

      <div className="grid gap-10 lg:grid-cols-2">
        <section aria-labelledby="h-own" className="space-y-4 rounded-panel border border-line bg-surface p-6 shadow-card">
          <h2 id="h-own" className="text-2xl">{t("pasteOrPdf")}</h2>
          <label className="block">
            <span className="mb-1 block font-semibold">{t("summaryText")}</span>
            <textarea className="field h-56 font-mono text-sm" value={text} onChange={(e) => setText(e.target.value)} placeholder={t("pasteHere")} />
          </label>
          <label className="block">
            <span className="mb-1 block font-semibold">{t("orPdf")}</span>
            <input type="file" accept="application/pdf" className="field" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          </label>
          <label className="block max-w-xs">
            <span className="mb-1 block font-semibold">{t("preferredLanguage")}</span>
            <select className="field" value={lang} onChange={(e) => setLang(e.target.value as Lang)}>
              {LANG_NAMES.map((l) => <option key={l.code} value={l.code}>{l.label}</option>)}
            </select>
          </label>
          <p className="flex items-center gap-2 text-sm text-muted">
            <ShieldCheck size={18} aria-hidden /> {t("privacyFirst")}
          </p>
          {err && <p role="alert" className="text-attention">{err}</p>}
          <Button
            
            disabled={busy || (!text.trim() && !file)}
            onClick={() => go(() => (file ? api.createFromPdf(file, lang) : api.createDocument({ text, preferred_language: lang })))}
          >
            <FileUp size={20} aria-hidden /> {t("checkContinue")}
          </Button>
        </section>

        <section aria-labelledby="h-next" className="space-y-4 self-start rounded-panel border border-line bg-[linear-gradient(160deg,#f0f8ff_0%,#ffffff_45%,#f8f9e4_100%)] p-6">
          <h2 id="h-next" className="text-xl">{t("howItWorks")}</h2>
          <ol className="space-y-4">
            {([["step1T", "step1D"], ["step2T", "step2D"], ["step3T", "step3D"], ["step4T", "step4D"]] as const).map(([h, d], i) => (
              <li key={h} className="grid grid-cols-[2rem_1fr] gap-3">
                <span className="grid h-8 w-8 place-items-center rounded-full bg-white text-sm font-semibold text-brand-700 shadow-card">{i + 1}</span>
                <span><strong className="block text-ink">{t(h)}</strong><span className="text-sm text-muted">{t(d)}</span></span>
              </li>
            ))}
          </ol>
        </section>
      </div>
    </div>
  );
}
