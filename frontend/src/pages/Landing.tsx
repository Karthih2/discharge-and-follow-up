import {
  AlertTriangle, ArrowRight, Building2, Check, CheckCircle2, ChevronDown, ClipboardList,
  FileSearch, FileUp, HeartHandshake, Languages, ListChecks, MapPin, Menu, Moon,
  Phone, PlayCircle, Pill, ScanText, ShieldCheck, Sparkles, Stethoscope, Sunrise, Users, X,
} from "lucide-react";
import { AnimatePresence, m as motion, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  AnimatedContent, AnimatedCounter, BlurText, Magnet, Marquee, ScrollProgress,
  ScrollReveal, ShinyText, SpotlightCard, TiltCard,
} from "../components/bits";
import { FooterScene } from "../components/FooterScene";
import { Logo } from "../components/Icons";
import { RolePicker } from "../components/RolePicker";
import { Badge, Button, Card } from "../components/ui/shadcn";
import { useL, type LandingKey } from "../i18n/landing";
import { api, getToken } from "../lib/api";
import { HOME, useAuth } from "../lib/auth";
import { HOSPITAL_FULL, PRODUCT } from "../lib/brand";
import { LANG_NAMES, useLang } from "../lib/lang";
import type { Lang } from "../lib/types";
import "../styles/landing.css";

const GLYPH: Record<Lang, string> = { en: "A", ta: "அ", hi: "अ", te: "అ", kn: "ಕ", ml: "മ" };

/** A subtle placeholder bar for simulated UI cards */
const Bar = ({ w, tone = "bg-slate-200" }: { w: string; tone?: string }) => (
  <i className={`block h-2 rounded-full ${tone}`} style={{ width: w }} aria-hidden />
);

function useLangSwitch() {
  const { lang, setLang } = useLang();
  const set = (l: Lang) => {
    setLang(l);
    if (getToken()) api.setLanguage(l).catch(() => undefined);
  };
  return { lang, set };
}

function LangDropdown() {
  const { lang, set } = useLangSwitch();
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const off = (e: MouseEvent) => {
      if (!box.current?.contains(e.target as Node)) setOpen(false);
    };
    const esc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", off);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", off);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);

  const current = LANG_NAMES.find((l) => l.code === lang) || LANG_NAMES[0];

  return (
    <div ref={box} className="relative">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="Select Language"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 rounded-full border border-slate-200 bg-white/90 px-3.5 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:border-teal-500 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
      >
        <span className="grid h-4 w-4 place-items-center rounded-full bg-teal-100 text-[10px] font-bold text-teal-700">
          {GLYPH[lang]}
        </span>
        <span className="hidden sm:inline">{current.label}</span>
        <span className="sm:hidden font-mono uppercase">{lang}</span>
        <ChevronDown size={14} className={`text-slate-400 transition-transform ${open ? "rotate-180" : ""}`} aria-hidden />
      </button>

      <AnimatePresence>
        {open && (
          <motion.ul
            role="listbox"
            aria-label="Choose Language"
            initial={{ opacity: 0, y: 6, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.96 }}
            transition={{ duration: 0.16 }}
            className="absolute right-0 z-50 mt-2 w-52 rounded-2xl border border-slate-200/90 bg-white p-1.5 shadow-xl shadow-slate-900/10"
          >
            {LANG_NAMES.map((l) => (
              <li key={l.code}>
                <button
                  type="button"
                  role="option"
                  aria-selected={l.code === lang}
                  onClick={() => {
                    set(l.code);
                    setOpen(false);
                  }}
                  className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm transition ${
                    l.code === lang
                      ? "bg-teal-50 font-semibold text-teal-800"
                      : "text-slate-700 hover:bg-slate-50 hover:text-slate-900"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="grid h-5 w-5 place-items-center rounded-md bg-slate-100 text-xs font-bold text-slate-700" lang={l.code}>
                      {GLYPH[l.code]}
                    </span>
                    <span>{l.label}</span>
                  </div>
                  {l.code === lang && <Check size={16} className="text-teal-700" aria-hidden />}
                </button>
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}

function SectionHead({
  eyebrow,
  title,
  sub,
  id,
  center = false,
}: {
  eyebrow?: string;
  title: string;
  sub?: string;
  id: string;
  center?: boolean;
}) {
  return (
    <div className={`lp-head ${center ? "mx-auto text-center" : ""}`}>
      {eyebrow && (
        <AnimatedContent distance={14}>
          <Badge variant="soft" className={center ? "mx-auto inline-flex" : ""}>
            <Sparkles size={13} className="text-teal-600" aria-hidden /> {eyebrow}
          </Badge>
        </AnimatedContent>
      )}
      <BlurText as="h2" id={id} text={title} className="lp-h2 mt-3" stagger={0.04} />
      {sub && (
        <AnimatedContent delay={0.12} distance={14}>
          <p className={`lp-sub ${center ? "mx-auto" : ""}`}>{sub}</p>
        </AnimatedContent>
      )}
    </div>
  );
}

/* ─────────────── Hero Visual: The CareBridge Discharge Visual ─────────────── */
function HeroVisual() {
  const L = useL();
  const still = useReducedMotion();

  const pop = (i: number) =>
    still
      ? {}
      : {
          initial: { opacity: 0, y: 20, scale: 0.95 },
          animate: { opacity: 1, y: 0, scale: 1 },
          transition: { duration: 0.65, delay: 0.45 + i * 0.15 },
        };

  return (
    <div className="lp-visual" aria-hidden>
      <div className="lp-blob lp-blob-a" />
      <div className="lp-blob lp-blob-b" />

      {/* Main interactive visual card with 3D tilt */}
      <TiltCard className="lp-frame" maxTilt={6}>
        <img
          src="/landing-hero.jpeg"
          alt="Doctor and family discussing personalized patient care"
          width={900}
          height={1600}
          fetchPriority="high"
          loading="eager"
        />
        {/* Subtle glass reflection overlay */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-teal-900/15 via-transparent to-white/20" />
      </TiltCard>

      {/* Floating real-time context pills with responsive breathability */}
      <div className="lp-floats">
        {/* Pill 1: Today's doses */}
        <motion.div className="lp-card lp-f1" {...pop(0)}>
          <p className="lp-card-h">
            <span className="lp-chip bg-teal-50 text-teal-700">
              <Pill size={14} />
            </span>
            <span>{L("cardToday")}</span>
          </p>
          <div className="lp-dose done">
            <span className="lp-dose-ic">
              <Sunrise size={15} />
            </span>
            <span className="flex-1 min-w-0">
              <b>{L("cardMorning")}</b>
              <Bar w="70%" tone="bg-emerald-200" />
            </span>
            <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
          </div>
          <div className="lp-dose">
            <span className="lp-dose-ic">
              <Moon size={15} />
            </span>
            <span className="flex-1 min-w-0">
              <b>{L("cardNight")}</b>
              <Bar w="55%" />
            </span>
            <span className="lp-ring shrink-0" />
          </div>
        </motion.div>

        {/* Pill 2: Emergency Warning */}
        <motion.div className="lp-card lp-card-warn lp-f2" {...pop(1)}>
          <p className="lp-card-h text-rose-600">
            <span className="lp-chip bg-rose-50 text-rose-600">
              <AlertTriangle size={14} />
            </span>
            <span>{L("cardWarn")}</span>
          </p>
          <div className="space-y-2">
            <span className="flex items-center gap-2">
              <i className="h-1.5 w-1.5 rounded-full bg-rose-500 shrink-0" />
              <Bar w="75%" tone="bg-rose-200" />
            </span>
            <span className="flex items-center gap-2">
              <i className="h-1.5 w-1.5 rounded-full bg-rose-500 shrink-0" />
              <Bar w="55%" tone="bg-rose-200" />
            </span>
          </div>
          <span className="lp-pill-red">
            <Phone size={13} /> {L("call108")}
          </span>
        </motion.div>

        {/* Pill 3: Doctor approved */}
        <motion.div className="lp-card lp-f3" {...pop(2)}>
          <span className="lp-ok-ic">
            <ShieldCheck size={22} />
          </span>
          <div className="min-w-0 flex-1">
            <b className="block text-sm font-semibold text-slate-900 leading-snug">{L("cardApproved")}</b>
            <span className="block text-xs text-slate-500 mt-0.5 leading-tight">{L("cardApprovedSub")}</span>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

/* ─────────────── Interactive Previews for Role Cards ─────────────── */
function PreviewPatient() {
  return (
    <div className="lp-mini" aria-hidden>
      <div className="grid grid-cols-3 gap-2">
        {[
          { Icon: Sunrise, label: "08:00 AM", done: true },
          { Icon: Users, label: "01:30 PM", done: false },
          { Icon: Moon, label: "09:00 PM", done: false },
        ].map((item, i) => (
          <div key={i} className="rounded-xl border border-slate-200/90 bg-white p-2.5 shadow-sm">
            <item.Icon size={14} className="mb-1.5 text-teal-600" />
            <span className="text-[10px] font-semibold text-slate-600 block">{item.label}</span>
            <Bar w="85%" tone={item.done ? "bg-teal-300" : "bg-slate-200"} />
          </div>
        ))}
      </div>
      <div className="mt-2 flex items-center justify-between rounded-xl border border-rose-200 bg-rose-50/70 px-3 py-2 text-xs font-medium text-rose-700">
        <span className="flex items-center gap-1.5">
          <AlertTriangle size={13} className="text-rose-500" /> Red Flags Monitored
        </span>
        <span className="rounded-full bg-rose-600 px-2 py-0.5 text-[10px] font-bold text-white">108 Ready</span>
      </div>
    </div>
  );
}

function PreviewDoctor() {
  return (
    <div className="lp-mini grid grid-cols-2 gap-2" aria-hidden>
      <div className="space-y-2 rounded-xl border border-slate-200/90 bg-white p-2.5 shadow-sm">
        <span className="text-[10px] font-bold uppercase text-slate-400 block tracking-wider">Source Text</span>
        {["92%", "74%", "88%"].map((w, i) => (
          <span key={i} className={`flex items-center gap-1.5 ${i === 1 ? "rounded bg-amber-50 p-1 border border-amber-200" : ""}`}>
            <i className="w-2.5 text-[9px] text-slate-400 not-italic font-mono">{i + 1}</i>
            <Bar w={w} tone={i === 1 ? "bg-amber-400" : "bg-slate-200"} />
          </span>
        ))}
      </div>
      <div className="space-y-2">
        <div className="rounded-xl border border-teal-300 bg-teal-50/50 p-2.5">
          <span className="text-[10px] font-bold text-teal-800 block">Verified Dose</span>
          <span className="mt-1.5 flex gap-1.5">
            <i className="h-3.5 w-10 rounded-md bg-teal-600" />
            <i className="h-3.5 w-8 rounded-md bg-slate-200" />
          </span>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-2">
          <Bar w="80%" />
        </div>
      </div>
    </div>
  );
}

function PreviewAdmin() {
  return (
    <div className="lp-mini" aria-hidden>
      {["86%", "52%", "70%"].map((w, i) => (
        <div key={i} className="mb-2 flex items-center gap-2.5 rounded-xl border border-slate-200/90 bg-white px-3 py-2 shadow-sm">
          <i className="h-4 w-4 rounded-full bg-teal-100 flex items-center justify-center text-[9px] font-bold text-teal-700">
            {i + 1}
          </i>
          <span className="flex-1">
            <Bar w="55%" />
          </span>
          <span className="h-2 w-20 overflow-hidden rounded-full bg-slate-100">
            <i
              className={`block h-full rounded-full ${i === 0 ? "bg-teal-500" : i === 1 ? "bg-amber-500" : "bg-sky-500"}`}
              style={{ width: w }}
            />
          </span>
        </div>
      ))}
    </div>
  );
}

/* ─────────────── Step Flow Timeline ─────────────── */
function Steps({ steps }: { steps: { Icon: typeof FileUp; t: string; d: string; tint: string }[] }) {
  return (
    <ol className="lp-steps">
      <span className="lp-steps-track" aria-hidden>
        <span className="lp-steps-fill" />
      </span>
      {steps.map(({ Icon, t, d, tint }, i) => (
        <AnimatedContent as="li" key={i} className="lp-step" delay={i * 0.12} distance={25}>
          <span className={`lp-step-ic ${tint}`}>
            <Icon size={30} aria-hidden />
            <span className="lp-step-n">{i + 1}</span>
          </span>
          <h3 className="mt-6 text-[1.25rem] font-extrabold text-slate-900 leading-snug">{t}</h3>
          <p className="mt-2.5 text-base text-slate-600 leading-relaxed font-normal">{d}</p>
        </AnimatedContent>
      ))}
    </ol>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN LANDING COMPONENT
   ═══════════════════════════════════════════════════════════════════════════ */
export default function Landing() {
  const { user } = useAuth();
  const L = useL();
  const { lang, set } = useLangSwitch();
  const still = useReducedMotion();
  const home = user ? HOME[user.role] : null;

  const [picker, setPicker] = useState(false);
  const [menu, setMenu] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [activeSection, setActiveSection] = useState<string>("top");

  // Track scroll position for navbar glassification and active section highlighting
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Section observer for active navbar links
  useEffect(() => {
    const sections = ["top", "problem", "how", "roles", "features", "safety", "languages"];
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        });
      },
      { rootMargin: "-30% 0px -60% 0px" }
    );

    sections.forEach((id) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  const links: { href: string; k: LandingKey; sectionId: string }[] = [
    { href: "#how", k: "navHow", sectionId: "how" },
    { href: "#roles", k: "navPatients", sectionId: "roles" },
    { href: "#features", k: "featTitle", sectionId: "features" },
    { href: "#safety", k: "navSafety", sectionId: "safety" },
    { href: "#languages", k: "trust2", sectionId: "languages" },
  ];

  const steps = [
    { Icon: FileUp, t: L("s1t"), d: L("s1d"), tint: "lp-t-blue" },
    { Icon: ScanText, t: L("s2t"), d: L("s2d"), tint: "lp-t-teal" },
    { Icon: Stethoscope, t: L("s3t"), d: L("s3d"), tint: "lp-t-violet" },
    { Icon: HeartHandshake, t: L("s4t"), d: L("s4d"), tint: "lp-t-mint" },
  ];

  const roles = [
    {
      id: "patients",
      Icon: HeartHandshake,
      title: L("r1t"),
      points: [L("r1a"), L("r1b"), L("r1c"), L("r1d")],
      cta: L("r1cta"),
      href: "/login",
      spa: true,
      Preview: PreviewPatient,
      wash: "lp-wash-mint",
    },
    {
      id: "doctors",
      Icon: Stethoscope,
      title: L("r2t"),
      points: [L("r2a"), L("r2b"), L("r2c"), L("r2d")],
      cta: L("r2cta"),
      href: "/doctor/login",
      spa: false,
      Preview: PreviewDoctor,
      wash: "lp-wash-baltic",
    },
    {
      id: "hospitals",
      Icon: Building2,
      title: L("r3t"),
      points: [L("r3a"), L("r3b"), L("r3c"), L("r3d")],
      cta: L("r3cta"),
      href: "/management/login",
      spa: false,
      Preview: PreviewAdmin,
      wash: "lp-wash-cream",
    },
  ];

  const features = [
    { Icon: FileSearch, t: L("f1t"), d: L("f1d"), tint: "lp-t-blue", span: "lg:col-span-2" },
    { Icon: ShieldCheck, t: L("f2t"), d: L("f2d"), tint: "lp-t-orange", span: "" },
    { Icon: Languages, t: L("f3t"), d: L("f3d"), tint: "lp-t-mint", span: "" },
    { Icon: ClipboardList, t: L("f4t"), d: L("f4d"), tint: "lp-t-violet", span: "" },
    { Icon: Users, t: L("f5t"), d: L("f5d"), tint: "lp-t-teal", span: "" },
    { Icon: MapPin, t: L("f6t"), d: L("f6d"), tint: "lp-t-rose", span: "lg:col-span-2" },
  ];

  const promises = [
    { Icon: Stethoscope, t: L("safe1") },
    { Icon: Pill, t: L("safe2") },
    { Icon: ListChecks, t: L("safe3") },
    { Icon: MapPin, t: L("safe4") },
  ];

  const trust = [
    { Icon: ShieldCheck, k: "trust1" as const, val: 100, suffix: "% Checked" },
    { Icon: Languages, k: "trust2" as const, val: 6, suffix: " Languages" },
    { Icon: FileSearch, k: "trust3" as const, val: 100, suffix: "% Traced" },
    { Icon: Stethoscope, k: "trust4" as const, val: 0, suffix: " Guesswork" },
  ];

  const StartBtn = ({ variant = "default" as "default" | "white", size = "lg" as "lg" | "default" }) => {
    const isWhite = variant === "white";
    const label = home ? L("goHome") : L("getStarted");

    const btnStyle = isWhite
      ? { backgroundColor: "#ffffff", color: "#0f172a", border: "1.5px solid #cbd5e1" }
      : {
          backgroundColor: "#0d6e64",
          color: "#ffffff",
          boxShadow: "0 10px 24px -4px rgba(13, 110, 100, 0.45)",
        };

    const pyClass = size === "lg" ? "py-4 px-8 text-base sm:text-lg" : "py-2.5 px-5 text-sm sm:text-base";

    return home ? (
      <Link
        to={home}
        style={btnStyle}
        className={`inline-flex items-center justify-center gap-2.5 rounded-full ${pyClass} font-bold transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] select-none shrink-0`}
      >
        <span className="font-bold tracking-tight">{label}</span>
        <ArrowRight size={size === "lg" ? 20 : 16} aria-hidden />
      </Link>
    ) : (
      <button
        type="button"
        onClick={() => setPicker(true)}
        style={btnStyle}
        className={`inline-flex items-center justify-center gap-2.5 rounded-full ${pyClass} font-bold transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] select-none shrink-0`}
      >
        <span className="font-bold tracking-tight">{label}</span>
        <ArrowRight size={size === "lg" ? 20 : 16} aria-hidden />
      </button>
    );
  };

  return (
    <div className="lp-root" lang={lang}>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[90] focus:rounded-xl focus:bg-teal-700 focus:p-3 focus:text-white"
      >
        Skip to content
      </a>

      {/* Top scroll progress indicator */}
      <ScrollProgress />

      {/* ──────────────── Modern Floating Navigation ──────────────── */}
      <header className={`lp-nav ${scrolled ? "is-scrolled" : ""}`}>
        <div className="lp-nav-inner">
          {/* Logo & Clinical Badge - shrink-0 ensures it NEVER disappears */}
          <Link to="/" className="flex items-center gap-3 no-underline group shrink-0 min-w-max" aria-label={`${PRODUCT} home`}>
            <div className="relative shrink-0">
              <Logo size={36} />
              <span className="absolute -bottom-0.5 -right-0.5 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-3 w-3 bg-teal-600" />
              </span>
            </div>
            <div className="flex flex-col shrink-0">
              <span className="text-[1.25rem] font-extrabold tracking-tight text-slate-900 leading-none group-hover:text-teal-700 transition">
                {PRODUCT}
              </span>
              <span className="text-[11px] font-bold tracking-wider uppercase text-teal-800 mt-1">
                Hospital Grade Care
              </span>
            </div>
          </Link>

          {/* Section Navigation Links */}
          <nav className="hidden lg:flex items-center gap-1 xl:gap-2 flex-shrink min-w-0 justify-center" aria-label="Section navigation">
            {links.map(({ href, k, sectionId }) => (
              <a
                key={href}
                href={href}
                className={`lp-navlink ${activeSection === sectionId ? "is-active" : ""}`}
              >
                {L(k)}
              </a>
            ))}
          </nav>

          {/* Right Action Cluster - shrink-0 ensures buttons remain visible */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <LangDropdown />

            {!home && (
              <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex text-slate-700 hover:text-slate-900 font-bold text-sm">
                <Link to="/login">{L("signIn")}</Link>
              </Button>
            )}

            <div className="hidden sm:block">
              <StartBtn size="default" />
            </div>

            {/* Mobile Hamburger Button */}
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden text-slate-700 hover:bg-slate-100"
              aria-label="Toggle Menu"
              aria-expanded={menu}
              onClick={() => setMenu(true)}
            >
              <Menu size={22} />
            </Button>
          </div>
        </div>
      </header>

      {/* ──────────────── Mobile Navigation Drawer ──────────────── */}
      <AnimatePresence>
        {menu && (
          <>
            <motion.div
              className="fixed inset-0 z-[60] bg-slate-900/40 backdrop-blur-sm lg:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMenu(false)}
            />
            <motion.aside
              role="dialog"
              aria-label="Navigation Menu"
              className="fixed inset-y-0 right-0 z-[61] flex w-[min(22rem,88vw)] flex-col bg-white p-5 shadow-2xl lg:hidden"
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", stiffness: 360, damping: 32 }}
            >
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <Logo size={28} />
                  <span className="font-bold text-slate-900">{PRODUCT}</span>
                </div>
                <Button variant="ghost" size="icon" aria-label="Close" onClick={() => setMenu(false)}>
                  <X size={20} />
                </Button>
              </div>

              <div className="mt-4 flex flex-col gap-1 overflow-y-auto flex-1">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400 px-3 py-1">Sections</span>
                {links.map(({ href, k }) => (
                  <a
                    key={href}
                    href={href}
                    className="rounded-xl px-3 py-2.5 text-base font-medium text-slate-800 hover:bg-teal-50 hover:text-teal-800 transition"
                    onClick={() => setMenu(false)}
                  >
                    {L(k)}
                  </a>
                ))}

                <div className="my-3 border-t border-slate-100" />
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400 px-3 py-1">Languages</span>
                <div className="grid grid-cols-2 gap-2 mt-1 px-1">
                  {LANG_NAMES.map((l) => (
                    <button
                      key={l.code}
                      type="button"
                      onClick={() => {
                        set(l.code);
                        setMenu(false);
                      }}
                      className={`flex items-center gap-2 rounded-xl border p-2 text-xs font-medium transition ${
                        l.code === lang
                          ? "border-teal-500 bg-teal-50 text-teal-800 font-bold"
                          : "border-slate-200 text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      <span className="grid h-4 w-4 place-items-center rounded bg-slate-100 text-[10px]" lang={l.code}>
                        {GLYPH[l.code]}
                      </span>
                      {l.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 space-y-2">
                {!home && (
                  <Button asChild variant="outline" className="w-full">
                    <Link to="/login" onClick={() => setMenu(false)}>
                      {L("signIn")}
                    </Link>
                  </Button>
                )}
                <Button
                  className="w-full bg-teal-600 hover:bg-teal-700 text-white"
                  onClick={() => {
                    setMenu(false);
                    setPicker(true);
                  }}
                >
                  {L("getStarted")} <ArrowRight size={16} className="ml-1.5" />
                </Button>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <main id="main-content">
        {/* ──────────────── HERO / STARTING SECTION ──────────────── */}
        <section id="top" className="lp-hero" aria-labelledby="lp-h1">
          <div className="lp-wrap lp-hero-grid">
            <div className="lp-hero-copy">
              {/* Overline pill badge with shimmer */}
              <motion.div
                {...(still
                  ? {}
                  : {
                      initial: { opacity: 0, y: 12 },
                      animate: { opacity: 1, y: 0 },
                      transition: { duration: 0.5 },
                    })}
              >
                <Badge variant="soft" className="py-2 pl-2.5 pr-4 text-sm font-bold bg-white/95 border-teal-200/90 shadow-sm">
                  <span className="grid h-6 w-6 place-items-center rounded-full bg-teal-600 text-white">
                    <HeartHandshake size={14} aria-hidden />
                  </span>
                  <ShinyText className="text-teal-850 font-bold">{L("overline")}</ShinyText>
                </Badge>
              </motion.div>

              {/* Main Heading with blur reveal - dynamic sizing for multilingual support */}
              <BlurText id="lp-h1" text={L("h1")} className="lp-h1" delay={0.08} stagger={0.035} />

              {/* Lead copy */}
              <motion.p
                className="lp-lead"
                {...(still
                  ? {}
                  : {
                      initial: { opacity: 0, y: 12 },
                      animate: { opacity: 1, y: 0 },
                      transition: { duration: 0.6, delay: 0.4 },
                    })}
              >
                {L("sub")}
              </motion.p>

              {/* CTAs */}
              <motion.div
                className="mt-8 flex flex-wrap items-center gap-4"
                {...(still
                  ? {}
                  : {
                      initial: { opacity: 0, y: 12 },
                      animate: { opacity: 1, y: 0 },
                      transition: { duration: 0.6, delay: 0.55 },
                    })}
              >
                <Magnet strength={0.2}>
                  <StartBtn size="lg" />
                </Magnet>
                <Button
                  asChild
                  variant="outline"
                  size="lg"
                  className="h-14 px-7 text-base sm:text-lg font-bold border-2 border-slate-300 hover:border-slate-400 hover:bg-slate-100/90 text-slate-900 shadow-sm rounded-full gap-2.5"
                >
                  <a href="#how">
                    <PlayCircle size={20} className="text-teal-600" aria-hidden /> {L("seeHow")}
                  </a>
                </Button>
              </motion.div>

              {/* Trust Indicators with Animated Counter */}
              <ul className="lp-trust" aria-label="Trust guarantees">
                {trust.map(({ Icon, k, val, suffix }, i) => (
                  <motion.li
                    key={k}
                    {...(still
                      ? {}
                      : {
                          initial: { opacity: 0, y: 8 },
                          animate: { opacity: 1, y: 0 },
                          transition: { duration: 0.5, delay: 0.7 + i * 0.08 },
                        })}
                  >
                    <span className="lp-trust-ic">
                      <Icon size={18} aria-hidden />
                    </span>
                    <span className="flex flex-col min-w-0">
                      <span className="text-sm sm:text-base font-black text-teal-900 leading-none">
                        <AnimatedCounter value={val} suffix={suffix} />
                      </span>
                      <span className="text-xs sm:text-sm font-semibold text-slate-700 leading-tight mt-1">{L(k)}</span>
                    </span>
                  </motion.li>
                ))}
              </ul>
            </div>

            {/* Right Visual mockups & floating context pills */}
            <HeroVisual />
          </div>
        </section>

        {/* ──────────────── PROBLEM SECTION ──────────────── */}
        <section id="problem" className="lp-problem" aria-labelledby="lp-prob">
          <div className="lp-wrap grid items-center gap-10 lg:grid-cols-[1.1fr_1.4fr]">
            <ScrollReveal id="lp-prob" text={L("probTitle")} className="lp-h2 lp-h2-xl max-w-xl" />
            <ul className="grid gap-4 sm:grid-cols-3">
              {[
                { Icon: ClipboardList, k: "prob1" as const, c: "lp-t-blue" },
                { Icon: Users, k: "prob2" as const, c: "lp-t-orange" },
                { Icon: Pill, k: "prob3" as const, c: "lp-t-rose" },
              ].map(({ Icon, k, c }, i) => (
                <AnimatedContent as="li" key={k} delay={i * 0.12} className="lp-prob-card">
                  <span className={`lp-ic ${c}`}>
                    <Icon size={26} aria-hidden />
                  </span>
                  <span className="mt-5 block text-[1.18rem] font-bold leading-snug text-slate-900">
                    {L(k)}
                  </span>
                </AnimatedContent>
              ))}
            </ul>
          </div>
        </section>

        {/* ──────────────── HOW IT WORKS ──────────────── */}
        <section id="how" className="lp-section" aria-labelledby="lp-how">
          <div className="lp-wrap">
            <SectionHead id="lp-how" eyebrow={L("navHow")} title={L("howTitle")} sub={L("howSub")} center />
            <Steps steps={steps} />
          </div>
        </section>

        {/* ──────────────── ROLES: THREE DOORS ──────────────── */}
        <section id="roles" className="lp-section lp-tinted" aria-labelledby="lp-roles">
          <div className="lp-wrap">
            <SectionHead id="lp-roles" title={L("rolesTitle")} sub={L("rolesSub")} />
            <div className="grid gap-7 lg:grid-cols-3">
              {roles.map(({ id, Icon, title, points, cta, href, spa, Preview, wash }, i) => (
                <AnimatedContent key={id} delay={i * 0.12} distance={40} className="h-full">
                  <SpotlightCard className="h-full rounded-3xl" color="rgba(15, 118, 110, 0.15)">
                    <Card id={id} className={`lp-role ${wash}`} aria-labelledby={`lp-r-${id}`} role="article">
                      <Preview />
                      <div className="flex flex-1 flex-col p-7 pt-5">
                        <h3 id={`lp-r-${id}`} className="flex items-center gap-3 text-xl font-extrabold text-slate-900">
                          <span className="lp-chip bg-teal-50 text-teal-700 h-10 w-10">
                            <Icon size={20} aria-hidden />
                          </span>
                          {title}
                        </h3>
                        <ul className="mt-5 flex-1 space-y-3.5">
                          {points.map((p) => (
                            <li key={p} className="flex items-start gap-3 text-base text-slate-700 leading-snug font-medium">
                              <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-teal-100 text-teal-700">
                                <Check size={13} strokeWidth={3} aria-hidden />
                              </span>
                              <span>{p}</span>
                            </li>
                          ))}
                        </ul>
                        <Button asChild variant="outline" className="group/btn mt-7 w-full h-12 text-base font-bold border-slate-300 hover:border-teal-600 hover:text-teal-700">
                          {spa ? (
                            <Link to={href}>
                              {cta}
                              <ArrowRight size={17} className="transition-transform group-hover/btn:translate-x-1 ml-2" aria-hidden />
                            </Link>
                          ) : (
                            <a href={href}>
                              {cta}
                              <ArrowRight size={17} className="transition-transform group-hover/btn:translate-x-1 ml-2" aria-hidden />
                            </a>
                          )}
                        </Button>
                      </div>
                    </Card>
                  </SpotlightCard>
                </AnimatedContent>
              ))}
            </div>
          </div>
        </section>

        {/* ──────────────── FEATURES BENTO GRID ──────────────── */}
        <section id="features" className="lp-section" aria-labelledby="lp-feat">
          <div className="lp-wrap">
            <SectionHead id="lp-feat" title={L("featTitle")} center />
            <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {features.map(({ Icon, t, d, tint, span }, i) => (
                <AnimatedContent as="li" key={t} delay={(i % 3) * 0.1} scale={0.97} distance={25} className={span}>
                  <SpotlightCard className="lp-feature h-full" color="rgba(2, 132, 199, 0.14)">
                    <span className={`lp-ic ${tint}`}>
                      <Icon size={26} aria-hidden />
                    </span>
                    <h3 className="mt-6 text-[1.2rem] font-extrabold text-slate-900 leading-snug">{t}</h3>
                    <p className="mt-2.5 text-base text-slate-600 leading-relaxed font-normal">{d}</p>
                  </SpotlightCard>
                </AnimatedContent>
              ))}
            </ul>
          </div>
        </section>

        {/* ──────────────── CLINICAL SAFETY & GUARDRAILS ──────────────── */}
        <section id="safety" className="lp-safety" aria-labelledby="lp-safe">
          <div className="lp-wrap grid items-center gap-12 lg:grid-cols-[0.9fr_1.1fr]">
            <AnimatedContent direction="left" distance={50} className="relative mx-auto w-full max-w-md">
              <div className="lp-mascot-wrap">
                <motion.img
                  src="/doctor-mascot.png"
                  alt="CareBridge friendly doctor mascot"
                  width={720}
                  height={723}
                  loading="lazy"
                  decoding="async"
                  className="lp-mascot"
                  {...(still
                    ? {}
                    : {
                        animate: { y: [0, -12, 0] },
                        transition: { duration: 5, repeat: Infinity, ease: "easeInOut" },
                      })}
                />
              </div>
            </AnimatedContent>
            <div>
              <BlurText as="h2" id="lp-safe" text={L("safeTitle")} className="lp-h2 max-w-2xl" stagger={0.035} />
              <ul className="mt-8 grid gap-4 sm:grid-cols-2">
                {promises.map(({ Icon, t }, i) => (
                  <AnimatedContent as="li" key={t} delay={i * 0.1} direction="right" distance={25} className="lp-promise">
                    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-amber-100 text-amber-800">
                      <Icon size={22} aria-hidden />
                    </span>
                    <span className="text-base font-bold text-slate-900 leading-snug">{t}</span>
                  </AnimatedContent>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* ──────────────── MULTILINGUAL SECTION ──────────────── */}
        <section id="languages" className="lp-section pb-12" aria-labelledby="lp-lang">
          <div className="lp-wrap">
            <SectionHead id="lp-lang" title={L("langTitle")} sub={L("langSub")} center />
            <div className="mt-8 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5" role="group" aria-label="Language options">
              {LANG_NAMES.map((l, i) => (
                <AnimatedContent key={l.code} delay={i * 0.05} distance={15} scale={0.95}>
                  <button
                    type="button"
                    aria-pressed={l.code === lang}
                    onClick={() => set(l.code)}
                    className="lp-script w-full"
                  >
                    <span className="lp-glyph" lang={l.code}>
                      {GLYPH[l.code]}
                    </span>
                    <span className="text-sm font-semibold">{l.label}</span>
                    {l.code === lang && (
                      <CheckCircle2 size={18} className="absolute right-2.5 top-2.5 text-teal-600" aria-hidden />
                    )}
                  </button>
                </AnimatedContent>
              ))}
            </div>
          </div>

          {/* Endless Marquee Ticker */}
          <Marquee className="mt-14" speed={32}>
            {LANG_NAMES.concat(LANG_NAMES).map((l, i) => (
              <span key={i} className="lp-marq-item">
                <span className="lp-marq-glyph" lang={l.code}>
                  {GLYPH[l.code]}
                </span>
                <span>{l.label}</span>
                <Sparkles size={14} className="text-teal-500" aria-hidden />
              </span>
            ))}
          </Marquee>
        </section>
      </main>

      {/* ──────────────── FOOTER & CLOSING SCENE (Vector Art Landscape) ──────────────── */}
      <footer className="lp-footer" aria-labelledby="lp-cta">
        {/* Full-screen vector art landscape illustration */}
        <FooterScene>
          <div className="lp-wrap flex flex-col items-center pt-[clamp(4rem,8vh,6.5rem)] text-center">
            <AnimatedContent distance={14}>
              <Badge variant="soft" className="bg-white/95 text-teal-900 border-teal-200 shadow-sm backdrop-blur-sm text-sm font-bold py-1.5 px-4">
                <HeartHandshake size={14} className="text-teal-600" aria-hidden /> {PRODUCT}
              </Badge>
            </AnimatedContent>

            <BlurText as="h2" id="lp-cta" text={L("ctaTitle")} className="lp-cta-title text-slate-900 font-extrabold" stagger={0.04} />

            <AnimatedContent delay={0.15} distance={14}>
              <p className="mx-auto mt-4 max-w-2xl text-base sm:text-xl text-slate-700 leading-relaxed font-medium">
                {L("ctaSub")}
              </p>
            </AnimatedContent>

            <AnimatedContent delay={0.25} distance={14} className="mt-8 flex flex-wrap justify-center items-center gap-4">
              <Magnet strength={0.2}>
                <StartBtn size="lg" />
              </Magnet>
              <Button
                asChild
                variant="outline"
                size="lg"
                className="h-14 px-7 text-base sm:text-lg font-bold border-2 border-rose-300 bg-white/95 text-rose-600 hover:bg-rose-50 hover:text-rose-700 shadow-md backdrop-blur-sm rounded-full gap-2.5"
              >
                <a href="tel:108">
                  <Phone size={19} aria-hidden /> {L("footEmergency")}
                </a>
              </Button>
            </AnimatedContent>

            {/* Clickable language badges below CTA details */}
            <AnimatedContent delay={0.32} distance={12} className="mt-8 flex flex-wrap items-center justify-center gap-2.5">
              <span className="text-xs sm:text-sm font-bold text-slate-600 mr-1">Available in:</span>
              {LANG_NAMES.map((l) => (
                <button
                  key={l.code}
                  type="button"
                  aria-pressed={l.code === lang}
                  onClick={() => set(l.code)}
                  className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs sm:text-sm font-bold shadow-sm transition ${
                    l.code === lang
                      ? "bg-teal-700 text-white shadow-teal-900/20"
                      : "bg-white/95 text-teal-900 hover:bg-teal-50 border border-teal-200/80"
                  }`}
                >
                  <span className="font-black text-[11px]" lang={l.code}>
                    {GLYPH[l.code]}
                  </span>
                  <span>{l.label}</span>
                </button>
              ))}
            </AnimatedContent>
          </div>
        </FooterScene>

        {/* Footer Link Ground */}
        <div className="lp-foot-ground border-t border-teal-800/60">
          <div className="lp-wrap grid gap-10 pb-10 pt-10 sm:grid-cols-2 lg:grid-cols-[1.5fr_1fr_1fr_1fr]">
            <div className="space-y-3.5">
              <div className="flex items-center gap-3 text-lg font-bold text-white">
                <span className="rounded-xl bg-white p-1">
                  <Logo size={28} />
                </span>
                {PRODUCT}
              </div>
              <p className="max-w-sm text-sm text-teal-100/75 leading-relaxed">
                {L("footLine")}
              </p>
            </div>

            <nav aria-label={L("footExplore")}>
              <p className="lp-foot-h">{L("footExplore")}</p>
              <ul className="lp-foot-list">
                {links.map(({ href, k }) => (
                  <li key={href}>
                    <a href={href}>{L(k)}</a>
                  </li>
                ))}
              </ul>
            </nav>

            <nav aria-label={L("footAccess")}>
              <p className="lp-foot-h">{L("footAccess")}</p>
              <ul className="lp-foot-list">
                <li><Link to="/login">{L("footPatient")}</Link></li>
                <li><a href="/doctor/login">{L("footDoctor")}</a></li>
                <li><a href="/management/login">{L("footAdmin")}</a></li>
                <li><Link to="/register">{L("footNew")}</Link></li>
              </ul>
            </nav>

            <nav aria-label={L("footHelp")}>
              <p className="lp-foot-h">{L("footHelp")}</p>
              <ul className="lp-foot-list">
                <li><Link to="/legal">{L("footTerms")}</Link></li>
                <li><Link to="/legal">{L("footPrivacy")}</Link></li>
                <li><Link to="/legal">{L("footLimits")}</Link></li>
              </ul>
            </nav>
          </div>

          <div className="lp-wrap flex flex-wrap items-center justify-between gap-3 border-t border-white/10 py-6 text-xs text-teal-200/60">
            <span>© {new Date().getFullYear()} {HOSPITAL_FULL}</span>
            <span>{L("footNote")}</span>
          </div>
        </div>
      </footer>

      {/* Role Picker Dialog */}
      <RolePicker open={picker} onOpenChange={setPicker} />
    </div>
  );
}
