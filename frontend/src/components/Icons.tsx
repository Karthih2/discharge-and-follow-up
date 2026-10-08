// Custom flat SVG icons used on the plan and the fridge sheet.
interface P {
  size?: number;
  className?: string;
}

const base = (size: number) => ({
  width: size,
  height: size,
  viewBox: "0 0 32 32",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
});

export function Sunrise({ size = 28, className }: P) {
  return (
    <svg {...base(size)} className={className}>
      <path d="M4 24h24M9 24a7 7 0 0 1 14 0M16 7v5M6.5 13l3 3M25.5 13l-3 3" />
    </svg>
  );
}

export function Sun({ size = 28, className }: P) {
  return (
    <svg {...base(size)} className={className}>
      <circle cx="16" cy="16" r="5.5" />
      <path d="M16 3v4M16 25v4M3 16h4M25 16h4M6.8 6.8l2.8 2.8M22.4 22.4l2.8 2.8M6.8 25.2l2.8-2.8M22.4 9.6l2.8-2.8" />
    </svg>
  );
}

export function Moon({ size = 28, className }: P) {
  return (
    <svg {...base(size)} className={className}>
      <path d="M26 19.5A11 11 0 0 1 12.5 6 11 11 0 1 0 26 19.5Z" />
    </svg>
  );
}

export function CalendarIcon({ size = 28, className }: P) {
  return (
    <svg {...base(size)} className={className}>
      <rect x="4" y="7" width="24" height="21" rx="2" />
      <path d="M4 14h24M10 4v5M22 4v5" />
    </svg>
  );
}

export function Logo({ size = 28 }: P) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden>
      <rect width="32" height="32" rx="4" fill="var(--primary)" />
      <path d="M5 21c4.5-9 9-9 11 0 2-9 6.5-9 11 0" stroke="var(--bg)" strokeWidth="3" fill="none" strokeLinecap="round" />
      <path d="M5 25h22" stroke="var(--secondary)" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

export const SLOT_ICON = { morning: Sunrise, afternoon: Sun, night: Moon } as const;
