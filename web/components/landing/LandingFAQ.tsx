"use client";

import { motion } from "framer-motion";
import { useState } from "react";

const easeOut = [0.23, 1, 0.32, 1] as const;

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

const leftAccent = [
  "border-l-[var(--warm-gold)]",
  "border-l-[color:var(--accent)]",
  "border-l-[color:var(--metric-neutral)]",
] as const;

type Props = { animate: boolean };

export default function LandingFAQ({ animate }: Props) {
  const [open, setOpen] = useState<Set<number>>(() => new Set());

  function toggle(i: number) {
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-0 sm:px-2">
      <motion.h2
        className="font-display text-center text-[2.25rem] font-bold leading-tight tracking-[-0.02em] text-[color:var(--landing-fg)]"
        initial={animate ? { opacity: 0, y: 12 } : false}
        whileInView={animate ? { opacity: 1, y: 0 } : undefined}
        viewport={{ once: true, margin: "-48px" }}
        transition={{ duration: 0.44, ease: easeOut }}
      >
        Things you&apos;re probably wondering
      </motion.h2>

      <ul className="mt-10 space-y-4 sm:mt-12" role="list">
        {faqItems.map((item, i) => {
          const isOpen = open.has(i);
          const accent = leftAccent[i % leftAccent.length];
          return (
            <motion.li
              key={item.q}
              className={`overflow-hidden rounded-xl border border-[color:color-mix(in_oklab,var(--border-warm)_70%,transparent)] border-l-[3px] bg-[var(--surface-raised)] shadow-[0_2px_12px_rgba(0,0,0,0.06)] transition-[box-shadow,transform] duration-200 ease-out ${accent} [@media(hover:hover)_and_(pointer:fine)]:hover:shadow-[0_6px_20px_rgba(0,0,0,0.08)]`}
              initial={animate ? { opacity: 0, y: 8 } : false}
              whileInView={animate ? { opacity: 1, y: 0 } : undefined}
              viewport={{ once: true, margin: "-20px" }}
              transition={{ duration: 0.38, delay: animate ? 0.05 + i * 0.06 : 0, ease: easeOut }}
            >
              <button
                type="button"
                onClick={() => toggle(i)}
                aria-expanded={isOpen}
                className="flex w-full items-start justify-between gap-4 px-4 py-4 text-left text-[color:var(--landing-fg)] transition-[color,background-color] duration-200 ease-out [@media(hover:hover)_and_(pointer:fine)]:hover:bg-[color:color-mix(in_oklab,var(--surface-muted)_75%,transparent)] [@media(hover:hover)_and_(pointer:fine)]:hover:text-[color:var(--accent)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent)]/35 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)] sm:px-5 sm:py-5"
              >
                <span className="text-[0.9375rem] font-semibold leading-snug sm:text-base">{item.q}</span>
                <span
                  className={`mt-0.5 inline-flex size-8 shrink-0 items-center justify-center rounded-lg border border-[color:color-mix(in_oklab,var(--border-warm),transparent)] bg-[var(--surface-muted)] transition-[transform,color,background-color,border-color] duration-200 ease-out ${
                    isOpen
                      ? "rotate-180 border-[color:color-mix(in_oklab,var(--accent)_35%,var(--border-warm))] bg-[color:var(--accent-soft)] text-[color:var(--accent)]"
                      : "text-[color:var(--landing-muted)]"
                  }`}
                  aria-hidden
                >
                  <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                    <path d="m6 9 6 6 6-6" />
                  </svg>
                </span>
              </button>
              <div
                className={`grid transition-[grid-template-rows] duration-200 ease-out motion-reduce:transition-none ${
                  isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                }`}
              >
                <div className="min-h-0 overflow-hidden">
                  <p className="landing-body-muted px-4 pb-4 pr-10 text-[0.9375rem] leading-[1.6] sm:px-5 sm:pb-5 sm:text-base">
                    {item.a}
                  </p>
                </div>
              </div>
            </motion.li>
          );
        })}
      </ul>
    </div>
  );
}
