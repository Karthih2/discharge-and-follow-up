import { Languages } from "lucide-react";
import { LANG_NAMES, useLang } from "../lib/lang";
import { api, getToken } from "../lib/api";
import type { Lang } from "../lib/types";

/** Full-screen language chooser shown on first visit (no stored preference). */
export function LangPicker() {
  const { needsPick, setLang } = useLang();
  // The landing page has its own language tiles, so first-time visitors are not blocked there.
  if (!needsPick || location.pathname === "/") return null;

  const pick = (code: Lang) => {
    setLang(code);
    if (getToken()) api.setLanguage(code).catch(() => undefined);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" style={{ background: "radial-gradient(40rem 30rem at 10% 0%, rgba(2,195,154,0.35), transparent 60%), radial-gradient(36rem 30rem at 100% 100%, rgba(240,243,189,0.18), transparent 60%), linear-gradient(160deg, #05668D, #034a66)" }} role="dialog" aria-modal="true" aria-label="Choose language">
      <div className="w-full max-w-sm space-y-6 text-center">
        <Languages size={48} className="mx-auto text-white/80" aria-hidden />
        <h1 className="text-2xl font-bold text-white">Choose your language</h1>
        <p className="text-sm text-white/70">You can change this anytime</p>
        <div className="grid grid-cols-2 gap-3">
          {LANG_NAMES.map((l) => (
            <button
              key={l.code}
              onClick={() => pick(l.code)}
              className="rounded-input border border-white/20 bg-white/10 px-4 py-3 text-lg font-semibold text-white backdrop-blur transition-all hover:bg-white/20 hover:scale-[1.02] active:scale-[0.98]"
            >
              {l.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
