import { animate, m as motion, useInView, useMotionValue, useTransform } from "motion/react";
import { useEffect, useRef } from "react";
import { useMotionT } from "../lib/motion";

/** Number that counts up once, in 400 ms, when it first shows. */
export function CountUp({ to, className = "", decimals = 0 }: { to: number; className?: string; decimals?: number }) {
  const mt = useMotionT();
  const ref = useRef<HTMLSpanElement>(null);
  const seen = useInView(ref, { once: true });
  const v = useMotionValue(0);
  const text = useTransform(v, (n) => n.toFixed(decimals));
  useEffect(() => {
    if (!seen) return;
    const c = animate(v, to, { duration: mt(0.4).duration, ease: "easeOut" });
    return () => c.stop();
  }, [seen, to, v, mt]);
  return <motion.span ref={ref} className={className}>{text}</motion.span>;
}
