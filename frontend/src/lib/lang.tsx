import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { CATEGORY_LABEL, STRINGS, type StringKey } from "../i18n/strings";
import type { Lang } from "./types";

interface Ctx {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (k: StringKey) => string;
  cat: (c: string) => string;
}

const LangContext = createContext<Ctx>(null as unknown as Ctx);
export const LANG_NAMES: { code: Lang; label: string }[] = [
  { code: "en", label: "English" },
  { code: "ta", label: "தமிழ்" },
  { code: "hi", label: "हिन्दी" },
  { code: "te", label: "తెలుగు" },
  { code: "kn", label: "ಕನ್ನಡ" },
  { code: "ml", label: "മലയാളം" },
];

function initial(): Lang {
  try {
    const v = localStorage.getItem("cb_lang") as Lang | null;
    if (v && LANG_NAMES.some((l) => l.code === v)) return v;
  } catch {
    /* storage unavailable */
  }
  return "en";
}

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(initial);
  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);
  const setLang = (l: Lang) => {
    setLangState(l);
    try {
      localStorage.setItem("cb_lang", l);
    } catch {
      /* ignore */
    }
  };
  const t = (k: StringKey) => STRINGS[k][lang];
  const cat = (c: string) => (CATEGORY_LABEL[c] ?? CATEGORY_LABEL.other)[lang];
  return <LangContext.Provider value={{ lang, setLang, t, cat }}>{children}</LangContext.Provider>;
}

export const useLang = () => useContext(LangContext);
