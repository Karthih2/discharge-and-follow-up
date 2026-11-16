import {
  Stethoscope, TestTubes, Hospital, Pill, UtensilsCrossed, Footprints,
  Dumbbell, AlertTriangle, FileText, HeartPulse, type LucideIcon,
} from "lucide-react";
import { m as motion } from "motion/react";
import { useMotionT } from "../lib/motion";
import { CountUp } from "./CountUp";

const ICON: Record<string, LucideIcon> = {
  appointment: Stethoscope,
  test: TestTubes,
  referral: Hospital,
  medication: Pill,
  wound_care: HeartPulse,
  diet: UtensilsCrossed,
  activity: Footprints,
  rehab: Dumbbell,
  warning_sign: AlertTriangle,
  other: FileText,
};

const TINT: Record<string, string> = {
  medication: "bg-green-50 text-green-700",
  appointment: "bg-sky-50 text-sky-700",
  test: "bg-cyan-50 text-cyan-700",
  referral: "bg-teal-50 text-teal-700",
  wound_care: "bg-rose-50 text-rose-700",
  warning_sign: "bg-red-50 text-red-700",
};

export function CategoryIcon({ category, size = 28, locked = false }: { category: string; size?: number; locked?: boolean }) {
  const I = ICON[category] ?? HeartPulse;
  const tone = locked ? "bg-gray-100 text-muted" : TINT[category] ?? "bg-brand-100 text-brand-700";
  return (
    <span className={`inline-flex shrink-0 items-center justify-center rounded-lg ${tone}`} style={{ width: 32, height: 32 }} aria-hidden>
      <I size={size > 30 ? 20 : 16} />
    </span>
  );
}

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
          cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--brand-700)" strokeWidth="9" strokeLinecap="round"
          strokeDasharray={c} initial={{ strokeDashoffset: c }} animate={{ strokeDashoffset: c * (1 - pct) }}
          transition={mt(0.9)} transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center leading-none">
        <span className="text-2xl font-bold text-ink"><CountUp to={value} /></span>
        <span className="text-xs text-muted">of {total}</span>
      </div>
    </div>
  );
}
