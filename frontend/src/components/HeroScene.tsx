import { CalendarBlank, Lock, Pill } from "@phosphor-icons/react";
import { m as motion, useMotionValue, useReducedMotion, useSpring, useTransform } from "motion/react";
import type { PointerEvent, ReactNode } from "react";

/** Flat cut-out photo with three flat cards at different depths. The scene tilts toward the pointer, so 2D layers feel 3D. */
function Card({ children, className, z, delay, bob }: { children: ReactNode; className: string; z: number; delay: number; bob: number }) {
  const still = useReducedMotion();
  return (
    <motion.div
      className={`absolute rounded-md border border-line bg-surface p-3 ${className}`}
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

export function HeroScene() {
  const still = useReducedMotion();
  const px = useMotionValue(0);
  const py = useMotionValue(0);
  const sx = useSpring(px, { stiffness: 120, damping: 18 });
  const sy = useSpring(py, { stiffness: 120, damping: 18 });
  const rotY = useTransform(sx, [-0.5, 0.5], [-9, 9]);
  const rotX = useTransform(sy, [-0.5, 0.5], [7, -7]);

  const move = (e: PointerEvent<HTMLDivElement>) => {
    if (still) return;
    const r = e.currentTarget.getBoundingClientRect();
    px.set((e.clientX - r.left) / r.width - 0.5);
    py.set((e.clientY - r.top) / r.height - 0.5);
  };
  const leave = () => { px.set(0); py.set(0); };

  return (
    <div className="relative mx-auto w-full max-w-[520px]" style={{ perspective: 1100 }} onPointerMove={move} onPointerLeave={leave}>
      <motion.div className="relative" style={{ rotateX: still ? 0 : rotX, rotateY: still ? 0 : rotY, transformStyle: "preserve-3d" }}>
        <motion.div className="absolute inset-x-6 bottom-0 top-10 rounded-md border border-line bg-surface" style={{ z: -40 }} aria-hidden />
        <motion.img
          src="/hero-cutout.png"
          alt="A younger woman helps an older woman read her follow-up plan on a phone"
          className="relative block w-full"
          style={{ z: 30 }}
          initial={still ? false : { opacity: 0, y: 30, scale: 0.94 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ type: "spring", stiffness: 140, damping: 18 }}
          width={720}
          height={695}
        />
        <Card className="-left-2 top-6 w-52 sm:-left-8" z={90} delay={0.35} bob={6}>
          <p className="flex items-center gap-2 text-sm font-semibold"><Pill size={18} weight="duotone" className="text-primary" aria-hidden /> Morning medicines</p>
          <p className="text-sm text-muted">Aspirin 75 mg, after food</p>
        </Card>
        <Card className="-right-2 top-[46%] w-48 sm:-right-6" z={120} delay={0.55} bob={8}>
          <p className="flex items-center gap-2 text-sm font-semibold"><CalendarBlank size={18} weight="duotone" className="text-primary" aria-hidden /> Next visit</p>
          <p className="text-sm text-muted">Heart doctor, 24 Oct</p>
        </Card>
        <Card className="bottom-4 left-2 w-52 border-attention bg-attention-tint sm:-left-4" z={70} delay={0.75} bob={5}>
          <p className="flex items-center gap-2 text-sm font-semibold text-attention"><Lock size={18} weight="duotone" aria-hidden /> Waiting for a doctor</p>
          <p className="text-sm text-attention">Your care team will confirm this</p>
        </Card>
      </motion.div>
    </div>
  );
}
