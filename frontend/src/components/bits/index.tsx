/*
  React Bits style components, rebuilt on `motion` (already in the bundle) so no GSAP is needed.
  BlurText, ScrollReveal, AnimatedContent, SpotlightCard, Magnet, Marquee, ShinyText, ScrollProgress.
  Every component falls back to a static render when the user prefers reduced motion.
*/
import { m as motion, useMotionValue, useReducedMotion, useScroll, useSpring, useTransform, type MotionValue } from "motion/react";
import { useRef, useState, useEffect, type CSSProperties, type MouseEvent, type ReactNode } from "react";
import { cn } from "../../lib/utils";

const EASE = [0.22, 1, 0.36, 1] as const;

/** BlurText: words arrive one by one, from blurred and lowered to sharp. */
export function BlurText({ text, as: Tag = "h1", className, delay = 0, stagger = 0.06, id }: { text: string; as?: "h1" | "h2" | "p"; className?: string; delay?: number; stagger?: number; id?: string }) {
  const still = useReducedMotion();
  const words = text.split(" ");
  const M = motion[Tag];
  if (still) return <Tag id={id} className={className}>{text}</Tag>;
  return (
    <M id={id} className={className} aria-label={text} initial="hidden" whileInView="show" viewport={{ once: true, margin: "-40px" }}>
      {words.map((w, i) => (
        <motion.span key={i + w} aria-hidden className="inline-block whitespace-pre"
          variants={{ hidden: { opacity: 0, y: 18, filter: "blur(10px)" }, show: { opacity: 1, y: 0, filter: "blur(0px)" } }}
          transition={{ duration: 0.7, ease: EASE, delay: delay + i * stagger }}>
          {w}{i < words.length - 1 ? " " : ""}
        </motion.span>
      ))}
    </M>
  );
}

function Word({ children, progress, range }: { children: string; progress: MotionValue<number>; range: [number, number] }) {
  const opacity = useTransform(progress, range, [0.14, 1]);
  return <motion.span style={{ opacity }} className="inline-block whitespace-pre">{children}</motion.span>;
}

/** ScrollReveal: each word brightens as the paragraph scrolls through the viewport. */
export function ScrollReveal({ text, className, id }: { text: string; className?: string; id?: string }) {
  const ref = useRef<HTMLHeadingElement>(null);
  const still = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 0.9", "start 0.35"] });
  const words = text.split(" ");
  if (still) return <h2 id={id} className={className}>{text}</h2>;
  return (
    <h2 ref={ref} id={id} className={className} aria-label={text}>
      <span aria-hidden>
        {words.map((w, i) => (
          <Word key={i} progress={scrollYProgress} range={[i / words.length, (i + 1) / words.length]}>{w + (i < words.length - 1 ? " " : "")}</Word>
        ))}
      </span>
    </h2>
  );
}

/** AnimatedContent: slide and fade a block in when it scrolls into view. */
export function AnimatedContent({ children, className, delay = 0, distance = 40, direction = "up", scale = 1, as = "div" }: {
  children: ReactNode; className?: string; delay?: number; distance?: number; direction?: "up" | "left" | "right"; scale?: number; as?: "div" | "li" | "article";
}) {
  const still = useReducedMotion();
  const M = motion[as];
  const off = direction === "up" ? { y: distance } : { x: direction === "left" ? -distance : distance };
  if (still) return <M className={className}>{children}</M>;
  return (
    <M className={className} initial={{ opacity: 0, scale, ...off }} whileInView={{ opacity: 1, scale: 1, x: 0, y: 0 }}
      viewport={{ once: true, margin: "-60px" }} transition={{ duration: 0.8, ease: EASE, delay }}>
      {children}
    </M>
  );
}

/** SpotlightCard: a soft light follows the pointer across the card. */
export function SpotlightCard({ children, className, color = "rgba(2,195,154,0.16)" }: { children: ReactNode; className?: string; color?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const move = (e: MouseEvent<HTMLDivElement>) => {
    const r = ref.current?.getBoundingClientRect();
    if (!r || !ref.current) return;
    ref.current.style.setProperty("--mx", `${e.clientX - r.left}px`);
    ref.current.style.setProperty("--my", `${e.clientY - r.top}px`);
  };
  return (
    <div ref={ref} onMouseMove={move} className={cn("bits-spot group relative overflow-hidden", className)} style={{ "--spot": color } as CSSProperties}>
      {children}
    </div>
  );
}

/** Magnet: the child drifts a little toward the pointer. */
export function Magnet({ children, strength = 0.25, className }: { children: ReactNode; strength?: number; className?: string }) {
  const still = useReducedMotion();
  const x = useMotionValue(0), y = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 260, damping: 18 }), sy = useSpring(y, { stiffness: 260, damping: 18 });
  if (still) return <span className={cn("inline-flex", className)}>{children}</span>;
  return (
    <motion.span className={cn("inline-flex", className)} style={{ x: sx, y: sy }}
      onMouseMove={(e) => { const r = e.currentTarget.getBoundingClientRect(); x.set((e.clientX - r.left - r.width / 2) * strength); y.set((e.clientY - r.top - r.height / 2) * strength); }}
      onMouseLeave={() => { x.set(0); y.set(0); }}>
      {children}
    </motion.span>
  );
}

/** Marquee: an endless row; pauses on hover. */
export function Marquee({ children, className, speed = 40, reverse = false }: { children: ReactNode; className?: string; speed?: number; reverse?: boolean }) {
  return (
    <div className={cn("bits-marquee", className)} style={{ "--dur": `${speed}s`, "--dir": reverse ? "reverse" : "normal" } as CSSProperties}>
      <div className="bits-marquee-track">{children}</div>
      <div className="bits-marquee-track" aria-hidden>{children}</div>
    </div>
  );
}

/** ShinyText: a light sweep runs across the text. */
export function ShinyText({ children, className }: { children: ReactNode; className?: string }) {
  return <span className={cn("bits-shiny", className)}>{children}</span>;
}

/** ScrollProgress: thin bar at the very top that fills as the page scrolls. */
export function ScrollProgress() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 120, damping: 24, mass: 0.3 });
  return <motion.div className="fixed inset-x-0 top-0 z-[70] h-[3px] origin-left bg-gradient-to-r from-baltic via-teal to-mint" style={{ scaleX }} aria-hidden />;
}

/** TiltCard: interactive 3D perspective tilt reacting to mouse position */
export function TiltCard({ children, className, maxTilt = 8 }: { children: ReactNode; className?: string; maxTilt?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const still = useReducedMotion();
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const rotateX = useSpring(useTransform(y, [-0.5, 0.5], [maxTilt, -maxTilt]), { stiffness: 280, damping: 25 });
  const rotateY = useSpring(useTransform(x, [-0.5, 0.5], [-maxTilt, maxTilt]), { stiffness: 280, damping: 25 });

  if (still) return <div className={className}>{children}</div>;

  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    x.set(mouseX / width - 0.5);
    y.set(mouseY / height - 0.5);
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
      className={cn("transition-[box-shadow] duration-300", className)}
    >
      {children}
    </motion.div>
  );
}

/** AnimatedCounter: counts smoothly up to target number on view */
export function AnimatedCounter({ value, suffix = "", prefix = "" }: { value: number; suffix?: string; prefix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const still = useReducedMotion();
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (still) {
      setCount(value);
      return;
    }
    let frame: number;
    const start = performance.now();
    const duration = 1400;
    const tick = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const ease = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      setCount(Math.round(ease * value));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value, still]);

  return (
    <span ref={ref} className="tabular-nums">
      {prefix}{count}{suffix}
    </span>
  );
}
