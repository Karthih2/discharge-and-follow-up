import {
  ArrowRight, Bell, CalendarCheck, ChevronRight, ClipboardList, Eye, FileUp, Globe,
  Heart, HeartPulse, Languages, MapPin, MessageCircle, Pill, Play, Printer,
  Shield, ShieldCheck, ShieldOff, Stethoscope, Upload, Users
} from "lucide-react";
import { m as motion, useInView, useReducedMotion, useScroll, useTransform } from "motion/react";
import { Link } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { LinkButton } from "../components/ui";
import { HOME, useAuth } from "../lib/auth";
import { LANG_NAMES, useLang } from "../lib/lang";
import { useMotionT } from "../lib/motion";
import { Logo } from "../components/Icons";

/* ═══════════ Shared helpers ═══════════ */

function ScrollReveal({ children, className = "", delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  const still = useReducedMotion();
  return (
    <motion.div ref={ref} initial={still ? false : { opacity: 0, y: 28 }} animate={inView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.55, ease: [0.25, 0.1, 0.25, 1], delay }} className={className}>
      {children}
    </motion.div>
  );
}

function Counter({ value, suffix = "" }: { value: number; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  const [display, setDisplay] = useState(0);
  const still = useReducedMotion();
  useEffect(() => {
    if (!inView) return;
    if (still) { setDisplay(value); return; }
    let frame: number;
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min((now - start) / 1200, 1);
      setDisplay(Math.round((1 - Math.pow(1 - p, 3)) * value));
      if (p < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [inView, value, still]);
  return <span ref={ref}>{display}{suffix}</span>;
}

const NEVER = ["never1", "never2", "never3", "never4"] as const;

/* ═══════════ Component ═══════════ */

export default function Landing() {
  const { user } = useAuth();
  const { t } = useLang();
  const mt = useMotionT();
  const home = user ? HOME[user.role] : null;
  const still = useReducedMotion();

  const heroRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const heroY = useTransform(scrollYProgress, [0, 1], [0, 80]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.7], [1, 0]);

  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", fn, { passive: true });
    return () => window.removeEventListener("scroll", fn);
  }, []);

  return (
    <div className="landing-root">

      {/* ═══════════ NAVBAR ═══════════ */}
      <nav className={`landing-nav ${scrolled ? "scrolled" : ""}`}>
        <div className="landing-nav-inner">
          <Link to="/" className="flex items-center gap-2 no-underline hover:no-underline">
            <Logo size={28} />
            <span className="font-heading text-xl font-bold text-ink">CareBridge</span>
          </Link>
          <div className="nav-links">
            <a href="#hero" className="nav-active">Home</a>
            <a href="#how">How It Works</a>
            <a href="#features">Features</a>
            <a href="#safety">Safety</a>
            <a href="#languages">Languages</a>
          </div>
          <div className="flex items-center gap-2">
            {home
              ? <LinkButton to={home} small>{t("goMyPlans")}</LinkButton>
              : <>
                  <LinkButton to="/login" look="quiet" small>{t("signIn")}</LinkButton>
                  <LinkButton to="/register" small>Get Started <ChevronRight size={16} /></LinkButton>
                </>}
          </div>
        </div>
      </nav>

      {/* ═══════════ HERO ═══════════ */}
      <section ref={heroRef} className="hero-section" id="hero">
        <motion.div style={still ? {} : { y: heroY, opacity: heroOpacity }} className="hero-grid">
          {/* Left — copy */}
          <div className="space-y-6">
            <motion.h1 initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={mt(0.5, 0.06)} className="hero-title">
              Your Recovery Journey,{"\n"}
              <span className="hero-accent">Made Simpler.</span>
            </motion.h1>

            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={mt(0.3, 0.2)} className="measure hero-sub">
              CareBridge uses AI to turn hospital discharge summaries into easy-to-understand follow-up plans — in your language.
            </motion.p>

            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={mt(0.3, 0.32)} className="flex flex-wrap gap-3 pt-1">
              {home
                ? <LinkButton to={home} className="btn btn-hero-primary">Go to My Plans <ArrowRight size={18} /></LinkButton>
                : <>
                    <LinkButton to="/register" className="btn btn-hero-primary"><Heart size={18} /> Get Started <ArrowRight size={18} /></LinkButton>
                    <a href="#how" className="btn btn-hero-outline"><Play size={16} /> Explore How It Works</a>
                  </>}
            </motion.div>

            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={mt(0.3, 0.45)} className="hero-trust-row">
              <span className="hero-trust-item"><ShieldCheck size={16} /> Safety First</span>
              <span className="hero-trust-sep" />
              <span className="hero-trust-item"><Languages size={16} /> 6 Indian Languages</span>
              <span className="hero-trust-sep" />
              <span className="hero-trust-item"><Heart size={16} /> Better Care, Healthier Tomorrow</span>
            </motion.div>
          </div>

          {/* Right — floating dashboard mockup */}
          <motion.div initial={{ opacity: 0, scale: 0.92, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ duration: 0.9, delay: 0.15, ease: [0.25, 0.1, 0.25, 1] }} className="hero-visual">
            {/* Family illustration placeholder */}
            <img
              src="/hero-cutout.png"
              alt="A younger woman helps an older person read their follow-up plan"
              className="hero-photo"
              width={720} height={695}
            />
            {/* Floating dashboard card */}
            <motion.div
              className="hero-dashboard"
              initial={still ? false : { opacity: 0, x: 30, y: -10 }}
              animate={{ opacity: 1, x: 0, y: 0 }}
              transition={{ duration: 0.6, delay: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
            >
              <div className="hd-header">
                <span className="hd-title">Your Recovery Plan</span>
                <span className="hd-badge">● On Track</span>
              </div>
              <div className="hd-stats">
                <div className="hd-ring">
                  <svg viewBox="0 0 48 48" className="hd-ring-svg">
                    <circle cx="24" cy="24" r="20" fill="none" stroke="var(--line)" strokeWidth="4" />
                    <circle cx="24" cy="24" r="20" fill="none" stroke="var(--brand-700)" strokeWidth="4" strokeDasharray="125.6" strokeDashoffset="31.4" strokeLinecap="round" transform="rotate(-90 24 24)" />
                  </svg>
                  <span className="hd-ring-text">75%</span>
                </div>
                <div>
                  <p className="text-xs font-bold">Recovery Progress</p>
                </div>
                <div className="hd-appt">
                  <CalendarCheck size={14} className="text-brand-700" />
                  <div>
                    <p className="text-[10px] text-muted">Next Appointment</p>
                    <p className="text-xs font-bold">Dec 20, 2025</p>
                    <p className="text-[10px] text-muted">10:00 AM</p>
                  </div>
                </div>
              </div>
              <div className="hd-tasks">
                <div className="hd-tasks-head">
                  <span className="text-xs font-bold">Today's Tasks</span>
                  <span className="text-[10px] text-muted">2 of 4</span>
                </div>
                <ul className="hd-task-list">
                  <li className="hd-task done"><ShieldCheck size={12} /> Take Morning Medicine</li>
                  <li className="hd-task done"><ShieldCheck size={12} /> Follow Diet Plan</li>
                  <li className="hd-task"><span className="hd-task-circle" /> Walk for 15 Minutes</li>
                  <li className="hd-task"><span className="hd-task-circle" /> Read Health Tips</li>
                </ul>
              </div>
              <a href="#how" className="hd-link">View Details <ArrowRight size={12} /></a>
            </motion.div>

            {/* Floating vitals card */}
            <motion.div
              className="hero-float-med"
              initial={still ? false : { opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.7 }}
            >
              <Pill size={14} className="text-brand-700" />
              <div>
                <p className="text-xs font-semibold">Morning medicines</p>
                <p className="text-[10px] text-muted">Aspirin 75 mg · after food</p>
              </div>
            </motion.div>
          </motion.div>
        </motion.div>

        <svg className="hero-wave" viewBox="0 0 1440 100" preserveAspectRatio="none" aria-hidden>
          <path d="M0 40 C360 100 1080 0 1440 40 L1440 100 L0 100Z" fill="var(--bg)" />
        </svg>
      </section>

      {/* ═══════════ HOW IT WORKS ═══════════ */}
      <section className="section-pad" id="how">
        <div className="mx-auto max-w-[1200px] text-center">
          <ScrollReveal>
            <h2 className="landing-h2">How CareBridge Works</h2>
            <p className="mt-2 text-muted">From your discharge summary to a clear recovery plan — in just 4 simple steps.</p>
          </ScrollReveal>

          <div className="how-steps">
            {[
              { icon: FileUp, num: 1, title: "Upload", desc: "Share your discharge summary (PDF or text)." },
              { icon: Eye, num: 2, title: "AI Extraction", desc: "We find and organize all instructions." },
              { icon: Stethoscope, num: 3, title: "Doctor Review", desc: "Unclear items are flagged for expert review." },
              { icon: ShieldCheck, num: 4, title: "Recovery Plan", desc: "Get a clear, personalized follow-up plan." },
            ].map((s, i) => (
              <div key={s.num} className="how-step-wrap">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-40px" }}
                  transition={mt(0.4, i * 0.1)}
                  className="how-step"
                >
                  <div className="how-step-icon">
                    <s.icon size={24} strokeWidth={1.8} />
                  </div>
                  <h3 className="mt-3 text-sm font-bold">{s.num}. {s.title}</h3>
                  <p className="mt-1 text-xs text-muted leading-relaxed">{s.desc}</p>
                </motion.div>
                {i < 3 && <ArrowRight size={20} className="how-arrow" />}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════ FEATURES ═══════════ */}
      <section className="section-pad features-section" id="features">
        <div className="mx-auto max-w-[1400px]">
          <div className="features-scroll">
            {[
              { icon: ClipboardList, title: "AI-Powered Extraction", desc: "Get accurate, sourced instructions" },
              { icon: ShieldCheck, title: "Safety First", desc: "Flag risky or unclear instructions" },
              { icon: Languages, title: "6 Indian Languages", desc: "English, Tamil, Hindi, Telugu, Kannada & Malayalam" },
              { icon: Pill, title: "Medicine Schedule", desc: "Track doses & get reminders" },
              { icon: Bell, title: "Smart Reminders", desc: "Never miss important tasks" },
              { icon: MapPin, title: "Provider Directory", desc: "Find nearby doctors, labs & pharmacies" },
              { icon: Printer, title: "Printable Fridge Sheet", desc: "Keep a quick summary at home" },
            ].map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-30px" }}
                transition={mt(0.35, i * 0.05)}
                className="feature-chip"
              >
                <div className="feature-chip-icon">
                  <f.icon size={20} strokeWidth={1.8} />
                </div>
                <div>
                  <h3 className="text-sm font-bold">{f.title}</h3>
                  <p className="text-xs text-muted">{f.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════ TRUST / SAFETY ═══════════ */}
      <section className="kv-trust-section section-pad" id="safety">
        <div className="mx-auto max-w-[1100px]">
          <ScrollReveal className="mb-10 text-center">
            <span className="kv-section-label kv-section-label-light">Safety promise</span>
            <h2 className="mt-3 text-3xl font-bold text-white">{t("itNeverWill")}</h2>
            <p className="mt-3 mx-auto max-w-2xl text-base" style={{ color: "rgba(246,252,250,0.6)" }}>
              CareBridge organizes what your doctor already wrote. It never adds, changes, or invents medical information.
            </p>
          </ScrollReveal>
          <div className="kv-trust-grid">
            {NEVER.map((key, i) => (
              <motion.div key={key} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.4, delay: i * 0.08 }} className="kv-trust-card">
                <div className="kv-trust-icon"><ShieldOff size={20} strokeWidth={1.8} /></div>
                <p className="mt-3 text-sm font-medium text-white/90">{t(key)}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════ CTA ═══════════ */}
      <section className="cta-section" id="languages">
        <div className="cta-skyline" aria-hidden />
        <div className="cta-content">
          <motion.div
            initial={still ? false : { opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.55 }}
            className="text-center space-y-5"
          >
            {home
              ? <LinkButton to={home} className="btn btn-hero-primary btn-lg">Go to My Plans <ArrowRight size={18} /></LinkButton>
              : <LinkButton to="/register" className="btn btn-hero-primary btn-lg">Start Your Recovery Journey <ArrowRight size={18} /></LinkButton>}

            <p className="text-muted text-sm">A healthier tomorrow is just a click away.</p>

            <div className="lang-footer">
              <span className="text-sm text-muted mr-2">Available in:</span>
              {LANG_NAMES.map((l) => (
                <span key={l.code} className="lang-badge">{l.label}</span>
              ))}
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
