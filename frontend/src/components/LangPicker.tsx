import { Languages } from "lucide-react";
import { LANG_NAMES, useLang } from "../lib/lang";
import { api, getToken } from "../lib/api";
import type { Lang } from "../lib/types";

/** Full-screen language chooser shown on first visit (no stored preference). */
export function LangPicker() {
  const { needsPick, setLang } = useLang();
  if (!needsPick) return null;

  const pick = (code: Lang) => {
    setLang(code);
    if (getToken()) api.setLanguage(code).catch(() => undefined);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-brand-700 p-4" role="dialog" aria-modal="true" aria-label="Choose language">
      <div className="w-full max-w-sm space-y-6 text-center">
        <Languages size={48} className="mx-auto text-white/80" aria-hidden />
        <h1 className="text-2xl font-bold text-white">Choose your language</h1>
        <p className="text-sm text-white/70">You can change this anytime</p>
        <div className="grid grid-cols-2 gap-3">
          {LANG_NAMES.map((l) => (
            <button
              key={l.code}
              onClick={() => pick(l.code)}
              className="rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-lg font-semibold text-white backdrop-blur transition-all hover:bg-white/20 hover:scale-[1.02] active:scale-[0.98]"
            >
              {l.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
