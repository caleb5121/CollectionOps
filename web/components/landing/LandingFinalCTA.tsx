"use client";

import Link from "next/link";
import { motion } from "framer-motion";

type Tone = "dark" | "light";

type Props = { animate: boolean; tone?: Tone };

export default function LandingFinalCTA({ animate, tone = "dark" }: Props) {
  const light = tone === "light";
  const h2 = light ? "text-slate-900" : "text-white";
  const sub = light ? "text-slate-600" : "text-slate-400/95";
  const micro = light ? "text-slate-500" : "text-slate-500/90";

  return (
    <motion.section
      className="mx-auto flex w-full max-w-2xl flex-col items-center rounded-3xl border border-slate-200/90 bg-gradient-to-b from-white to-slate-50 px-4 py-9 text-center shadow-[0_22px_44px_-30px_rgba(15,23,42,0.32)] sm:max-w-3xl sm:px-8 sm:py-11"
      initial={animate ? { opacity: 0, y: 20 } : false}
      whileInView={animate ? { opacity: 1, y: 0 } : undefined}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      aria-labelledby="landing-final-cta-heading"
    >
      <h2
        id="landing-final-cta-heading"
        className={`text-balance text-2xl font-bold leading-tight tracking-tight sm:text-3xl sm:leading-snug lg:text-[2rem] ${h2}`}
      >
        See what your store actually looks like.
      </h2>
      <p
        className={`mx-auto mt-6 max-w-[min(100%,22rem)] text-sm leading-relaxed text-balance sm:mt-7 sm:max-w-xl sm:text-base lg:mt-8 lg:max-w-2xl lg:whitespace-nowrap ${sub}`}
      >
        Upload your exports and see clear, trackable progress in seconds.
      </p>
      <div className="mt-9 flex w-full flex-col items-center sm:mt-10 lg:mt-11">
        <Link
          href="/data?demo=1"
          className="inline-flex h-12 items-center justify-center rounded-xl bg-orange-500 px-10 text-base font-bold text-white shadow-[0_14px_36px_-12px_rgba(249,115,22,0.65)] transition duration-200 ease-out hover:-translate-y-0.5 hover:bg-orange-600 hover:shadow-[0_18px_40px_-14px_rgba(249,115,22,0.72)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-300/55 focus-visible:ring-offset-2 focus-visible:ring-offset-white active:translate-y-0 sm:h-[3.2rem] sm:px-12 sm:text-lg"
        >
          Try Demo
        </Link>
        <p
          className={`mx-auto mt-5 max-w-sm text-balance text-xs leading-relaxed sm:mt-6 sm:text-sm ${micro}`}
        >
          No signup required. Free to use right now.
        </p>
      </div>
    </motion.section>
  );
}
