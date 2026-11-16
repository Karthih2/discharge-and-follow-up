/*
  The closing landscape: a full-screen, hand-built SVG of hills, a temple skyline, a small hospital,
  and foreground leaves. Each layer moves at its own speed as the section scrolls in (parallax),
  the leaves sway and the clouds drift. Vector, so it stays sharp at any size.
*/
import { m as motion, useReducedMotion, useScroll, useTransform, type MotionValue } from "motion/react";
import { useRef, type ReactNode } from "react";

/* ── Skyline shape builders (all on a shared baseline) ── */
function gopuram(cx: number, base: number, w: number, h: number, tiers = 6) {
  const th = h / tiers;
  let d = "";
  for (let i = 0; i < tiers; i++) {
    const wb = w * (1 - i * 0.12), wt = w * (1 - (i + 1) * 0.12) + w * 0.04;
    const y0 = base - i * th, y1 = y0 - th;
    d += `M${cx - wb / 2} ${y0}L${cx + wb / 2} ${y0}L${cx + wt / 2} ${y1}L${cx - wt / 2} ${y1}Z`;
  }
  const top = base - h, tw = w * (1 - tiers * 0.12) + w * 0.1;
  d += `M${cx - tw / 2} ${top}C${cx - tw / 2} ${top - th * 1.3} ${cx + tw / 2} ${top - th * 1.3} ${cx + tw / 2} ${top}Z`;
  for (const k of [-0.3, 0, 0.3]) { const x = cx + k * tw; d += `M${x - 3} ${top - th * 0.9}a3 5 0 1 0 6 0a3 5 0 1 0 -6 0Z`; }
  return d;
}
function shikhara(cx: number, base: number, w: number, h: number) {
  const r = w / 2;
  return `M${cx - r} ${base}L${cx - r} ${base - h * 0.3}C${cx - r} ${base - h * 0.75} ${cx - r * 0.3} ${base - h * 0.95} ${cx} ${base - h}` +
    `C${cx + r * 0.3} ${base - h * 0.95} ${cx + r} ${base - h * 0.75} ${cx + r} ${base - h * 0.3}L${cx + r} ${base}Z` +
    `M${cx - 4} ${base - h}L${cx + 4} ${base - h}L${cx} ${base - h - 18}Z` +
    `M${cx - r * 1.6} ${base}L${cx - r * 1.6} ${base - h * 0.32}C${cx - r * 1.6} ${base - h * 0.5} ${cx - r} ${base - h * 0.55} ${cx - r} ${base - h * 0.45}L${cx - r} ${base}Z` +
    `M${cx + r} ${base}L${cx + r} ${base - h * 0.45}C${cx + r} ${base - h * 0.55} ${cx + r * 1.6} ${base - h * 0.5} ${cx + r * 1.6} ${base - h * 0.32}L${cx + r * 1.6} ${base}Z`;
}
function gate(cx: number, base: number, w: number, h: number) {
  const aw = w * 0.42, ah = h * 0.62, x0 = cx - w / 2;
  return `M${x0} ${base}L${x0} ${base - h}L${x0 + w} ${base - h}L${x0 + w} ${base}Z` +
    `M${x0 - 6} ${base - h}L${x0 + w + 6} ${base - h}L${x0 + w + 6} ${base - h - 12}L${x0 - 6} ${base - h - 12}Z` +
    `M${x0 + w * 0.15} ${base - h - 12}L${x0 + w * 0.85} ${base - h - 12}L${x0 + w * 0.78} ${base - h - 30}L${x0 + w * 0.22} ${base - h - 30}Z` +
    `M${cx - aw / 2} ${base}L${cx - aw / 2} ${base - ah + aw / 2}A${aw / 2} ${aw / 2} 0 0 1 ${cx + aw / 2} ${base - ah + aw / 2}L${cx + aw / 2} ${base}Z`;
}
function palace(x: number, base: number, w: number, h: number) {
  const cx = x + w / 2, dw = w * 0.34;
  let d = `M${x} ${base}L${x} ${base - h}L${x + w} ${base - h}L${x + w} ${base}Z`;
  d += `M${cx - dw / 2} ${base - h}C${cx - dw / 2} ${base - h - dw * 0.95} ${cx + dw / 2} ${base - h - dw * 0.95} ${cx + dw / 2} ${base - h}Z`;
  d += `M${cx - 2} ${base - h - dw * 0.7}L${cx + 2} ${base - h - dw * 0.7}L${cx} ${base - h - dw * 0.7 - 22}Z`;
  for (const tx of [x - 14, x + w - 10]) {
    d += `M${tx} ${base}L${tx} ${base - h * 1.45}L${tx + 24} ${base - h * 1.45}L${tx + 24} ${base}Z`;
    d += `M${tx - 2} ${base - h * 1.45}C${tx - 2} ${base - h * 1.45 - 26} ${tx + 26} ${base - h * 1.45 - 26} ${tx + 26} ${base - h * 1.45}Z`;
  }
  for (const k of [0.22, 0.78]) { const sx = x + w * k; d += `M${sx - 18} ${base - h}C${sx - 18} ${base - h - 30} ${sx + 18} ${base - h - 30} ${sx + 18} ${base - h}Z`; }
  return d;
}
function windows(x: number, base: number, w: number, h: number, n: number) {
  let d = "";
  const gap = w / (n + 1);
  for (let i = 1; i <= n; i++) { const wx = x + gap * i; d += `M${wx - 6} ${base - h * 0.15}L${wx - 6} ${base - h * 0.55}A6 6 0 0 1 ${wx + 6} ${base - h * 0.55}L${wx + 6} ${base - h * 0.15}Z`; }
  return d;
}
const BASE = 700;
const SKYLINE =
  gopuram(170, BASE, 120, 230) + shikhara(330, BASE, 50, 150) + gate(480, BASE, 120, 150) +
  palace(600, BASE, 230, 80) + gopuram(1440, BASE, 110, 210, 5) + shikhara(1290, BASE, 44, 128) +
  `M940 ${BASE}L940 ${BASE - 60}L1120 ${BASE - 60}L1120 ${BASE}Z` + `M1000 ${BASE - 60}C1000 ${BASE - 120} 1060 ${BASE - 120} 1060 ${BASE - 60}Z` +
  `M932 ${BASE}L932 ${BASE - 140}L944 ${BASE - 140}L944 ${BASE}Z M1116 ${BASE}L1116 ${BASE - 140}L1128 ${BASE - 140}L1128 ${BASE}Z` +
  `M930 ${BASE - 140}C930 ${BASE - 156} 946 ${BASE - 156} 946 ${BASE - 140}Z M1114 ${BASE - 140}C1114 ${BASE - 156} 1130 ${BASE - 156} 1130 ${BASE - 140}Z`;
const SKY_WIN = windows(600, BASE, 230, 80, 7) + windows(940, BASE, 180, 60, 4);

/* ── Leaves ── */
const LEAF = "M0 0C40 -70 150 -100 250 -40C160 -4 60 18 0 0Z";
const RIB = "M0 0C70 -30 150 -50 240 -40";
function Leaf({ x, y, rot, s = 1, fill, delay = 0 }: { x: number; y: number; rot: number; s?: number; fill: string; delay?: number }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${rot}) scale(${s})`}>
      <g className="fs-sway" style={{ animationDelay: `${delay}s` }}>
        <path d={LEAF} fill={fill} />
        <path d={RIB} fill="none" stroke="rgba(255,255,255,0.28)" strokeWidth="3" strokeLinecap="round" />
      </g>
    </g>
  );
}
function Tree({ x, y, s = 1, c = "#6cbf9b" }: { x: number; y: number; s?: number; c?: string }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <rect x="-3" y="-8" width="6" height="26" rx="2" fill="#7a6248" />
      <circle cx="0" cy="-22" r="20" fill={c} /><circle cx="-14" cy="-10" r="14" fill={c} /><circle cx="14" cy="-10" r="14" fill={c} />
      <circle cx="-5" cy="-28" r="8" fill="rgba(255,255,255,0.18)" />
    </g>
  );
}
function Palm({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`} className="fs-sway-slow">
      <path d="M0 0C4 -50 -6 -100 6 -150" stroke="#8a6c4c" strokeWidth="7" fill="none" strokeLinecap="round" />
      {[-150, -110, -70, -30, 10, 200].map((r, i) => (
        <path key={i} d="M0 0C20 -14 50 -14 80 4C50 -2 24 2 0 0Z" fill={i % 2 ? "#3e9a6f" : "#2f8a60"} transform={`translate(6 -150) rotate(${r})`} />
      ))}
    </g>
  );
}

function Layer({ y, children }: { y: MotionValue<number>; children: ReactNode }) {
  return <motion.g style={{ y }}>{children}</motion.g>;
}

export function FooterScene({ children }: { children?: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const still = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end end"] });
  const k = still ? 0 : 1;
  const ySun = useTransform(scrollYProgress, [0, 1], [180 * k, 0]);
  const yFar = useTransform(scrollYProgress, [0, 1], [140 * k, 0]);
  const ySky = useTransform(scrollYProgress, [0, 1], [110 * k, 0]);
  const yMid = useTransform(scrollYProgress, [0, 1], [70 * k, 0]);
  const yNear = useTransform(scrollYProgress, [0, 1], [36 * k, 0]);
  const yLeaf = useTransform(scrollYProgress, [0, 1], [90 * k, 0]);

  return (
    <div ref={ref} className="fs-root">
      <svg className="fs-svg" viewBox="0 0 1600 1000" preserveAspectRatio="xMidYMax slice" role="img" aria-label="Painted Indian landscape with temples, a gateway, a palace, a small hospital on the hills and leaves in the foreground">
        <defs>
          <linearGradient id="fs-sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#ffffff" /><stop offset="0.35" stopColor="#f6fbf3" /><stop offset="0.62" stopColor="#fbf6dd" /><stop offset="1" stopColor="#e9f5ea" />
          </linearGradient>
          <radialGradient id="fs-sun" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0" stopColor="#fff3c4" stopOpacity="1" /><stop offset="0.45" stopColor="#fbe8a6" stopOpacity="0.55" /><stop offset="1" stopColor="#fbe8a6" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="fs-stone" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#f2d6ad" /><stop offset="1" stopColor="#e2b688" /></linearGradient>
          <linearGradient id="fs-far" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#d6ece2" /><stop offset="1" stopColor="#c4e4d6" /></linearGradient>
          <linearGradient id="fs-mid" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#a8dcc5" /><stop offset="1" stopColor="#8fd0b5" /></linearGradient>
          <linearGradient id="fs-near" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#5db592" /><stop offset="1" stopColor="#47a07e" /></linearGradient>
          <linearGradient id="fs-ground" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#2f8467" /><stop offset="1" stopColor="#1d5c4a" /></linearGradient>
        </defs>

        <rect width="1600" height="1000" fill="url(#fs-sky)" />

        <Layer y={ySun}>
          <circle cx="1180" cy="430" r="230" fill="url(#fs-sun)" />
          <circle cx="1180" cy="430" r="62" fill="#fbe3a0" opacity="0.85" />
        </Layer>

        <g className="fs-cloud" opacity="0.9">
          <g fill="#ffffff"><ellipse cx="300" cy="300" rx="90" ry="22" /><ellipse cx="340" cy="285" rx="50" ry="26" /><ellipse cx="270" cy="290" rx="36" ry="18" /></g>
          <g fill="#ffffff"><ellipse cx="900" cy="240" rx="120" ry="24" /><ellipse cx="950" cy="222" rx="60" ry="28" /><ellipse cx="870" cy="228" rx="44" ry="20" /></g>
        </g>
        <g className="fs-birds" fill="none" stroke="#5f7f76" strokeWidth="2.5" strokeLinecap="round">
          <path d="M700 360q9 -9 18 0q9 -9 18 0" /><path d="M748 336q7 -7 14 0q7 -7 14 0" /><path d="M780 372q6 -6 12 0q6 -6 12 0" />
        </g>

        <Layer y={yFar}>
          <path d="M0 610C200 530 340 575 480 535C640 488 760 560 900 518C1060 468 1220 540 1360 498C1460 470 1540 495 1600 488L1600 1000L0 1000Z" fill="url(#fs-far)" />
        </Layer>

        <Layer y={ySky}>
          <path d={SKYLINE} fill="url(#fs-stone)" opacity="0.92" />
          <path d={SKY_WIN} fill="#c99a6c" opacity="0.55" />
          <rect x="0" y={BASE - 2} width="1600" height="8" fill="#e9caa0" opacity="0.5" />
        </Layer>

        <Layer y={yMid}>
          <path d="M0 698C180 650 360 690 520 668C700 644 860 700 1040 680C1220 660 1400 700 1600 668L1600 1000L0 1000Z" fill="url(#fs-mid)" />
          <Tree x={90} y={690} s={0.9} /><Tree x={560} y={672} s={0.8} c="#74c4a1" /><Tree x={860} y={688} s={1} /><Tree x={1500} y={676} s={0.85} c="#74c4a1" />
          <Palm x={720} y={680} s={0.7} /><Palm x={1600 - 230} y={690} s={0.8} />
        </Layer>

        <Layer y={yNear}>
          <path d="M0 792C220 742 420 800 640 770C860 740 1040 802 1260 770C1420 750 1520 772 1600 760L1600 1000L0 1000Z" fill="url(#fs-near)" />
          {/* Small hospital on the hill: the place the journey starts from */}
          <g transform="translate(1110 768)">
            <rect x="-70" y="-74" width="140" height="74" rx="4" fill="#fbfbf6" />
            <rect x="-26" y="-104" width="52" height="34" rx="3" fill="#ffffff" />
            <path d="M-6 -98h12v8h8v12h-8v8h-12v-8h-8v-12h8z" fill="#028090" />
            {[-52, -30, 22, 44].map((x) => <rect key={x} x={x} y="-58" width="12" height="14" rx="2" fill="#bfe3ea" />)}
            {[-52, -30, 22, 44].map((x) => <rect key={x + "b"} x={x} y="-34" width="12" height="14" rx="2" fill="#bfe3ea" />)}
            <rect x="-9" y="-30" width="18" height="30" rx="3" fill="#05668D" opacity="0.85" />
          </g>
          {/* A winding path home */}
          <path d="M1100 790C1020 830 860 820 780 860C700 900 640 940 600 1000" stroke="#f3e7c3" strokeWidth="16" fill="none" strokeLinecap="round" opacity="0.8" />
          <Tree x={300} y={780} s={1.1} c="#3f9b78" /><Tree x={1360} y={768} s={1.05} c="#3f9b78" />
        </Layer>

        <path d="M0 885C260 845 520 886 800 862C1080 838 1340 882 1600 852L1600 1000L0 1000Z" fill="url(#fs-ground)" />

        <Layer y={yLeaf}>
          <Leaf x={-20} y={1010} rot={-62} s={1.3} fill="#2c8a5f" delay={0} />
          <Leaf x={-30} y={1010} rot={-32} s={1.15} fill="#3ea676" delay={0.6} />
          <Leaf x={-10} y={1020} rot={-8} s={0.95} fill="#1f6f4c" delay={1.1} />
          <Leaf x={1620} y={1010} rot={-118} s={1.3} fill="#2c8a5f" delay={0.3} />
          <Leaf x={1630} y={1010} rot={-150} s={1.1} fill="#3ea676" delay={0.9} />
          <Leaf x={1610} y={1020} rot={-172} s={0.95} fill="#1f6f4c" delay={1.4} />
          <g fill="#ffffff" opacity="0.92">
            {[[150, 930], [190, 955], [1440, 940], [1480, 962]].map(([x, y], i) => (
              <g key={i} transform={`translate(${x} ${y})`}>{[0, 72, 144, 216, 288].map((r) => <ellipse key={r} cx="0" cy="-7" rx="4.5" ry="8" transform={`rotate(${r})`} />)}<circle r="3.5" fill="#f2c94c" /></g>
            ))}
          </g>
        </Layer>
      </svg>
      <div className="fs-content">{children}</div>
    </div>
  );
}
