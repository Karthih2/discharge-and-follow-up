import { ArrowRight, CalendarCheck, ChatCircleDots, Eye, FirstAidKit, Globe, Heart, Pill, Prohibit, ShieldCheck, Translate, UsersFour } from "@phosphor-icons/react";
import { m as motion, useInView, useReducedMotion, useScroll, useTransform } from "motion/react";
import { Link } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { HeroScene } from "../components/HeroScene";
import { LinkButton } from "../components/ui";
import { HOME, useAuth } from "../lib/auth";
import { useLang } from "../lib/lang";
import { useMotionT } from "../lib/motion";
import { Logo } from "../components/Icons";

function ScrollReveal({ children, className = "", direction = "up", delay = 0 }: { children: React.ReactNode; className?: string; direction?: "up" | "left" | "right"; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  const still = useReducedMotion();
  const xy = direction === "left" ? { x: -40, y: 0 } : direction === "right" ? { x: 40, y: 0 } : { x: 0, y: 32 };
  return (
    <motion.div
      ref={ref}
      initial={still ? false : { opacity: 0, ...xy }}
      animate={inView ? { opacity: 1, x: 0, y: 0 } : {}}
      transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1], delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

const NEVER = ["never1", "never2", "never3", "never4"] as const;

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

function FeatureCard({ icon: Icon, title, desc, index }: { icon: React.ElementType; title: string; desc: string; index: number }) {
  const mt = useMotionT();
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={mt(0.4, index * 0.08)}
      className="kv-feature-card"
    >
      <div className="kv-feature-icon">
        <Icon size={20} weight="duotone" />
      </div>
      <h3 className="mt-3 text-[1.05rem] font-semibold">{title}</h3>
      <p className="mt-1.5 text-sm text-muted leading-relaxed">{desc}</p>
    </motion.div>
  );
}

function StepCard({ icon: Icon, num, title, desc, extra, index }: { icon: React.ElementType; num: number; title: string; desc: string; extra: string; index: number }) {
  const mt = useMotionT();
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={mt(0.45, index * 0.1)}
      className="kv-step-card"
    >
      <div className="kv-step-num">{num}</div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2.5">
          <div className="kv-step-icon"><Icon size={18} weight="duotone" /></div>
          <h3 className="text-lg font-semibold">{title}</h3>
        </div>
        <p className="mt-2 text-muted text-[0.92rem] leading-relaxed">{desc}</p>
        <p className="mt-2 text-sm text-muted/60 leading-relaxed">{extra}</p>
      </div>
    </motion.div>
  );
}

function RoleCard({ role, desc, icon: Icon, index }: { role: string; desc: string; icon: React.ElementType; index: number }) {
  const mt = useMotionT();
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={mt(0.4, index * 0.08)}
      className="kv-role-card"
    >
      <div className="kv-role-icon">
        <Icon size={22} weight="duotone" />
      </div>
      <h3 className="mt-3 text-lg font-semibold">{role}</h3>
      <p className="mt-1.5 text-sm text-muted leading-relaxed">{desc}</p>
    </motion.div>
  );
}

export default function Landing() {
  const { user } = useAuth();
  const { t } = useLang();
  const mt = useMotionT();
  const home = user ? HOME[user.role] : null;
  const still = useReducedMotion();

  const heroRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const heroY = useTransform(scrollYProgress, [0, 1], [0, 120]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.8], [1, 0]);

  return (
    <div className="-mx-5 -mt-8 md:-mx-10">

      {/* ═══════════════ HERO ═══════════════ */}
      <section ref={heroRef} className="hero-dark relative overflow-hidden px-5 pb-20 pt-10 md:px-10 md:pb-28 md:pt-12">
        <motion.div style={still ? {} : { y: heroY, opacity: heroOpacity }} className="relative z-10 mx-auto grid max-w-[1480px] items-center gap-8 md:grid-cols-[1fr_1fr]">
          <div className="space-y-5">
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={mt(0.2)} className="hero-tag">
              <Logo size={18} /> CareBridge
            </motion.div>

            <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={mt(0.5, 0.06)} className="hero-title">
              {t("landingTitle")}
            </motion.h1>

            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={mt(0.3, 0.2)} className="measure text-lg hero-sub md:text-xl">
              {t("landingText")}
            </motion.p>

            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={mt(0.3, 0.32)} className="flex flex-wrap gap-3 pt-2">
              {home
                ? <LinkButton to={home} className="btn-hero-primary">{t("goMyPlans")} <ArrowRight size={18} /></LinkButton>
                : <>
                    <LinkButton to="/register" className="btn-hero-primary">{t("createAccount")} <ArrowRight size={18} /></LinkButton>
                    <LinkButton to="/login" className="btn btn-ghost-dark">{t("signIn")}</LinkButton>
                  </>}
            </motion.div>
          </div>

          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.8, delay: 0.15, ease: [0.25, 0.1, 0.25, 1] }}>
            <HeroScene />
          </motion.div>
        </motion.div>

        <svg className="hero-wave" viewBox="0 0 1440 120" preserveAspectRatio="none" aria-hidden>
          <path d="M0 60 C360 120 1080 0 1440 60 L1440 120 L0 120Z" fill="var(--bg)" />
        </svg>
      </section>

      {/* ═══════════════ TRUST STRIP ═══════════════ */}
      <section className="trust-strip-v2" aria-label="Trust indicators">
        <div className="mx-auto flex max-w-[1480px] flex-wrap items-center justify-center gap-x-12 gap-y-6 px-5">
          <TrustItem value={6} label="Languages supported" index={0} />
          <span className="trust-divider" aria-hidden />
          <TrustItem value={100} suffix="%" label="Doctor-verified plans" index={1} />
          <span className="trust-divider" aria-hidden />
          <TrustItem value={0} label="Medical advice given" index={2} />
          <span className="trust-divider" aria-hidden />
          <TrustItem value={24} suffix="/7" label="Family access" index={3} />
        </div>
      </section>

      {/* ═══════════════ FEATURE CARDS ROW ═══════════════ */}
      <section className="section-pad">
        <div className="mx-auto max-w-[1480px]">
          <ScrollReveal className="mb-10 text-center">
            <p className="kv-section-label">One platform</p>
            <h2 className="text-3xl md:text-[2.5rem] md:leading-[1.1] font-semibold">Everything from one discharge summary</h2>
          </ScrollReveal>

          <div className="kv-feature-row">
            <FeatureCard icon={Translate} index={0}
              title="Six languages"
              desc="Tamil, Hindi, Kannada, Telugu, Malayalam and English." />
            <FeatureCard icon={Pill} index={1}
              title="Medicine schedule"
              desc="Drug names, doses, timing and food rules in clear slots." />
            <FeatureCard icon={CalendarCheck} index={2}
              title="Appointment calendar"
              desc="Every follow-up visit and test on a dated calendar." />
            <FeatureCard icon={ShieldCheck} index={3}
              title="Doctor verification"
              desc="Unclear items stay locked until a doctor confirms." />
          </div>
        </div>
      </section>

      {/* ═══════════════ MORE FEATURES ═══════════════ */}
      <section className="kv-features-extra section-pad" style={{ paddingTop: 0 }}>
        <div className="mx-auto max-w-[1480px]">
          <div className="kv-feature-row">
            <FeatureCard icon={UsersFour} index={0}
              title="Family sharing"
              desc="Share with family. They see only what you allow." />
            <FeatureCard icon={ChatCircleDots} index={1}
              title="Source tracing"
              desc="Every item links back to the exact line in the summary." />
          </div>
        </div>
      </section>

      {/* ═══════════════ HOW IT WORKS ═══════════════ */}
      <section className="kv-how-section section-pad" id="how">
        <div className="mx-auto max-w-[1480px]">
          <div className="kv-how-layout">
            <div className="kv-how-left">
              <ScrollReveal direction="left">
                <p className="kv-section-label">How it works</p>
                <h2 className="text-3xl md:text-[2.5rem] md:leading-[1.1] font-semibold">
                  How CareBridge fits into your workflow.
                </h2>
                <p className="mt-4 text-muted text-lg">
                  From discharge to daily plan in four steps.
                </p>
              </ScrollReveal>
              <ScrollReveal delay={0.15}>
                <div className="mt-6">
                  <LinkButton to="/register" className="btn-hero-primary" style={{ background: "var(--primary)", borderColor: "var(--primary)", color: "#fff" }}>
                    Get started <ArrowRight size={18} />
                  </LinkButton>
                </div>
              </ScrollReveal>
            </div>

            <div className="kv-how-right">
              {[
                { icon: Eye, num: 1, title: t("step1T"), desc: t("step1D"), extra: "PDF upload, copy-paste, photo scan. Personal data masked automatically." },
                { icon: Translate, num: 2, title: t("step2T"), desc: t("step2D"), extra: "AI finds medicines, appointments, tests and warnings. Each links to source." },
                { icon: ShieldCheck, num: 3, title: t("step3T"), desc: t("step3D"), extra: "Ambiguous items flagged and locked. Doctor reviews before patient sees." },
                { icon: Globe, num: 4, title: t("step4T"), desc: t("step4D"), extra: "Calendar, medicine timeline, fridge sheet, push reminders. Family gets read-only link." },
              ].map((s, i) => (
                <StepCard key={s.num} {...s} index={i} />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════ WHO IT'S FOR ═══════════════ */}
      <section className="section-pad">
        <div className="mx-auto max-w-[1480px]">
          <ScrollReveal className="mb-10 text-center">
            <p className="kv-section-label">Who it's for</p>
            <h2 className="text-3xl md:text-[2.5rem] md:leading-[1.1] font-semibold">One platform, four roles</h2>
          </ScrollReveal>

          <div className="kv-role-grid">
            <RoleCard role="Patient" desc="Upload your discharge summary. Get a personal plan with medicines, appointments and reminders in your language." icon={Heart} index={0} />
            <RoleCard role="Family" desc="View your loved one's plan. See only what they share. No app needed." icon={UsersFour} index={1} />
            <RoleCard role="Doctor" desc="Review flagged items in a queue. Confirm, correct or clarify before the patient sees them." icon={FirstAidKit} index={2} />
            <RoleCard role="Management" desc="Hospital-wide stats. Track plans created, reviewed and shared." icon={Globe} index={3} />
          </div>
        </div>
      </section>

      {/* ═══════════════ TRUST / SAFETY ═══════════════ */}
      <section className="kv-trust-section section-pad" id="safety">
        <div className="mx-auto max-w-[1480px]">
          <ScrollReveal className="mb-10 text-center">
            <p className="kv-section-label kv-section-label-light">Safety promise</p>
            <h2 className="text-3xl md:text-[2.5rem] md:leading-[1.1] font-semibold text-white">
              {t("itNeverWill")}
            </h2>
            <p className="mt-4 mx-auto max-w-2xl text-lg" style={{ color: "rgba(246,252,250,0.6)" }}>
              CareBridge organizes what your doctor already wrote. It never adds, changes, or invents medical information.
            </p>
          </ScrollReveal>

          <div className="kv-trust-grid">
            {NEVER.map((key, i) => (
              <motion.div
                key={key}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.08, ease: [0.25, 0.1, 0.25, 1] }}
                className="kv-trust-card"
              >
                <div className="kv-trust-icon">
                  <Prohibit size={20} weight="duotone" />
                </div>
                <p className="mt-2 text-sm font-medium">{t(key)}</p>
              </motion.div>
            ))}
          </div>

          <ScrollReveal delay={0.2} className="mt-6 text-center">
            <Link to="/safety" className="text-sm underline" style={{ color: "var(--secondary)" }}>{t("safetyLimits")}</Link>
          </ScrollReveal>
        </div>
      </section>

      {/* ═══════════════ CTA ═══════════════ */}
      <section className="kv-cta-section" aria-label="Get started">
        <div className="kv-cta-inner">
          <div className="mx-auto max-w-3xl px-5 text-center relative z-10">
            <motion.div
              initial={still ? false : { opacity: 0, y: 30, scale: 0.97 }}
              whileInView={{ opacity: 1, y: 0, scale: 1 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
              className="space-y-6"
            >
              <h2 className="kv-cta-title">Ready to turn your discharge summary into a plan?</h2>
              <p className="mx-auto max-w-xl text-lg" style={{ color: "var(--ink)", opacity: 0.7 }}>
                Create an account. Paste your discharge summary, get a dated calendar, medicine times and reminders — all in six languages.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
                {home
                  ? <LinkButton to={home} className="kv-cta-btn">{t("goMyPlans")} <ArrowRight size={18} /></LinkButton>
                  : <>
                      <LinkButton to="/register" className="kv-cta-btn">{t("createAccount")} <ArrowRight size={18} /></LinkButton>
                      <LinkButton to="/login" className="kv-cta-btn-ghost">{t("signIn")}</LinkButton>
                    </>}
              </div>
            </motion.div>
          </div>
        </div>
      </section>
    </div>
  );
}

function TrustItem({ value, suffix = "", label, index = 0 }: { value: number; suffix?: string; label: string; index?: number }) {
  const still = useReducedMotion();
  return (
    <motion.div
      initial={still ? false : { opacity: 0, y: 12, scale: 0.9 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1], delay: index * 0.08 }}
      className="text-center"
    >
      <span className="trust-value"><Counter value={value} suffix={suffix} /></span>
      <span className="trust-label">{label}</span>
    </motion.div>
  );
}
