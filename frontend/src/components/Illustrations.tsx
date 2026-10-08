import { motion } from "motion/react";
import { useMotionT } from "../lib/motion";

const P = "var(--primary)";
const S = "var(--secondary)";
const L = "var(--line)";
const SF = "var(--surface)";
const A = "var(--attention)";

/** Heartbeat line that draws itself on a loop. */
export function EcgLine({ className = "", width = 360, onDark = false }: { className?: string; width?: number; onDark?: boolean }) {
  return (
    <svg className={className} width={width} height={width / 6} viewBox="0 0 360 60" fill="none" aria-hidden>
      <path d="M0 30h90l14-22 18 44 16-34 10 12h212" stroke={onDark ? "rgba(246,252,250,0.3)" : L} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      <path className="ecg-draw" d="M0 30h90l14-22 18 44 16-34 10 12h212" stroke={onDark ? "var(--secondary)" : P} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Hero artwork: a plan card with tasks, a capsule, a calendar, a shield and a heartbeat. All custom SVG. */
export function HeroArt() {
  const mt = useMotionT();
  const pop = (d: number) => ({ initial: { opacity: 0, y: 16, scale: 0.94 }, animate: { opacity: 1, y: 0, scale: 1 }, transition: { ...mt(0.5, d), type: "spring" as const, stiffness: 180, damping: 18 } });
  return (
    <svg viewBox="0 0 520 460" className="mx-auto w-full max-w-[520px]" role="img" aria-label="A follow-up plan with medicines, appointments and a heartbeat line">
      <rect x="10" y="20" width="500" height="420" rx="4" fill={SF} stroke={L} strokeWidth="2" />
      <rect x="10" y="20" width="500" height="54" rx="4" fill={P} />
      <circle cx="40" cy="47" r="7" fill={S} />
      <rect x="58" y="41" width="140" height="12" rx="3" fill={SF} opacity="0.85" />

      <motion.g {...pop(0.1)}>
        <rect x="36" y="96" width="290" height="76" rx="4" fill="var(--bg)" stroke={L} strokeWidth="2" />
        <circle cx="68" cy="134" r="18" fill={S} opacity="0.55" />
        <path d="M60 134l6 6 11-12" stroke="var(--ink)" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        <rect x="100" y="118" width="150" height="11" rx="3" fill={P} />
        <rect x="100" y="140" width="190" height="9" rx="3" fill={L} />
      </motion.g>
      <motion.g {...pop(0.25)}>
        <rect x="36" y="186" width="290" height="76" rx="4" fill="var(--bg)" stroke={L} strokeWidth="2" />
        <g transform="translate(50 205)">
          <rect x="0" y="6" width="38" height="34" rx="3" fill="none" stroke={P} strokeWidth="3" />
          <path d="M0 18h38M10 0v10M28 0v10" stroke={P} strokeWidth="3" strokeLinecap="round" />
        </g>
        <rect x="100" y="208" width="130" height="11" rx="3" fill={P} />
        <rect x="100" y="230" width="170" height="9" rx="3" fill={L} />
      </motion.g>
      <motion.g {...pop(0.4)}>
        <rect x="36" y="276" width="290" height="76" rx="4" fill="var(--attention-tint)" stroke={A} strokeWidth="2" />
        <g transform="translate(52 298)" stroke={A} strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="14" width="30" height="22" rx="3" />
          <path d="M9 14v-5a9 9 0 0 1 18 0v5" />
          <circle cx="18" cy="25" r="2.5" fill={A} />
        </g>
        <rect x="100" y="298" width="150" height="11" rx="3" fill={A} />
        <rect x="100" y="320" width="110" height="9" rx="3" fill={A} opacity="0.35" />
      </motion.g>

      <g transform="translate(345 100)"><motion.g {...pop(0.55)}>
        <rect width="140" height="120" rx="4" fill={SF} stroke={L} strokeWidth="2" />
        <g transform="translate(70 62) rotate(-35)">
          <rect x="-40" y="-14" width="80" height="28" rx="14" fill={SF} stroke={P} strokeWidth="3" />
          <path d="M0 -14h26a14 14 0 0 1 0 28H0z" fill={S} />
          <rect x="-40" y="-14" width="80" height="28" rx="14" fill="none" stroke={P} strokeWidth="3" />
          <path d="M0 -14v28" stroke={P} strokeWidth="3" />
        </g>
      </motion.g></g>
      <g transform="translate(345 236)"><motion.g {...pop(0.7)}>
        <rect width="140" height="116" rx="4" fill={SF} stroke={L} strokeWidth="2" />
        <path d="M70 22l38 14v28c0 22-16 36-38 44-22-8-38-22-38-44V36z" fill={S} opacity="0.5" stroke={P} strokeWidth="3" strokeLinejoin="round" />
        <path d="M54 66l12 12 22-24" stroke={P} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      </motion.g></g>

      <path d="M36 396h96l12-18 16 36 14-28 8 10h288" stroke={L} strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <path className="ecg-draw" d="M36 396h96l12-18 16 36 14-28 8 10h288" stroke={P} strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Five custom step icons for the process section. */
export function StepArt({ n, size = 72 }: { n: number; size?: number }) {
  const common = { width: size, height: size, viewBox: "0 0 72 72", fill: "none", "aria-hidden": true } as const;
  const line = { stroke: P, strokeWidth: 3, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  if (n === 1)
    return (
      <svg {...common}>
        <rect x="14" y="8" width="38" height="52" rx="3" fill={SF} {...line} />
        <path d="M22 22h22M22 31h22M22 40h14" {...line} />
        <circle cx="50" cy="50" r="13" fill={S} stroke={P} strokeWidth="3" />
        <path d="M50 56V44M44 49l6-6 6 6" {...line} />
      </svg>
    );
  if (n === 2)
    return (
      <svg {...common}>
        <rect x="10" y="10" width="40" height="52" rx="3" fill={SF} {...line} />
        <path d="M18 22h24M18 32h24M18 42h12" stroke={L} strokeWidth="4" strokeLinecap="round" />
        <circle cx="44" cy="40" r="13" fill={S} fillOpacity="0.6" stroke={P} strokeWidth="3" />
        <path d="M54 50l10 10" {...line} strokeWidth="5" />
      </svg>
    );
  if (n === 3)
    return (
      <svg {...common}>
        <path d="M36 6l24 9v18c0 16-10 26-24 33C22 59 12 49 12 33V15z" fill={S} fillOpacity="0.45" {...line} />
        <path d="M36 24v22M25 35h22" stroke={A} strokeWidth="5" strokeLinecap="round" />
      </svg>
    );
  if (n === 4)
    return (
      <svg {...common}>
        <path d="M10 14h40a4 4 0 0 1 4 4v20a4 4 0 0 1-4 4H26l-10 9v-9h-6a4 4 0 0 1-4-4V18a4 4 0 0 1 4-4z" fill={SF} {...line} />
        <text x="14" y="34" fontSize="16" fontWeight="700" fill={P}>अ க</text>
        <path d="M50 46h12a4 4 0 0 1 4 4v10a4 4 0 0 1-4 4h-3v8l-8-8h-1a4 4 0 0 1-4-4V50a4 4 0 0 1 4-4z" fill={S} fillOpacity="0.6" {...line} />
      </svg>
    );
  return (
    <svg {...common}>
      <circle cx="26" cy="24" r="10" fill={S} fillOpacity="0.6" {...line} />
      <path d="M6 58c0-11 9-18 20-18s20 7 20 18" {...line} fill={SF} />
      <circle cx="52" cy="28" r="8" fill={SF} {...line} />
      <path d="M40 58c1-8 6-13 14-13 7 0 12 5 12 13" {...line} fill={S} fillOpacity="0.35" />
      <path d="M36 12c3-6 10-3 7 3-2 3-7 6-7 6s-5-3-7-6c-3-6 4-9 7-3z" fill={A} stroke="none" opacity="0.9" transform="translate(-2 -6) scale(.8)" />
    </svg>
  );
}

/** Quiet divider graphic between sections. */
export function Divider() {
  return (
    <div className="flex items-center gap-4 text-line" aria-hidden>
      <span className="h-px flex-1 bg-line" />
      <EcgLine width={180} />
      <span className="h-px flex-1 bg-line" />
    </div>
  );
}
