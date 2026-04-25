"use client";

import { motion } from "framer-motion";
import { useState } from "react";

const easeOut = [0.22, 1, 0.36, 1] as const;

const faqItems = [
  {
    q: "Do I need to change how I run my store?",
    a: "No. You use your existing TCGplayer exports. Just upload them and CollectionOps handles the rest.",
  },
  {
    q: "Is this replacing my spreadsheets?",
    a: "No. It works with them. CollectionOps removes the tedious sorting, calculating, and figuring things out.",
  },
  {
    q: "Do I need to sign up to try it?",
    a: "No. You can try the demo instantly without creating an account.",
  },
  {
    q: "Is my data safe?",
    a: "Yes. Your data is not shared and is only used to generate your insights.",
  },
  {
    q: "How much does it cost?",
    a: "It's free to use right now. I built this to solve the same problem I had and want to make sure it actually helps.",
  },
] as const;

type Tone = "dark" | "light";

type Props = { animate: boolean; tone?: Tone };

export default function LandingFAQ({ animate, tone = "dark" }: Props) {
  const [open, setOpen] = useState<Set<number>>(() => new Set());
  const light = tone === "light";

  function toggle(i: number) {
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  }

  const heading = light ? "text-slate-900" : "text-white";
  const qText = light
    ? "text-slate-800 hover:text-teal-800 hover:translate-x-0.5"
    : "text-white hover:text-cyan-100/95 hover:translate-x-0.5";
  const chevron = light ? "text-slate-500" : "text-slate-400";
  const chevronOpen = light ? "text-teal-700" : "text-cyan-200/90";
  const answer = light ? "text-slate-600" : "text-slate-400/95";
  const ring = light ? "focus-visible:ring-teal-600/30 focus-visible:ring-offset-white" : "focus-visible:ring-cyan-400/35 focus-visible:ring-offset-transparent";
  const rowBorder = light ? "border-b border-slate-200/90 first:border-t first:border-slate-200/90" : "border-b border-white/[0.08] first:border-t first:border-white/[0.08]";

  return (
    <motion.div
      className="mx-auto w-full max-w-2xl px-0 sm:px-2"
      initial={animate ? { opacity: 0, y: 16 } : false}
      whileInView={animate ? { opacity: 1, y: 0 } : undefined}
      viewport={{ once: true, margin: "-48px" }}
      transition={{ duration: 0.45, ease: easeOut }}
    >
      <h2 className={`text-center text-2xl font-bold tracking-tight sm:text-3xl ${heading}`}>
        Things you&apos;re probably wondering
      </h2>

      <ul className="mt-10 space-y-0 rounded-2xl border border-slate-200/90 bg-white/75 px-3 shadow-[0_16px_36px_-24px_rgba(15,23,42,0.28)] backdrop-blur-sm sm:mt-12 sm:px-5" role="list">
        {faqItems.map((item, i) => {
          const isOpen = open.has(i);
          return (
            <li key={item.q} className={rowBorder}>
              <button
                type="button"
                onClick={() => toggle(i)}
                aria-expanded={isOpen}
                className={`flex w-full items-start justify-between gap-4 py-4 text-left transition-all duration-200 ease-out ${qText} focus:outline-none focus-visible:ring-2 ${ring} focus-visible:ring-offset-2 sm:py-5`}
              >
                <span className="text-[0.95rem] font-semibold leading-snug sm:text-base">{item.q}</span>
                <span
                  className={`mt-0.5 inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-slate-100/80 transition-all duration-300 ease-out ${
                    isOpen ? `rotate-180 ${chevronOpen}` : chevron
                  }`}
                  aria-hidden
                >
                  <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                    <path d="m6 9 6 6 6-6" />
                  </svg>
                </span>
              </button>
              <div
                className={`grid transition-[grid-template-rows] duration-300 ease-out motion-reduce:transition-none ${
                  isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                }`}
              >
                <div className="min-h-0 overflow-hidden">
                  <p className={`pb-4 pr-10 text-sm leading-relaxed sm:pb-5 sm:text-[0.9375rem] sm:leading-relaxed ${answer}`}>{item.a}</p>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </motion.div>
  );
}
