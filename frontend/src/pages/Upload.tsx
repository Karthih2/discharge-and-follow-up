import { FileArrowUp, ShieldCheck } from "@phosphor-icons/react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button, Card, Skeleton } from "../components/ui";
import { api, type Created } from "../lib/api";
import { LANG_NAMES, useLang } from "../lib/lang";
import { useQuery } from "../lib/query";
import type { Lang } from "../lib/types";

export default function Upload() {
  const nav = useNavigate();
  const { t, lang: ui } = useLang();
  const { data: samples } = useQuery("samples", api.samples);
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
              <span className="rounded-sm border border-line px-2 text-sm">{m.kind}</span>
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
      <header className="max-w-2xl">
        <h1 className="text-4xl">{t("addSummaryTitle")}</h1>
        <p className="mt-2 text-muted">{t("uploadIntro")}</p>
      </header>

      <div className="grid gap-10 lg:grid-cols-2">
        <section aria-labelledby="h-own" className="space-y-4">
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
            <FileArrowUp size={20} aria-hidden /> {t("checkContinue")}
          </Button>
        </section>

        <section aria-labelledby="h-samples" className="space-y-3">
          <h2 id="h-samples" className="text-2xl">{t("orSample")}</h2>
          {!samples && (
            <div className="space-y-3">
              {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-20 w-full" />)}
            </div>
          )}
          <ul className="space-y-3">
            {samples?.map((s) => (
              <Card key={s.key} as="li" className="flex items-center justify-between gap-4 p-4">
                <div>
                  <h3 className="text-lg">{s.title}</h3>
                  <p className="text-muted">{s.blurb}</p>
                  <p className="text-sm text-muted">{s.patient_alias}. {s.city}.</p>
                </div>
                <Button look="quiet" className="shrink-0" disabled={busy} onClick={() => go(() => api.createDocument({ sample_key: s.key }))}>
                  {t("useThis")}
                </Button>
              </Card>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
