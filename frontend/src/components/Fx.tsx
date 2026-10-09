import {
  Bandaids, Barbell, FirstAidKit, ForkKnife, Hospital, Notepad, PersonSimpleWalk, Pill, Stethoscope, TestTube, Warning,
  type Icon,
} from "@phosphor-icons/react";
import { m as motion } from "motion/react";
import { useMotionT } from "../lib/motion";
import { CountUp } from "./CountUp";

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
