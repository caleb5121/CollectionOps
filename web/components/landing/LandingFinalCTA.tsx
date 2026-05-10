"use client";

import Link from "next/link";
import { motion } from "framer-motion";

type Props = { animate: boolean };

export default function LandingFinalCTA({ animate }: Props) {
  const ease = [0.23, 1, 0.32, 1] as const;

  return (
    <motion.section
      className="mx-auto flex w-full max-w-2xl flex-col items-center rounded-[16px] border border-[color:color-mix(in_oklab,var(--border-warm)_70%,transparent)] bg-[var(--surface-raised)] px-6 py-12 text-center shadow-[0_2px_12px_rgba(0,0,0,0.06),0_16px_40px_-24px_rgba(0,0,0,0.1)] sm:max-w-3xl sm:px-10 sm:py-14"
      initial={animate ? { opacity: 0, y: 20 } : false}
      whileInView={animate ? { opacity: 1, y: 0 } : undefined}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.5, ease }}
      aria-labelledby="landing-final-cta-heading"
    >
      <motion.h2
        id="landing-final-cta-heading"
        className="font-display text-balance text-[2.25rem] font-bold leading-tight tracking-[-0.02em] text-[color:var(--landing-fg)]"
        initial={animate ? { opacity: 0, y: 10 } : false}
        whileInView={animate ? { opacity: 1, y: 0 } : undefined}
        viewport={{ once: true, margin: "-40px" }}
        transition={{ duration: 0.42, delay: 0.04, ease }}
      >
        See what your store actually looks like.
      </motion.h2>
      <motion.p
        className="landing-body-muted mx-auto mt-6 max-w-lg text-[0.9375rem] leading-[1.6] text-balance sm:mt-7 sm:text-base"
        initial={animate ? { opacity: 0, y: 8 } : false}
        whileInView={animate ? { opacity: 1, y: 0 } : undefined}
        viewport={{ once: true, margin: "-40px" }}
        transition={{ duration: 0.4, delay: 0.1, ease }}
      >
        Upload your exports and see clear, trackable progress in seconds.
      </motion.p>
      <motion.div
        className="mt-10 flex w-full flex-col items-center sm:mt-11"
        initial={animate ? { opacity: 0, y: 12 } : false}
        whileInView={animate ? { opacity: 1, y: 0 } : undefined}
        viewport={{ once: true, margin: "-40px" }}
        transition={{ duration: 0.4, delay: 0.16, ease }}
      >
        <Link
          href="/data?demo=1"
          className="inline-flex h-12 items-center justify-center rounded-[8px] bg-[color:var(--accent)] px-10 text-[0.9375rem] font-semibold text-white shadow-[0_2px_8px_rgba(0,0,0,0.08),0_4px_14px_-4px_rgba(26,155,127,0.35)] transition-[transform,background-color,box-shadow] duration-200 ease-out hover:bg-[color:var(--accent-hover)] hover:shadow-[0_8px_24px_-6px_rgba(26,155,127,0.4)] hover:-translate-y-0.5 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent)]/45 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface-raised)] sm:h-[3.15rem] sm:px-12 sm:text-base"
        >
          Try Demo
        </Link>
        <p className="landing-body-muted mx-auto mt-5 max-w-sm text-balance text-[0.8125rem] leading-[1.6] sm:mt-6 sm:text-sm">
          No signup required. Free to use right now.
        </p>
      </motion.div>
    </motion.section>
  );
}
