import { AnimatePresence, m as motion } from "motion/react";
import { useEffect, useState } from "react";
import { useMotionT } from "./motion";

// One short message at the bottom centre for each successful action. It goes after three seconds.
let push: (text: string) => void = () => undefined;
export const toast = (text: string) => push(text);

export function ToastHost() {
  const [list, setList] = useState<{ id: number; text: string }[]>([]);
  const mt = useMotionT();
  useEffect(() => {
    let n = 0;
    push = (text) => {
      const id = ++n;
      setList((l) => [...l.slice(-2), { id, text }]);
      window.setTimeout(() => setList((l) => l.filter((x) => x.id !== id)), 3000);
    };
    return () => {
      push = () => undefined;
    };
  }, []);
  return (
    <div className="no-print pointer-events-none fixed inset-x-0 bottom-5 z-50 flex flex-col items-center gap-2 px-4" role="status" aria-live="polite">
      <AnimatePresence>
        {list.map((t) => (
          <motion.p key={t.id} layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={mt(0.18)}
            className="rounded-sm border border-ink bg-ink px-4 py-2 text-surface">
            {t.text}
          </motion.p>
        ))}
      </AnimatePresence>
    </div>
  );
}
