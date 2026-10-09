import { ArrowsClockwise, FastForward } from "@phosphor-icons/react";
import { m as motion } from "motion/react";
import { useEffect, useState } from "react";
import { Logo } from "../components/Icons";
import { openAs } from "../components/DemoDock";
import { Button, Skeleton } from "../components/ui";
import { api } from "../lib/api";
import { HOSPITAL_FULL, PRODUCT } from "../lib/brand";
import { useMotionT } from "../lib/motion";

type Persona = Awaited<ReturnType<typeof api.personas>>[number];

const RUN: { who: string; path?: string; title: string; what: string }[] = [
  { who: "admin", title: "See the hospital side", what: "The management console shows the review queue by reason code and age, with no clinical text." },
  { who: "ramesh", path: "/patient", title: "Open a patient's plan", what: "Switch Cards, Two panels and Timeline. Try Tamil, Show original, Listen and the provider map." },
  { who: "ramesh", path: "/patient", title: "Ask for a doctor", what: "Press Ask a doctor to check on any card. It locks and goes to a doctor. Request a callback too." },
  { who: "meera", title: "Resolve it as a doctor", what: "Oldest first, unclear words marked. Confirm one item, or fill in the missing dose of a medicine." },
  { who: "admin", title: "Handle fallback and callbacks", what: "Mark a doctor unavailable and watch items move to the backup. Start and complete the callback." },
  { who: "priya", path: "/family", title: "Compare family views", what: "Priya (manager) has the full plan. Then Arun: appointments only, with grey locked cards." },
  { who: "priya", path: "/family", title: "Miss a task on purpose", what: "Use Demo, then +3 days. Priya gets alerts and notifications for the tasks that were not done." },
];

export default function DemoPage() {
  const mt = useMotionT();
  const [list, setList] = useState<Persona[] | null>(null);
  const [off, setOff] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  useEffect(() => {
    api.personas().then(setList).catch(() => setOff(true));
  }, []);
  const find = (k: string) => list?.find((p) => p.key === k);
  const go = async (k: string, path?: string) => {
    const p = find(k);
    if (!p) return;
    setBusy(k + (path ?? ""));
    await openAs(p, path ?? p.path);
  };

  return (
    <div className="min-h-screen bg-bg">
      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-5 py-4">
          <a href="/" className="flex items-center gap-2 text-ink no-underline hover:no-underline"><Logo size={32} /><span className="font-heading text-xl">{PRODUCT} demo</span></a>
          <span className="text-sm text-muted">{HOSPITAL_FULL}. Invented people only.</span>
        </div>
      </header>
      <main className="mx-auto grid max-w-6xl gap-12 px-5 py-12 lg:grid-cols-[1.25fr_1fr]">
        <section aria-labelledby="run-h">
          <motion.h1 id="run-h" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={mt(0.5)} className="text-4xl md:text-5xl">Seven minutes, start to finish</motion.h1>
          <p className="mt-3 max-w-xl text-lg text-muted">One address, three apps. Each step signs you in as the right person and opens the right screen. The other apps stay signed in, so you can flip between tabs.</p>
          {off && <p role="alert" className="mt-6 rounded-sm border border-attention bg-attention-tint p-3 text-attention">Demo mode is off. Start the app with run_demo.bat.</p>}
          <ol className="mt-8 divide-y divide-line border-y border-line">
            {RUN.map((s, i) => (
              <motion.li key={i} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={mt(0.35, 0.1 + i * 0.05)} className="flex flex-wrap items-center gap-4 py-4">
                <span className="w-8 font-heading text-2xl text-primary">{i + 1}</span>
                <div className="min-w-0 flex-1">
                  <h2 className="text-xl">{s.title}</h2>
                  <p className="text-muted">{s.what}</p>
                </div>
                <Button small disabled={!list || !!busy} onClick={() => go(s.who, s.path)}>
                  {busy === s.who + (s.path ?? "") ? "Opening" : `Open as ${find(s.who)?.name.split(" (")[0].replace("Dr. ", "Dr ") ?? "..."}`}
                </Button>
              </motion.li>
            ))}
          </ol>
        </section>

        <aside aria-labelledby="who-h" className="space-y-8">
          <div>
            <h2 id="who-h" className="text-2xl">Open as anyone</h2>
            {!list && !off && <div className="mt-3 space-y-2">{[0, 1, 2, 3].map((k) => <Skeleton key={k} className="h-12 w-full" />)}</div>}
            <ul className="mt-3 divide-y divide-line border-y border-line">
              {list?.map((p) => (
                <li key={p.key}>
                  <button className="flex w-full items-center justify-between gap-3 py-3 text-left hover:bg-surface" onClick={() => go(p.key)} disabled={!!busy}>
                    <span className="min-w-0"><span className="block font-semibold">{p.name}</span><span className="block text-sm text-muted">{p.blurb}</span></span>
                    <span className="shrink-0 text-sm font-semibold text-primary">Open</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
          <div className="space-y-3">
            <h2 className="text-2xl">Controls</h2>
            <div className="flex flex-wrap gap-2">
              <Button look="quiet" onClick={async () => { const c = await api.moveClock({ days: 3 }); setNote(`Demo date is now ${c.today}. Open a hub manager to see the alerts.`); }}>
                <FastForward size={18} weight="duotone" aria-hidden /> Move clock +3 days
              </Button>
              <Button look="quiet" onClick={async () => { await api.demoReset(); setNote("Demo data reset."); }}>
                <ArrowsClockwise size={18} weight="duotone" aria-hidden /> Reset demo
              </Button>
            </div>
            {note && <p role="status" className="text-primary">{note}</p>}
            <p className="text-sm text-muted">The Demo button at the bottom right of every screen does the same, without leaving the page.</p>
          </div>
        </aside>
      </main>
    </div>
  );
}
