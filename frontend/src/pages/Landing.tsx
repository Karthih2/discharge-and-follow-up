import { ArrowRight, CalendarCheck, ChatCircleDots, Eye, FirstAidKit, Globe, Heart, Pill, Prohibit, ShieldCheck, Translate, UsersFour } from "@phosphor-icons/react";
import { m as motion, useInView, useMotionValue, useReducedMotion, useScroll, useSpring, useTransform } from "motion/react";
import { Link } from "react-router-dom";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { HeroScene } from "../components/HeroScene";
import { LinkButton } from "../components/ui";
import { HOME, useAuth } from "../lib/auth";
import { useLang } from "../lib/lang";
import { useMotionT } from "../lib/motion";
import { Logo } from "../components/Icons";

const NEVER = ["never1", "never2", "never3", "never4"] as const;

/* ─── Floating particles (subtle, CSS-only) ─── */
function FloatingParticles() {
  const still = useReducedMotion();
  if (still) return null;
  return (
    <div className="particles-field" aria-hidden>
      {Array.from({ length: 6 }, (_, i) => (
        <div key={i} className="particle" style={{ "--i": i } as React.CSSProperties} />
      ))}
    </div>
  );
}

/* ─── Orbiting Circles (inspired by ReactBits Circles) ─── */
function OrbitRing({ radius, duration, items, reverse }: { radius: number; duration: number; items: ReactNode[]; reverse?: boolean }) {
  const still = useReducedMotion();
  const dir = reverse ? "reverse" : "normal";
  const counterDir = reverse ? "normal" : "reverse";
  return (
    <div className="orbit-ring" style={{ width: radius * 2, height: radius * 2, animationDuration: still ? "0s" : `${duration}s`, animationDirection: dir }} aria-hidden>
      <svg className="orbit-path" viewBox={`0 0 ${radius * 2} ${radius * 2}`}>
        <circle cx={radius} cy={radius} r={radius - 1} fill="none" stroke="var(--secondary)" strokeWidth="0.5" opacity="0.2" strokeDasharray="4 8" />
      </svg>
      {items.map((item, i) => {
        const angle = (360 / items.length) * i;
        return (
          <div key={i} className="orbit-item" style={{ "--item-angle": `${angle}deg`, "--orbit-r": `${radius}px`, animationDuration: still ? "0s" : `${duration}s`, animationDirection: counterDir } as React.CSSProperties}>
            {item}
          </div>
        );
      })}
    </div>
  );
}

function OrbitIcon({ icon: Icon, label }: { icon: React.ElementType; label: string }) {
  return (
    <div className="orbit-icon-chip">
      <Icon size={18} weight="duotone" />
      <span>{label}</span>
    </div>
  );
}

/* ─── Animated counter ─── */
function Counter({ value, suffix = "" }: { value: number; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  const [display, setDisplay] = useState(0);
  const still = useReducedMotion();

  useEffect(() => {
    if (!inView) return;
    if (still) { setDisplay(value); return; }
    let frame: number;
    const duration = 1200;
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min((now - start) / duration, 1);
      const ease = 1 - Math.pow(1 - p, 3);
      setDisplay(Math.round(ease * value));
      if (p < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [inView, value, still]);

  return <span ref={ref}>{display}{suffix}</span>;
}

/* ─── Bento Feature Card ─── */
function BentoCard({ icon: Icon, title, desc, index, span }: { icon: React.ElementType; title: string; desc: string; index: number; span?: string }) {
  const mt = useMotionT();
  return (
    <motion.div
      initial={{ opacity: 0, y: 40, scale: 0.95 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={mt(0.45, index * 0.08)}
      className={`bento-card group ${span ?? ""}`}
    >
      <div className="bento-icon">
        <Icon size={26} weight="duotone" />
      </div>
      <h3>{title}</h3>
      <p>{desc}</p>
      <div className="bento-glow" aria-hidden />
    </motion.div>
  );
}

/* ─── Step card with stagger ─── */
function StepCard({ icon: Icon, num, title, desc, extra, index }: { icon: React.ElementType; num: number; title: string; desc: string; extra: string; index: number }) {
  const mt = useMotionT();
  return (
    <motion.div
      initial={{ opacity: 0, y: 50 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={mt(0.5, index * 0.12)}
      className="step-card-v2"
    >
      <div className="step-num-v2">{num}</div>
      <div className="step-body-v2">
        <div className="flex items-center gap-3">
          <div className="step-icon-v2"><Icon size={20} weight="duotone" /></div>
          <h3 className="text-xl">{title}</h3>
        </div>
        <p className="mt-2 text-muted">{desc}</p>
        <p className="mt-2 text-sm opacity-60">{extra}</p>
      </div>
    </motion.div>
  );
}

/* ─── Parallax section wrapper ─── */
function Parallax({ children, className = "", speed = 0.15 }: { children: ReactNode; className?: string; speed?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], [30 * speed, -30 * speed]);
  return (
    <motion.div ref={ref} style={{ y }} className={className}>
      {children}
    </motion.div>
  );
}

/* ─── Who card with hover tilt ─── */
function WhoCard({ role, desc, color, index }: { role: string; desc: string; color: string; index: number }) {
  const mt = useMotionT();
  const still = useReducedMotion();
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 200, damping: 20 });
  const sy = useSpring(y, { stiffness: 200, damping: 20 });
  const rotX = useTransform(sy, [-0.5, 0.5], [6, -6]);
  const rotY = useTransform(sx, [-0.5, 0.5], [-6, 6]);

  const move = (e: React.PointerEvent<HTMLDivElement>) => {
    if (still) return;
    const r = e.currentTarget.getBoundingClientRect();
    x.set((e.clientX - r.left) / r.width - 0.5);
    y.set((e.clientY - r.top) / r.height - 0.5);
  };
  const leave = () => { x.set(0); y.set(0); };

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={mt(0.4, index * 0.1)}
      className="who-card-v2"
      style={{ perspective: 600, rotateX: still ? 0 : rotX, rotateY: still ? 0 : rotY }}
      onPointerMove={move}
      onPointerLeave={leave}
    >
      <div className="who-stripe" style={{ background: color }} />
      <h3 className="text-xl">{role}</h3>
      <p className="mt-2 text-muted">{desc}</p>
    </motion.div>
  );
}

export default function Landing() {
  const { user } = useAuth();
  const { t } = useLang();
  const mt = useMotionT();
  const home = user ? HOME[user.role] : null;

  return (
    <div className="-mx-5 -mt-8 md:-mx-10">

      {/* ═══════════════ HERO ═══════════════ */}
      <section className="hero-dark relative min-h-[92vh] overflow-hidden px-5 pb-24 pt-20 md:px-10 md:pb-32 md:pt-28">
        <FloatingParticles />
        <div className="orbit-container" aria-hidden>
          <OrbitRing radius={220} duration={45} items={[
            <OrbitIcon icon={Translate} label="Tamil" />,
            <OrbitIcon icon={Globe} label="Hindi" />,
            <OrbitIcon icon={Translate} label="Kannada" />,
            <OrbitIcon icon={Globe} label="Telugu" />,
          ]} />
          <OrbitRing radius={320} duration={70} reverse items={[
            <OrbitIcon icon={Pill} label="Medicines" />,
            <OrbitIcon icon={CalendarCheck} label="Visits" />,
            <OrbitIcon icon={ShieldCheck} label="Verified" />,
            <OrbitIcon icon={FirstAidKit} label="Tests" />,
            <OrbitIcon icon={Heart} label="Warnings" />,
          ]} />
        </div>

        <div className="relative z-10 mx-auto grid max-w-[1480px] items-center gap-10 md:grid-cols-[1.15fr_0.85fr]">
          <div className="space-y-8">
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={mt(0.2)} className="hero-tag">
              <Logo size={18} /> CareBridge
            </motion.div>

            <motion.h1 initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={mt(0.5, 0.06)} className="hero-title">
              {t("landingTitle")}
            </motion.h1>

            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={mt(0.3, 0.2)} className="measure text-lg hero-sub md:text-xl">
              {t("landingText")}
            </motion.p>

            <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={mt(0.3, 0.32)} className="flex flex-wrap gap-3 pt-2">
              {home
                ? <LinkButton to={home} className="btn-hero-primary">{t("goMyPlans")} <ArrowRight size={18} /></LinkButton>
                : <>
                    <LinkButton to="/register" className="btn-hero-primary">{t("createAccount")} <ArrowRight size={18} /></LinkButton>
                    <LinkButton to="/login" className="btn btn-ghost-dark">{t("signIn")}</LinkButton>
                  </>}
            </motion.div>
          </div>

          <motion.div initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 1, delay: 0.12, ease: [0.16, 1, 0.3, 1] }}>
            <HeroScene />
          </motion.div>
        </div>

        <svg className="hero-wave" viewBox="0 0 1440 80" preserveAspectRatio="none" aria-hidden>
          <path d="M0 40 C360 80 1080 0 1440 40 L1440 80 L0 80Z" fill="var(--bg)" />
        </svg>
      </section>

      {/* ═══════════════ TRUST STRIP — animated counters ═══════════════ */}
      <section className="trust-strip-v2" aria-label="Trust indicators">
        <div className="mx-auto flex max-w-[1480px] flex-wrap items-center justify-center gap-x-12 gap-y-6 px-5">
          <TrustItem value={6} label="Languages supported" />
          <span className="trust-divider" aria-hidden />
          <TrustItem value={100} suffix="%" label="Doctor-verified plans" />
          <span className="trust-divider" aria-hidden />
          <TrustItem value={0} label="Medical advice given" />
          <span className="trust-divider" aria-hidden />
          <TrustItem value={24} suffix="/7" label="Family access" />
        </div>
      </section>

      {/* ═══════════════ WHAT IS CAREBRIDGE ═══════════════ */}
      <section className="section-pad">
        <div className="mx-auto max-w-[1480px]">
          <Parallax className="mx-auto max-w-3xl text-center">
            <motion.p initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={mt(0.3)} className="section-tag">What is CareBridge</motion.p>
            <motion.h2
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={mt(0.5, 0.05)}
              className="text-3xl md:text-[2.6rem] md:leading-[1.1]"
            >
              Hospital discharge papers are hard to follow. We turn them into a daily plan your family can actually use.
            </motion.h2>
            <motion.p
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={mt(0.3, 0.15)}
              className="mt-5 text-lg text-muted"
            >
              Paste or upload the discharge summary. CareBridge extracts every medicine, appointment, test and warning sign, translates it into your language, and puts it on a calendar with reminders. Nothing is invented. Everything links back to the original line the doctor wrote.
            </motion.p>
          </Parallax>
        </div>
      </section>

      {/* ═══════════════ FEATURES — Bento grid ═══════════════ */}
      <section className="features-section-v2 section-pad" id="features">
        <div className="mx-auto max-w-[1480px]">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={mt(0.4)}
            className="mb-14 max-w-2xl"
          >
            <p className="section-tag">Features</p>
            <h2 className="text-3xl md:text-4xl">Everything from one discharge summary</h2>
          </motion.div>

          <div className="bento-grid">
            <BentoCard icon={Translate} index={0} span="bento-wide"
              title="Six languages"
              desc="Tamil, Hindi, Kannada, Telugu, Malayalam and English. Each family member reads the plan in their own language." />
            <BentoCard icon={Pill} index={1}
              title="Medicine schedule"
              desc="Exact drug names, doses, timing and food rules. Morning, afternoon and night slots." />
            <BentoCard icon={CalendarCheck} index={2}
              title="Appointment calendar"
              desc="Every follow-up visit, blood test and check-up on a dated calendar." />
            <BentoCard icon={ShieldCheck} index={3}
              title="Doctor verification"
              desc="Unclear instructions stay locked until a hospital doctor reviews and confirms them." />
            <BentoCard icon={UsersFour} index={4}
              title="Family sharing"
              desc="Share with family. They see only what you allow — full plan, medicines, or appointments." />
            <BentoCard icon={ChatCircleDots} index={5} span="bento-wide"
              title="Source tracing"
              desc="Every extracted item links back to the exact line in the discharge summary. Tap any medicine or appointment to see the original text." />
          </div>
        </div>
      </section>

      {/* ═══════════════ HOW IT WORKS — stacked steps ═══════════════ */}
      <section className="section-pad" id="how">
        <div className="mx-auto max-w-[1480px]">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={mt(0.4)}
            className="mb-14 max-w-2xl"
          >
            <p className="section-tag">How it works</p>
            <h2 className="text-3xl md:text-4xl">Four steps. Discharge to daily plan.</h2>
          </motion.div>

          <div className="steps-v2">
            {[
              { icon: Eye, num: 1, title: t("step1T"), desc: t("step1D"), extra: "Supports PDF upload, copy-paste, and photo scan. Personal data is automatically masked before processing." },
              { icon: Translate, num: 2, title: t("step2T"), desc: t("step2D"), extra: "AI identifies medicines, appointments, tests, warning signs and lifestyle instructions. Each one links to its source line." },
              { icon: ShieldCheck, num: 3, title: t("step3T"), desc: t("step3D"), extra: "Ambiguous items are flagged and locked. A hospital doctor reviews them before the patient sees them." },
              { icon: Globe, num: 4, title: t("step4T"), desc: t("step4D"), extra: "Calendar view, medicine timeline, fridge sheet for printing, and push reminders. Family gets a read-only link." },
            ].map((s, i) => (
              <StepCard key={s.num} {...s} index={i} />
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════ WHO IT'S FOR — tilt cards ═══════════════ */}
      <section className="who-section-v2 section-pad">
        <div className="mx-auto max-w-[1480px]">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={mt(0.3)}
            className="mb-14 text-center"
          >
            <p className="section-tag">Who it's for</p>
            <h2 className="text-3xl md:text-4xl">One platform, four roles</h2>
          </motion.div>

          <div className="who-grid-v2">
            <WhoCard role="Patient" desc="Upload your discharge summary. Get a personal plan with medicines, appointments and reminders in your language." color="var(--primary)" index={0} />
            <WhoCard role="Family" desc="View your loved one's plan. See only what they share. No app needed." color="var(--secondary)" index={1} />
            <WhoCard role="Doctor" desc="Review flagged items in a queue. Confirm, correct or clarify before the patient sees them." color="#4B9B6E" index={2} />
            <WhoCard role="Management" desc="Hospital-wide stats. Track plans created, reviewed and shared. Monitor doctor workload." color="#2E7D5C" index={3} />
          </div>
        </div>
      </section>

      {/* ═══════════════ SAFETY ═══════════════ */}
      <section className="section-pad" id="safety">
        <div className="mx-auto max-w-[1480px]">
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.97 }}
            whileInView={{ opacity: 1, y: 0, scale: 1 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={mt(0.5)}
            className="safety-card-v2"
          >
            <div className="safety-card-inner">
              <div>
                <p className="section-tag">Safety promise</p>
                <h2 className="safety-heading text-3xl md:text-4xl">{t("itNeverWill")}</h2>
                <p className="mt-4 text-muted measure">
                  CareBridge organizes and explains what your doctor already wrote. It never adds, changes, or invents medical information.
                </p>
              </div>
              <ul className="safety-list-v2">
                {NEVER.map((key, i) => (
                  <motion.li
                    key={key}
                    initial={{ opacity: 0, x: -16 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={mt(0.25, 0.15 + i * 0.08)}
                    className="safety-item-v2"
                  >
                    <Prohibit size={22} weight="duotone" className="mt-0.5 shrink-0 text-attention" aria-hidden />
                    <span>{t(key)}</span>
                  </motion.li>
                ))}
              </ul>
            </div>
            <p className="mt-6 text-sm text-muted">
              <Link to="/safety" className="underline">{t("safetyLimits")}</Link>
            </p>
          </motion.div>
        </div>
      </section>

      {/* ═══════════════ CTA ═══════════════ */}
      <section className="cta-section-v2" aria-label="Get started">
        <div className="mx-auto max-w-3xl px-5 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={mt(0.45)}
            className="space-y-7"
          >
            <h2 className="cta-title-v2">Ready to turn your discharge summary into a plan?</h2>
            <p className="mx-auto max-w-xl text-lg hero-sub">
              Create an account. Paste your discharge summary, get a dated calendar, medicine times and reminders — all in six languages.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
              {home
                ? <LinkButton to={home} className="btn-hero-primary">{t("goMyPlans")} <ArrowRight size={18} /></LinkButton>
                : <>
                    <LinkButton to="/register" className="btn-hero-primary">{t("createAccount")} <ArrowRight size={18} /></LinkButton>
                    <LinkButton to="/login" className="btn btn-ghost-dark">{t("signIn")}</LinkButton>
                  </>}
            </div>
            {!home && (
              <p className="text-sm hero-sub opacity-75">
                Doctor? <a href="/doctor/login" className="underline">Sign in here</a> · Management? <a href="/management/login" className="underline">Sign in here</a>
              </p>
            )}
          </motion.div>
        </div>
      </section>
    </div>
  );
}

function TrustItem({ value, suffix = "", label }: { value: number; suffix?: string; label: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="text-center"
    >
      <span className="trust-value"><Counter value={value} suffix={suffix} /></span>
      <span className="trust-label">{label}</span>
    </motion.div>
  );
}
