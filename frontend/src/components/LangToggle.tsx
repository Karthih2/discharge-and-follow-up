import { api, getToken } from "../lib/api";
import { LANG_NAMES, useLang } from "../lib/lang";
import type { Lang } from "../lib/types";

export function LangToggle({ compact = false }: { compact?: boolean }) {
  const { lang, setLang, t } = useLang();
  const change = (l: Lang) => {
    setLang(l);
    if (getToken()) api.setLanguage(l).catch(() => undefined);
  };
  return (
    <label className="inline-flex items-center gap-2">
      <span className={compact ? "sr-only" : "text-sm font-semibold"}>{t("language")}</span>
      <select className="field w-auto py-1" value={lang} onChange={(e) => change(e.target.value as Lang)}>
        {LANG_NAMES.map((l) => (
          <option key={l.code} value={l.code}>
            {l.label}
          </option>
        ))}
      </select>
    </label>
  );
}
