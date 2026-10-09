import { AnimatePresence, m as motion } from "motion/react";
import { useState } from "react";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";
import { useLang } from "../lib/lang";
import { useMotionT } from "../lib/motion";
import { Button } from "./ui";

/** Three short steps on the first sign in. Skipping or finishing both mean it never shows again. */
export function Welcome() {
  const { user, update } = useAuth();
  const { t } = useLang();
  const mt = useMotionT();
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  if (!user || user.welcomed !== false) return null;

  const steps = [
    [t("welcome1Title"), t("welcome1Text")],
    [t("welcome2Title"), t("welcome2Text")],
    [t("welcome3Title"), t("welcome3Text")],
  ];
  const close = async () => {
    setBusy(true);
    try {
      update(await api.welcomed());
    } catch {
      update({ ...user, welcomed: true });
    }
  };
  const last = step === steps.length - 1;

  return (
    <div className="no-print fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(11, 46, 45, 0.55)" }} role="dialog" aria-modal="true" aria-labelledby="welcome-title">
      <div className="w-full max-w-md space-y-4 rounded-md border border-line bg-surface p-6">
        <p className="text-sm text-muted">{t("welcomeStep").replace("{n}", String(step + 1)).replace("{total}", String(steps.length))}</p>
        <AnimatePresence mode="wait" initial={false}>
          <motion.div key={step} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={mt(0.15)} className="min-h-[9rem] space-y-2">
            <h2 id="welcome-title" className="text-2xl">{steps[step][0]}</h2>
            <p className="text-muted">{steps[step][1]}</p>
          </motion.div>
        </AnimatePresence>
        <div className="flex items-center justify-between gap-3">
          <Button look="quiet" small onClick={close} disabled={busy}>{t("skip")}</Button>
          <Button onClick={() => (last ? close() : setStep(step + 1))} loading={busy}>{last ? t("getStarted") : t("next")}</Button>
        </div>
      </div>
    </div>
  );
}
