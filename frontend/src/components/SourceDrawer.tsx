import { X } from "@phosphor-icons/react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef } from "react";
import { api } from "../lib/api";
import { useLoad, useMotionT } from "../lib/motion";
import { Skeleton } from "./Skeleton";

interface Props {
  docId: number | null;
  cited: number[];
  title: string;
  onClose: () => void;
}

/** Shows the original summary with the cited lines highlighted and scrolled into view. */
export function SourceDrawer({ docId, cited, title, onClose }: Props) {
  const mt = useMotionT();
  const { data, error } = useLoad(() => (docId ? api.source(docId) : Promise.resolve([])), [docId]);
  const first = useRef<HTMLLIElement | null>(null);

  useEffect(() => {
    if (data && first.current) first.current.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [data, cited]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <AnimatePresence>
      {docId !== null && (
        <motion.aside
          key="drawer"
          role="dialog"
          aria-label="Original summary"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={mt(0.15)}
          className="no-print fixed inset-y-0 right-0 z-30 flex w-full max-w-lg flex-col border-l border-line bg-surface"
        >
          <header className="flex items-start justify-between gap-4 border-b border-line p-4">
            <div>
              <p className="text-sm text-muted">Original summary</p>
              <h2 className="text-xl">{title}</h2>
            </div>
            <button onClick={onClose} aria-label="Close" className="rounded-sm p-1 text-primary hover:bg-line">
              <X size={24} />
            </button>
          </header>
          <div className="flex-1 overflow-y-auto p-4">
            {error && <p className="text-attention">Could not load the summary.</p>}
            {!data && !error && (
              <div className="space-y-2">
                {Array.from({ length: 10 }).map((_, i) => (
                  <Skeleton key={i} className="h-5 w-full" />
                ))}
              </div>
            )}
            <ol className="font-mono text-[0.92rem] leading-relaxed">
              {data?.map((l) => {
                const on = cited.includes(l.line_no);
                const isFirst = on && l.line_no === Math.min(...cited);
                return (
                  <li
                    key={l.line_no + "-" + cited.join()}
                    ref={isFirst ? first : undefined}
                    className={`flex gap-3 rounded-sm px-2 py-0.5 ${on ? "src-line-flash border border-primary" : "border border-transparent"}`}
                    style={on ? { background: "rgba(94, 214, 195, 0.35)" } : undefined}
                  >
                    <span className="w-6 shrink-0 text-right text-muted">{l.line_no}</span>
                    <span>{l.text}</span>
                  </li>
                );
              })}
            </ol>
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
