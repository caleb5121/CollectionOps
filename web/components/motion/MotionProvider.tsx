"use client";

import { MotionConfig } from "framer-motion";
import type { ReactNode } from "react";

/** Respects `prefers-reduced-motion` via Framer’s user setting. */
export function MotionProvider({ children }: { children: ReactNode }) {
  return (
    <MotionConfig reducedMotion="user" transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}>
      {children}
    </MotionConfig>
  );
}
