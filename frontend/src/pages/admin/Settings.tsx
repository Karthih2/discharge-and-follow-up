import { useEffect, useState } from "react";
import { Button, Card, Input, PageHead, Skeleton } from "../../components/ui";
import { api } from "../../lib/api";
import { useLang } from "../../lib/lang";
import { invalidate, useQuery } from "../../lib/query";
import { toast } from "../../lib/toast";
import type { SettingsMap } from "../../lib/types";

const LANGS = [["en", "English"], ["ta", "தமிழ்"], ["hi", "हिन्दी"], ["te", "తెలుగు"], ["kn", "ಕನ್ನಡ"], ["ml", "മലയാളം"]] as const;
const HOURS = ["reviewer_threshold_hours", "caregiver_threshold_hours", "remind_threshold_hours"] as const;

export default function Settings() {
  const { t } = useLang();
  const cur = useQuery("admin/settings", api.settings);
  const [f, setF] = useState<SettingsMap | null>(null);
  const [errs, setErrs] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (cur.data) setF(cur.data); }, [cur.data]);

  if (!f) return <div className="space-y-4" role="status" aria-label="Loading"><Skeleton className="h-10 w-1/3" /><Skeleton className="h-64 w-full" /></div>;
  const langs = f.enabled_languages.split(",");
  const label = { reviewer_threshold_hours: t("setReviewer"), caregiver_threshold_hours: t("setCaregiver"), remind_threshold_hours: t("setRemind") };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const next: Record<string, string> = {};
    for (const k of HOURS) {
      const n = Number(f[k]);
      if (!f[k] || Number.isNaN(n) || n < 1 || n > 720) next[k] = t("errHours");
    }
    if (!langs.length || !langs[0]) next.enabled_languages = t("errLanguages");
    if (f.extract_model.trim().length < 3) next.extract_model = t("errModel");
    if (f.rewrite_model.trim().length < 3) next.rewrite_model = t("errModel");
    setErrs(next);
    if (Object.keys(next).length) return;
    setBusy(true);
    try {
      await api.saveSettings(f);
      toast(t("toastSaved"));
      invalidate("admin");
    } catch (x) {
      setErrs({ form: (x as Error).message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="max-w-3xl space-y-6" onSubmit={save} noValidate>
      <PageHead title={t("settings")} text={t("settingsIntro")} />
      <Card as="section" className="space-y-3 p-4">
        <h2 className="text-xl">{t("thresholds")}</h2>
        <div className="grid gap-3 md:grid-cols-3">
          {HOURS.map((k) => <Input key={k} label={label[k]} inputMode="numeric" value={f[k]} error={errs[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })} />)}
        </div>
      </Card>
      <Card as="section" className="space-y-3 p-4">
        <h2 className="text-xl">{t("enabledLanguages")}</h2>
        <div className="flex flex-wrap gap-4">
          {LANGS.map(([code, name]) => (
            <label key={code} className="inline-flex items-center gap-2">
              <input type="checkbox" checked={langs.includes(code)} disabled={code === "en"}
                onChange={() => setF({ ...f, enabled_languages: (langs.includes(code) ? langs.filter((x) => x !== code) : [...langs, code]).join(",") })} /> {name}
            </label>
          ))}
        </div>
        {errs.enabled_languages && <p role="alert" className="text-sm text-attention">{errs.enabled_languages}</p>}
      </Card>
      <Card as="section" className="space-y-3 p-4">
        <h2 className="text-xl">{t("modelNames")}</h2>
        <div className="grid gap-3 md:grid-cols-2">
          <Input label={t("extractModel")} value={f.extract_model} error={errs.extract_model} onChange={(e) => setF({ ...f, extract_model: e.target.value })} />
          <Input label={t("rewriteModel")} value={f.rewrite_model} error={errs.rewrite_model} onChange={(e) => setF({ ...f, rewrite_model: e.target.value })} />
        </div>
      </Card>
      {errs.form && <p role="alert" className="text-attention">{errs.form}</p>}
      <Button type="submit" loading={busy}>{t("save")}</Button>
    </form>
  );
}
