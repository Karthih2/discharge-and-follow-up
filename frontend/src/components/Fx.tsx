import {
  Bandaids, Barbell, FirstAidKit, ForkKnife, Hospital, Notepad, PersonSimpleWalk, Pill, Stethoscope, TestTube, Warning,
  type Icon,
} from "@phosphor-icons/react";
import { animate, motion, useInView, useMotionValue, useTransform } from "motion/react";
import { useEffect, useRef } from "react";
import { useMotionT } from "../lib/motion";

const ICON: Record<string, Icon> = {
  appointment: Stethoscope,
  test: TestTube,
  referral: Hospital,
  medication: Pill,
  wound_care: Bandaids,
  diet: ForkKnife,
  activity: PersonSimpleWalk,
  rehab: Barbell,
  warning_sign: Warning,
  other: Notepad,
};

const TINT: Record<string, string> = {
  medication: "tint-secondary text-ink",
  warning_sign: "bg-attention-tint text-attention",
};

/** Duotone category icon in a soft tinted tile. Same palette, no extra hues. */
export function CategoryIcon({ category, size = 28, locked = false }: { category: string; size?: number; locked?: boolean }) {
  const I = ICON[category] ?? FirstAidKit;
  const tone = locked ? "bg-bg text-muted" : TINT[category] ?? "tint-primary text-primary";
  return (
    <span className={`inline-flex shrink-0 items-center justify-center rounded-md ${tone}`} style={{ width: size * 1.7, height: size * 1.7 }} aria-hidden>
      <I size={size} weight="duotone" />
    </span>
  );
}

/** Number that counts up once when it scrolls into view. */
export function CountUp({ to, className = "" }: { to: number; className?: string }) {
  const mt = useMotionT();
  const ref = useRef<HTMLSpanElement>(null);
  const seen = useInView(ref, { once: true });
  const v = useMotionValue(0);
  const text = useTransform(v, (n) => Math.round(n).toString());
  useEffect(() => {
    if (!seen) return;
    const t = mt(0.9);
    const c = animate(v, to, { duration: t.duration, ease: "easeOut" });
    return () => c.stop();
  }, [seen, to, v, mt]);
  return <motion.span ref={ref} className={className}>{text}</motion.span>;
}

/** Circular progress. The arc draws in, then follows value changes. */
export function ProgressRing({ value, total, size = 96, label }: { value: number; total: number; size?: number; label?: string }) {
  const mt = useMotionT();
  const r = (size - 14) / 2;
  const c = 2 * Math.PI * r;
  const pct = total ? value / total : 0;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }} role="img" aria-label={label ?? `${value} of ${total} done`}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--line)" strokeWidth="9" />
        <motion.circle
          cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--primary)" strokeWidth="9" strokeLinecap="round"
          strokeDasharray={c} initial={{ strokeDashoffset: c }} animate={{ strokeDashoffset: c * (1 - pct) }}
          transition={mt(0.9)} transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center leading-none">
        <span className="font-heading text-2xl"><CountUp to={value} /></span>
        <span className="text-xs text-muted">of {total}</span>
      </div>
    </div>
  );
}

/** Check mark that draws itself when it appears. */
export function DrawCheck({ size = 22 }: { size?: number }) {
  const mt = useMotionT();
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <motion.circle cx="12" cy="12" r="10" fill="var(--secondary)" initial={{ scale: 0.4, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={mt(0.25)} style={{ originX: "50%", originY: "50%" }} />
      <motion.path d="M7 12.5l3.2 3.2L17 9" stroke="var(--ink)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={mt(0.35, 0.15)} />
    </svg>
  );
}

/** Custom medicine capsule graphic for empty and hero states. */
export function Capsule({ size = 56 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden>
      <g transform="rotate(-35 32 32)">
        <rect x="8" y="22" width="48" height="20" rx="10" fill="var(--surface)" stroke="var(--primary)" strokeWidth="3" />
        <path d="M32 22h14a10 10 0 0 1 0 20H32z" fill="var(--secondary)" />
        <rect x="8" y="22" width="48" height="20" rx="10" fill="none" stroke="var(--primary)" strokeWidth="3" />
        <path d="M32 22v20" stroke="var(--primary)" strokeWidth="3" />
      </g>
    </svg>
  );
}
