import { CalendarBlank, Heart, Lock, Pill, ShieldCheck, Translate } from "@phosphor-icons/react";
import { m as motion, useMotionValue, useReducedMotion, useSpring, useTransform } from "motion/react";
import type { PointerEvent, ReactNode } from "react";

function Card({ children, className, z, delay, bob }: { children: ReactNode; className: string; z: number; delay: number; bob: number }) {
  const still = useReducedMotion();
  return (
    <motion.div
      className={`absolute rounded-2xl border border-line/50 bg-surface/95 p-3.5 shadow-lg backdrop-blur-sm ${className}`}
      style={{ z }}
      initial={still ? false : { opacity: 0, scale: 0.7, y: 24 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 220, damping: 16, delay }}
    >
      <motion.div animate={still ? undefined : { y: [0, -bob, 0] }} transition={{ duration: 4 + bob / 4, repeat: Infinity, ease: "easeInOut", delay }}>
        {children}
      </motion.div>
    </motion.div>
  );
}

function PhoneFrame() {
  return (
    <div className="relative mx-auto w-[220px] sm:w-[260px]">
      <div className="rounded-[28px] border-2 border-white/20 bg-ink/80 p-2 shadow-2xl backdrop-blur-md">
        <div className="mx-auto mb-2 h-1.5 w-16 rounded-full bg-white/20" />
        <div className="overflow-hidden rounded-[22px] bg-surface">
          <div className="bg-primary px-4 py-3">
            <p className="text-xs font-semibold text-surface/80">CareBridge</p>
            <p className="text-sm font-bold text-surface">Today's Plan</p>
          </div>
          <div className="space-y-2 px-3 py-3">
            <div className="flex items-center gap-2 rounded-xl bg-bg p-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary"><Pill size={16} weight="duotone" /></span>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-ink">Aspirin 75mg</p>
                <p className="text-[10px] text-muted">After breakfast</p>
              </div>
              <span className="h-5 w-5 rounded-full border-2 border-primary bg-primary/20" />
            </div>
            <div className="flex items-center gap-2 rounded-xl bg-bg p-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary/20 text-primary"><CalendarBlank size={16} weight="duotone" /></span>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-ink">Heart check-up</p>
                <p className="text-[10px] text-muted">Dr. Meera, 3 Nov</p>
              </div>
              <span className="rounded-md bg-secondary/30 px-1.5 text-[9px] font-bold text-primary">Upcoming</span>
            </div>
            <div className="flex items-center gap-2 rounded-xl bg-attention-tint p-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-attention/10 text-attention"><Heart size={16} weight="duotone" /></span>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-attention">Warning sign</p>
                <p className="text-[10px] text-attention/70">Chest pain: go to ER</p>
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-xl bg-bg p-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary"><Translate size={16} weight="duotone" /></span>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-ink">தமிழ் மொழிபெயர்ப்பு</p>
                <p className="text-[10px] text-muted">Tamil translation ready</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function HeroScene() {
  const still = useReducedMotion();
  const px = useMotionValue(0);
  const py = useMotionValue(0);
  const sx = useSpring(px, { stiffness: 120, damping: 18 });
  const sy = useSpring(py, { stiffness: 120, damping: 18 });
  const rotY = useTransform(sx, [-0.5, 0.5], [-8, 8]);
  const rotX = useTransform(sy, [-0.5, 0.5], [6, -6]);

  const move = (e: PointerEvent<HTMLDivElement>) => {
    if (still) return;
    const r = e.currentTarget.getBoundingClientRect();
    px.set((e.clientX - r.left) / r.width - 0.5);
    py.set((e.clientY - r.top) / r.height - 0.5);
  };
  const leave = () => { px.set(0); py.set(0); };

  return (
    <div className="relative mx-auto w-full max-w-[440px]" style={{ perspective: 1100 }} onPointerMove={move} onPointerLeave={leave}>
      <motion.div className="relative py-6" style={{ rotateX: still ? 0 : rotX, rotateY: still ? 0 : rotY, transformStyle: "preserve-3d" }}>
        <PhoneFrame />
        <Card className="-left-4 top-8 w-48 sm:-left-10" z={90} delay={0.35} bob={6}>
          <p className="flex items-center gap-2 text-sm font-semibold"><Pill size={18} weight="duotone" className="text-primary" aria-hidden /> Morning medicines</p>
          <p className="text-xs text-muted">Aspirin 75 mg, after food</p>
        </Card>
        <Card className="-right-4 top-[40%] w-44 sm:-right-8" z={120} delay={0.55} bob={8}>
          <p className="flex items-center gap-2 text-sm font-semibold"><ShieldCheck size={18} weight="duotone" className="text-primary" aria-hidden /> Doctor verified</p>
          <p className="text-xs text-muted">All items confirmed</p>
        </Card>
        <Card className="-left-2 bottom-4 w-44 sm:-left-6" z={70} delay={0.75} bob={5}>
          <p className="flex items-center gap-2 text-sm font-semibold text-primary"><Lock size={18} weight="duotone" aria-hidden /> Waiting review</p>
          <p className="text-xs text-muted">Doctor will confirm</p>
        </Card>
      </motion.div>
    </div>
  );
}
