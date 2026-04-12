"use client";

import { motion, useReducedMotion } from "framer-motion";

/** Horizontal bar that grows from 0 to pct width when in view. */
export function AnimatedBarWidth({
  pct,
  className = "",
}: {
  pct: number;
  className?: string;
}) {
  const reduce = useReducedMotion();
  const w = Math.min(100, Math.max(0, pct));

  return (
    <div className="h-2.5 min-w-0 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800/90">
      <motion.div
        className={`h-full rounded-full ${className}`}
        initial={reduce ? { width: `${w}%` } : { width: 0 }}
        whileInView={reduce ? undefined : { width: `${w}%` }}
        viewport={{ once: true, amount: 0.3 }}
        transition={{ duration: 0.85, ease: [0.22, 1, 0.36, 1] }}
      />
    </div>
  );
}
