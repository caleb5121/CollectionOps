"use client";

import { motion } from "framer-motion";

const easeOut = [0.23, 1, 0.32, 1] as const;

/** Teal - profit / primary */
function IconSpreadsheet() {
  return (
    <svg className="h-10 w-10 shrink-0 text-[color:var(--accent)]" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M7 3h7l4 4v13a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M14 3v4h4" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <path d="M8 12h8M8 15h8M8 18h8" stroke="currentColor" strokeWidth={2} strokeLinecap="round" />
      <path d="M10 12v6M14 12v6" stroke="currentColor" strokeWidth={2} strokeLinecap="round" />
    </svg>
  );
}

/** Blue - trends / neutral insight */
function IconClock() {
  return (
    <svg className="h-10 w-10 shrink-0 text-[color:var(--metric-neutral)]" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth={2} />
      <path d="M12 7v5l3 2" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconSearch() {
  return (
    <svg className="h-10 w-10 shrink-0 text-[color:var(--accent)]" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth={2} />
      <path d="M21 21l-4.35-4.35" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const benefits = [
  {
    key: "profit",
    title: "See your real profit",
    description:
      "Not just what sold. What you actually kept after TCGplayer fees, stamps, envelopes, and toploaders.",
    Icon: IconSearch,
    iconWell: "bg-[color:var(--accent-soft)]",
  },
  {
    key: "track",
    title: "Track what is working",
    description:
      "Know which weeks were strong, which were slow, and what your average order is actually worth.",
    Icon: IconClock,
    iconWell: "bg-[color:var(--metric-neutral-soft)]",
  },
  {
    key: "spreadsheet",
    title: "Skip the spreadsheet",
    description: "Upload two CSVs from TCGplayer. Done. Your numbers are ready in seconds.",
    Icon: IconSpreadsheet,
    iconWell: "bg-[color:var(--metric-positive-soft)]",
  },
] as const;

type Props = { animate: boolean };

export default function LandingBenefits({ animate }: Props) {
  return (
    <motion.div
      className="mx-auto w-full max-w-5xl"
      initial={animate ? { opacity: 0, y: 14 } : false}
      whileInView={animate ? { opacity: 1, y: 0 } : undefined}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.48, ease: easeOut }}
    >
      <motion.p
        className="landing-body-muted text-center text-[0.8125rem] font-medium uppercase tracking-[0.08em]"
        initial={animate ? { opacity: 0, y: 8 } : false}
        whileInView={animate ? { opacity: 1, y: 0 } : undefined}
        viewport={{ once: true, margin: "-32px" }}
        transition={{ duration: 0.4, ease: easeOut }}
      >
        What you get
      </motion.p>
      <ul className="mt-10 grid grid-cols-1 gap-8 sm:mt-12 md:grid-cols-3 md:gap-6 lg:gap-8" role="list">
        {benefits.map(({ key, Icon, title, description, iconWell }, i) => (
          <motion.li
            key={key}
            className="flex flex-col rounded-[12px] border border-[color:color-mix(in_oklab,var(--border-warm)_65%,transparent)] bg-[var(--surface-raised)] p-8 shadow-[0_2px_12px_rgba(0,0,0,0.06)] transition-[transform,box-shadow] duration-200 ease-out [@media(hover:hover)_and_(pointer:fine)]:hover:-translate-y-1 [@media(hover:hover)_and_(pointer:fine)]:hover:shadow-[0_8px_24px_rgba(0,0,0,0.1)]"
            initial={animate ? { opacity: 0, y: 14 } : false}
            whileInView={animate ? { opacity: 1, y: 0 } : undefined}
            viewport={{ once: true, margin: "-24px" }}
            transition={{ duration: 0.42, delay: 0.06 + i * 0.07, ease: easeOut }}
          >
            <div
              className={`flex size-14 items-center justify-center rounded-xl border border-[color:color-mix(in_oklab,var(--border-warm)_50%,transparent)] ${iconWell}`}
            >
              <Icon />
            </div>
            <h3 className="mt-6 text-[1.125rem] font-semibold leading-snug tracking-[-0.01em] text-[color:var(--landing-fg)]">
              {title}
            </h3>
            <p className="landing-body-muted mt-3 max-w-[22rem] text-[0.9375rem] leading-[1.6] md:max-w-none">
              {description}
            </p>
          </motion.li>
        ))}
      </ul>
    </motion.div>
  );
}
