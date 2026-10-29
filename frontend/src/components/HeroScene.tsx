import { CalendarCheck, Clock, SealCheck, Stethoscope } from "@phosphor-icons/react";
import { m as motion, useMotionValue, useReducedMotion, useSpring, useTransform } from "motion/react";
import type { PointerEvent, ReactNode } from "react";

function Card({ children, className, z, delay, bob }: { children: ReactNode; className: string; z: number; delay: number; bob: number }) {
  const still = useReducedMotion();
  return (
    <motion.div
      className={`hero-float-card absolute ${className}`}
      style={{ z }}
      initial={still ? false : { opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1], delay }}
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
  const rotY = useTransform(sx, [-0.5, 0.5], [-5, 5]);
  const rotX = useTransform(sy, [-0.5, 0.5], [4, -4]);

  const move = (e: PointerEvent<HTMLDivElement>) => {
    if (still) return;
    const r = e.currentTarget.getBoundingClientRect();
    px.set((e.clientX - r.left) / r.width - 0.5);
    py.set((e.clientY - r.top) / r.height - 0.5);
  };
  const leave = () => { px.set(0); py.set(0); };

  return (
    <div className="relative mx-auto w-full max-w-[460px]" style={{ perspective: 1100 }} onPointerMove={move} onPointerLeave={leave}>
      <motion.div className="relative" style={{ rotateX: still ? 0 : rotX, rotateY: still ? 0 : rotY, transformStyle: "preserve-3d" }}>
        <div className="hero-image-wrap shadow-lg shadow-black/20">
          <motion.img
            src="/hero-cutout.png"
            alt="A younger woman helps an older woman read her follow-up plan on a phone"
            className="hero-illustration relative block w-full"
            style={{ z: 30 }}
            initial={still ? false : { opacity: 0, scale: 0.92, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.9, ease: [0.25, 0.1, 0.25, 1], delay: 0.1 }}
            width={720}
            height={695}
          />
        </div>

        {/* Floating cards — smaller, tighter */}
        <Card className="-left-2 top-[10%] w-auto sm:-left-8" z={90} delay={0.3} bob={5}>
          <div className="flex items-center gap-2">
            <span className="hero-card-icon bg-primary/10">
              <Clock size={14} weight="bold" className="text-primary" aria-hidden />
            </span>
            <div>
              <p className="text-[13px] font-semibold text-ink leading-tight">Morning medicines</p>
              <p className="text-[11px] text-muted">Aspirin 75 mg · after food</p>
            </div>
          </div>
        </Card>

        <Card className="-right-2 top-[40%] w-auto sm:-right-6" z={120} delay={0.45} bob={6}>
          <div className="flex items-center gap-2">
            <span className="hero-card-icon bg-primary/10">
              <CalendarCheck size={14} weight="bold" className="text-primary" aria-hidden />
            </span>
            <div>
              <p className="text-[13px] font-semibold text-ink leading-tight">Next visit</p>
              <p className="text-[11px] text-muted">Heart doctor · 3 Nov</p>
            </div>
          </div>
        </Card>

        <Card className="bottom-[12%] left-0 w-auto sm:-left-4" z={70} delay={0.6} bob={4}>
          <div className="flex items-center gap-2">
            <span className="hero-card-icon bg-[#e8f5f0]">
              <SealCheck size={14} weight="fill" className="text-primary" aria-hidden />
            </span>
            <div>
              <p className="text-[13px] font-semibold text-primary leading-tight">Doctor verified</p>
              <p className="text-[11px] text-muted">Plan confirmed</p>
            </div>
          </div>
        </Card>

        <Card className="-right-1 bottom-[30%] w-auto sm:-right-3" z={60} delay={0.75} bob={3}>
          <div className="flex items-center gap-2">
            <span className="hero-card-icon bg-attention/8">
              <Stethoscope size={14} weight="bold" className="text-attention" aria-hidden />
            </span>
            <div>
              <p className="text-[13px] font-semibold text-attention leading-tight">Under review</p>
              <p className="text-[11px] text-muted">Doctor will confirm</p>
            </div>
          </div>
        </Card>
      </motion.div>
    </div>
  );
}
