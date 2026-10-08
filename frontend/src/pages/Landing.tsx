import { Certificate, ClipboardText, Prohibit, ShieldCheck, Stethoscope, Translate, UsersThree } from "@phosphor-icons/react";
import { AnimatePresence, motion, useScroll, useSpring, useTransform } from "motion/react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { EcgLine, HeroArt, StepArt } from "../components/Illustrations";
import { PlanView } from "../components/PlanView";
import { useAuth } from "../lib/auth";
import { DEMO_PLAN } from "../lib/demoPlan";
import { useMotionT } from "../lib/motion";

const HEADLINE = "Leaving hospital comes with a lot of instructions. We turn them into a plan your family can follow.";

const STEPS = [
  { t: "Add the discharge summary", d: "Paste the text or upload a PDF. Names, phone numbers, Aadhaar, PAN and emails are masked before anything is saved.", chip: "Privacy check first" },
  { t: "We find every instruction", d: "Medicines, visits, tests, referrals, care at home and warning signs. Each one points to the exact line it came from, and a check confirms the quote is really there.", chip: "Source line on every item" },
  { t: "Anything unclear goes to a doctor", d: "Missing doses, vague words, medicine changes and symptoms are held. You see an orange locked card until a hospital doctor confirms or corrects it.", chip: "Needs Review stays locked" },
  { t: "You get a plan in your language", d: "English, Tamil, Hindi, Telugu, Kannada or Malayalam. Medicines use a fixed card, never free rewriting. Listen to any approved item read aloud.", chip: "Six languages" },
  { t: "Family can help, only if you allow it", d: "You choose what each person sees. A hub manager can tick off tasks and gets an alert when something is late. Every view is logged.", chip: "You control sharing" },
];

const SAFETY_NEVER = ["Diagnose a condition", "Change or suggest changing a medicine", "Recommend a treatment", "Promise that a provider is available"];
const SAFETY_HOW = [
  { Icon: ClipboardText, t: "Every item shows its source line", d: "One tap shows the exact words from your summary." },
  { Icon: ShieldCheck, t: "Numbers are checked after translation", d: "A dose or a date can never change between languages." },
  { Icon: Stethoscope, t: "Doctors resolve what is unclear", d: "Only a hospital doctor can unlock a held item. Not the family, not the AI." },
  { Icon: Certificate, t: "Run by Code2Care Hospital", d: "Its management team adds and assigns the doctors." },
];
const FAQ = [
  ["Is this real medical advice?", "No. CareBridge organizes and explains what your doctor already wrote. It never diagnoses, changes medicines or recommends treatment."],
  ["Who can see my plan?", "Only you, until you allow someone. You can share the full plan, appointments only, or reminders only with each family member, and take it back at any time."],
  ["What happens to unclear instructions?", "They are locked and sent to a hospital doctor. Until the doctor confirms them, you see the reason in plain words and nothing is guessed."],
  ["Who are the doctors?", "Doctors at Code2Care Hospital. The hospital's management team creates their accounts and assigns the reviews. If one is unavailable, the item moves to a backup."],
  ["Can I use it in my own language?", "Yes. Pick English, Tamil, Hindi, Telugu, Kannada or Malayalam. Every approved item can also be read aloud."],
  ["Is my real data safe to enter?", "This is a demo. Use invented summaries only. A privacy guard masks Aadhaar, phone numbers, emails and PAN before anything is stored."],
];
const WHO = [
  { Icon: Translate, t: "Patients", p: "You or someone you trust adds the summary. You get a timeline, a card for each medicine, reminders and a one page fridge sheet.", list: ["Choose your language and large text.", "Tick tasks, listen to any approved item, ask for a callback.", "Flag anything that looks wrong and a doctor checks it.", "See who viewed your plan and when."], cta: "Create a patient account", solid: true },
  { Icon: UsersThree, t: "Family hubs", p: "One hub holds many people, each with a separate plan. The hub manager helps, and the patient decides what is shared.", list: ["Managers get alerts when a task is missed.", "Family viewers see only what the patient allows.", "Held items show as waiting for doctor review, without details.", "Nobody in the family can edit instructions."], cta: "Create a hub account", solid: false },
];

function Section({ id, title, intro, children }: { id: string; title: string; intro?: string; children: ReactNode }) {
  const mt = useMotionT();
  return (
    <motion.section id={id} aria-labelledby={`${id}-h`} initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-80px" }} transition={mt(0.5)} className="space-y-9">
      <div className="max-w-2xl">
        <h2 id={`${id}-h`} className="text-4xl md:text-5xl" style={{ letterSpacing: "-0.02em" }}>{title}</h2>
        {intro && <p className="mt-3 text-lg text-muted">{intro}</p>}
      </div>
      {children}
    </motion.section>
  );
}

function Process() {
  const mt = useMotionT();
  const ref = useRef<HTMLOListElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 80%", "end 60%"] });
  const grow = useSpring(scrollYProgress, { stiffness: 120, damping: 30 });
  return (
    <ol ref={ref} className="relative space-y-12">
      <span className="absolute bottom-6 left-[33px] top-6 w-0.5 bg-line md:left-[41px]" aria-hidden />
      <motion.span className="absolute left-[33px] top-6 w-0.5 origin-top bg-primary md:left-[41px]" style={{ scaleY: grow, bottom: 24 }} aria-hidden />
      {STEPS.map((s, i) => (
        <motion.li key={s.t} initial={{ opacity: 0, x: -18 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true, margin: "-70px" }} transition={mt(0.45)} className="relative flex gap-4 md:gap-8">
          <div className="relative z-10 flex h-[68px] w-[68px] shrink-0 items-center justify-center rounded-full border-2 border-primary bg-bg md:h-[84px] md:w-[84px]">
            <StepArt n={i + 1} size={46} />
            <span className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-primary font-heading text-sm text-surface">{i + 1}</span>
          </div>
          <div className="min-w-0 pt-1">
            <h3 className="text-2xl md:text-3xl">{s.t}</h3>
            <p className="measure mt-1 text-muted">{s.d}</p>
            <span className="mt-2 inline-block rounded-sm border border-line bg-surface px-2 py-0.5 text-sm text-primary">{s.chip}</span>
          </div>
        </motion.li>
      ))}
    </ol>
  );
}

function Faq() {
  const [open, setOpen] = useState<number | null>(0);
  const mt = useMotionT();
  return (
    <div className="rule-list border-y border-line">
      {FAQ.map(([q, a], i) => (
        <div key={q}>
          <button className="tab-press flex w-full items-center justify-between gap-4 py-5 text-left font-heading text-xl hover:text-primary md:text-2xl" aria-expanded={open === i} onClick={() => setOpen(open === i ? null : i)}>
            {q}
            <motion.span animate={{ rotate: open === i ? 45 : 0 }} transition={mt(0.2)} className="shrink-0 font-body text-3xl text-primary" aria-hidden>+</motion.span>
          </button>
          <AnimatePresence initial={false}>
            {open === i && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={mt(0.28)} className="overflow-hidden">
                <p className="measure pb-5 text-muted">{a}</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ))}
    </div>
  );
}

export default function Landing() {
  const { user } = useAuth();
  const mt = useMotionT();
  const { hash } = useLocation();
  const { scrollY } = useScroll();
  const artY = useTransform(scrollY, [0, 600], [0, -50]);
  useEffect(() => {
    if (hash) setTimeout(() => document.getElementById(hash.slice(1))?.scrollIntoView({ behavior: "smooth" }), 80);
  }, [hash]);
  const home = user ? (user.role === "patient" ? "/patient" : "/family") : null;

  return (
    <div className="space-y-28 md:space-y-40">
      {/* Hero */}
      <section className="grid items-center gap-10 pt-4 md:grid-cols-[1.2fr_0.8fr] md:pt-6">
        <div className="space-y-7">
          <h1 className="display" aria-label={HEADLINE}>
            {HEADLINE.split(" ").map((w, i) => (
              <span key={i} className="word" aria-hidden>
                <motion.span className="inline-block" initial={{ y: "105%" }} animate={{ y: 0 }} transition={{ ...mt(0.7, 0.05 * i), ease: [0.16, 1, 0.3, 1] }}>
                  {w}&nbsp;
                </motion.span>
              </span>
            ))}
          </h1>
          <motion.p initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={mt(0.6, 0.9)} className="measure text-lg text-muted">
            Add your discharge summary. Get dated tasks, medicine times, reminders and warning signs in six languages. Anything unclear is held for a hospital doctor to confirm.
          </motion.p>
          <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={mt(0.6, 1.05)} className="flex flex-wrap items-center gap-3">
            {home ? (
              <Link to={home} className="btn px-6 py-3 text-lg">Go to my plans</Link>
            ) : (
              <>
                <Link to="/register" className="btn px-6 py-3 text-lg">Create an account</Link>
                <Link to="/login" className="btn btn-quiet px-6 py-3 text-lg">Sign in</Link>
              </>
            )}
            <a href="#process" className="px-2 py-3 font-semibold">See how it works</a>
          </motion.div>
          <EcgLine width={300} />
        </div>
        <motion.div style={{ y: artY }}>
          <HeroArt />
        </motion.div>
      </section>

      {/* Languages */}
      <div aria-label="Available in English, Tamil, Hindi, Telugu, Kannada and Malayalam" className="-mx-5 overflow-hidden border-y border-line bg-surface py-6">
        <div className="marquee font-heading text-3xl text-primary md:text-4xl" aria-hidden>
          {[0, 1].map((k) => (
            <div key={k} className="flex shrink-0 items-center gap-12 pr-12">
              <span>English</span>
              <span style={{ fontFamily: "Noto Sans Tamil" }}>தமிழ்</span>
              <span style={{ fontFamily: "Noto Sans Devanagari" }}>हिन्दी</span>
              <span style={{ fontFamily: "Noto Sans Telugu" }}>తెలుగు</span>
              <span style={{ fontFamily: "Noto Sans Kannada" }}>ಕನ್ನಡ</span>
              <span style={{ fontFamily: "Noto Sans Malayalam" }}>മലയാളം</span>
            </div>
          ))}
        </div>
      </div>

      <Section id="process" title="How it works" intro="Five steps from a stack of papers to a plan you can follow.">
        <Process />
      </Section>

      <Section id="people" title="Who it is for" intro="Two ways in. Both start with an account.">
        <div className="grid gap-12 md:grid-cols-2 md:gap-0">
          {WHO.map(({ Icon, t, p, list, cta, solid }, i) => (
            <div key={t} className={`space-y-4 ${i === 0 ? "md:border-r md:border-line md:pr-12" : "md:pl-12"}`}>
              <Icon size={40} weight="duotone" className="text-primary" aria-hidden />
              <h3 className="text-3xl">{t}</h3>
              <p className="measure text-muted">{p}</p>
              <ul className="rule-list">
                {list.map((x) => <li key={x} className="py-2">{x}</li>)}
              </ul>
              <Link to="/register" className={`btn ${solid ? "" : "btn-quiet"}`}>{cta}</Link>
            </div>
          ))}
        </div>
        <figure className="relative overflow-hidden rounded-md border border-line">
          <img src="/hero.jpeg" alt="A younger woman helps an older woman read her follow-up plan on a phone" className="h-72 w-full object-cover md:h-96" style={{ objectPosition: "50% 28%" }} />
          <figcaption className="absolute inset-x-0 bottom-0 bg-ink p-3 text-sm text-surface">Plans are built to be read together.</figcaption>
        </figure>
      </Section>

      <Section id="preview" title="What a plan looks like" intro="This is the real plan screen with sample data. Switch the display and open a card.">
        <div className="rounded-md border border-line bg-bg p-4 md:p-8">
          <PlanView plan={DEMO_PLAN} preview />
        </div>
      </Section>

      <Section id="safety" title="Safety by design" intro="The system organizes and explains. These are the lines it does not cross.">
        <div className="grid gap-12 md:grid-cols-[0.85fr_1.15fr] md:gap-16">
          <div>
            <h3 className="mb-3 text-2xl text-attention">It never will</h3>
            <ul className="rule-list border-y border-line">
              {SAFETY_NEVER.map((x) => (
                <li key={x} className="flex items-center gap-3 py-3 text-lg"><Prohibit size={26} weight="duotone" className="shrink-0 text-attention" aria-hidden /> {x}</li>
              ))}
            </ul>
          </div>
          <ul className="rule-list border-y border-line">
            {SAFETY_HOW.map(({ Icon, t, d }, i) => (
              <motion.li key={t} initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={mt(0.35, i * 0.07)} className="flex gap-4 py-4">
                <Icon size={32} weight="duotone" className="mt-1 shrink-0 text-primary" aria-hidden />
                <div><h3 className="text-xl">{t}</h3><p className="text-muted">{d}</p></div>
              </motion.li>
            ))}
          </ul>
        </div>
      </Section>

      <Section id="faq" title="Questions">
        <Faq />
      </Section>

      <motion.section initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={mt(0.5)} className="rounded-md bg-primary p-8 text-surface md:p-14">
        <h2 className="display max-w-3xl" style={{ fontSize: "clamp(2rem, 4.6vw, 3.4rem)" }}>Turn your discharge papers into a plan.</h2>
        <p className="mt-3 max-w-xl text-lg" style={{ color: "rgba(246,252,250,0.9)" }}>It takes a minute to start. You stay in control of who sees it.</p>
        <div className="mt-7 flex flex-wrap gap-3">
          <Link to={home ?? "/register"} className="btn btn-on-primary px-6 py-3 text-lg">{home ? "Go to my plans" : "Create an account"}</Link>
          {!home && <Link to="/login" className="btn btn-ghost-dark px-6 py-3 text-lg">Sign in</Link>}
        </div>
      </motion.section>
    </div>
  );
}
