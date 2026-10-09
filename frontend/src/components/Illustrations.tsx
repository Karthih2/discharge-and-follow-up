const P = "var(--primary)";
const S = "var(--secondary)";
const L = "var(--line)";
const SF = "var(--surface)";
const A = "var(--attention)";

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
