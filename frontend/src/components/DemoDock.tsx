import { ArrowsClockwise, CaretUp, FastForward, MaskHappy } from "@phosphor-icons/react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { api, tokenKey, type Portal } from "../lib/api";
import { useMotionT } from "../lib/motion";

type Persona = { key: string; name: string; role: string; path: string; blurb: string };

const portalOf = (role: string): Portal => (role === "doctor" ? "doctor" : role === "management" ? "admin" : "patient");
const GROUPS: { label: string; roles: string[] }[] = [
  { label: "Patient and family", roles: ["patient", "manager", "family"] },
  { label: "Hospital staff", roles: ["doctor", "management"] },
];

/** Signs in as a persona and opens that app. Each app keeps its own sign in, so the others stay signed in. */
export async function openAs(p: Persona, path = p.path) {
  const out = await api.demoLogin(p.key);
  localStorage.setItem(tokenKey(portalOf(p.role)), out.token);
  localStorage.setItem("cb_lang", out.user.language);
  window.location.href = path;
}

/** Floating switcher. It exists only when the server runs in demo mode. */
export function DemoDock() {
  const mt = useMotionT();
  const [on, setOn] = useState(false);
  const [open, setOpen] = useState(false);
  const [list, setList] = useState<Persona[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [today, setToday] = useState<string | null>(null);

  useEffect(() => {
    api.meta().then((m) => {
      if (!m.demo) return;
      setOn(true);
      api.personas().then(setList);
      api.clock().then((c) => setToday(c.today)).catch(() => undefined);
    }).catch(() => undefined);
  }, []);
  if (!on || window.location.pathname.startsWith("/demo")) return null;

  const run = async (label: string, fn: () => Promise<unknown>) => {
    setBusy(label);
    try {
      await fn();
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="no-print fixed bottom-4 right-4 z-40 flex flex-col items-end text-ink">
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 10, clipPath: "inset(100% 0 0 0)" }}
            animate={{ opacity: 1, y: 0, clipPath: "inset(0% 0 0 0)" }}
            exit={{ opacity: 0, y: 6 }}
            transition={mt(0.28)}
            className="mb-2 w-[min(22rem,calc(100vw-2rem))] rounded-md border border-ink bg-surface p-3"
          >
            {GROUPS.map((g) => (
              <div key={g.label} className="mb-2">
                <p className="mb-1 text-xs font-semibold text-muted">{g.label}</p>
                <ul className="space-y-0.5">
                  {list.filter((p) => g.roles.includes(p.role)).map((p) => (
                    <li key={p.key}>
                      <button disabled={!!busy} onClick={() => run(p.key, () => openAs(p))} className="tab-press group flex w-full items-center justify-between gap-3 rounded-sm px-2 py-1.5 text-left hover:bg-line">
                        <span className="min-w-0"><span className="block truncate font-semibold">{p.name}</span><span className="block truncate text-xs text-muted">{p.blurb}</span></span>
                        <span className="shrink-0 text-xs font-semibold text-primary">{busy === p.key ? "..." : "Open"}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
            <div className="flex flex-wrap gap-2 border-t border-line pt-2">
              <button className="btn btn-quiet btn-sm" disabled={!!busy} onClick={() => run("clock", async () => { const c = await api.moveClock({ days: 3 }); setToday(c.today); window.dispatchEvent(new Event("cb-plan-refresh")); })}>
                <FastForward size={16} weight="duotone" aria-hidden /> +3 days{today ? ` (${today.slice(5)})` : ""}
              </button>
              <button className="btn btn-quiet btn-sm" disabled={!!busy} onClick={() => run("reset", async () => { await api.demoReset(); window.location.href = "/demo"; })}>
                <ArrowsClockwise size={16} weight="duotone" aria-hidden /> Reset
              </button>
              <a className="btn btn-quiet btn-sm" href="/demo">Guide</a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <button className="btn btn-sm !bg-ink !text-surface" aria-expanded={open} onClick={() => setOpen(!open)}>
        <MaskHappy size={18} weight="duotone" aria-hidden /> Demo
        <motion.span animate={{ rotate: open ? 180 : 0 }} transition={mt(0.2)} className="inline-flex"><CaretUp size={14} aria-hidden /></motion.span>
      </button>
    </div>
  );
}
