"use client";

import { motion } from "framer-motion";

const easeOut = [0.22, 1, 0.36, 1] as const;

type Tone = "hero" | "band";

const iconTone: Record<Tone, string> = {
  hero: "h-11 w-11 shrink-0 text-cyan-200/95",
  band: "h-11 w-11 shrink-0 text-teal-700/90",
};

/** Document with folded corner and grid — spreadsheet-style. */
function IconSpreadsheet({ tone }: { tone: Tone }) {
  const iconClass = iconTone[tone];
  return (
    <svg className={iconClass} viewBox="0 0 24 24" fill="none" aria-hidden>
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

function IconClock({ tone }: { tone: Tone }) {
  const iconClass = iconTone[tone];
  return (
    <svg className={iconClass} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth={2} />
      <path d="M12 7v5l3 2" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconSearch({ tone }: { tone: Tone }) {
  const iconClass = iconTone[tone];
  return (
    <svg className={iconClass} viewBox="0 0 24 24" fill="none" aria-hidden>
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
  },
  {
    key: "track",
    title: "Track what is working",
    description:
      "Know which weeks were strong, which were slow, and what your average order is actually worth.",
    Icon: IconClock,
  },
  {
    key: "spreadsheet",
    title: "Skip the spreadsheet",
    description: "Upload two CSVs from TCGplayer. Done. Your numbers are ready in seconds.",
    Icon: IconSpreadsheet,
  },
] as const;

type Props = { animate: boolean; tone?: Tone };

export default function LandingBenefits({ animate, tone = "hero" }: Props) {
  const isBand = tone === "band";
  const titleClass = isBand
    ? "text-center text-xs font-semibold uppercase tracking-[0.14em] text-teal-800/80"
    : "text-center text-xs font-semibold uppercase tracking-[0.14em] text-cyan-200/85";
  const h3Class = isBand
    ? "text-base font-semibold leading-snug tracking-tight text-slate-900 sm:text-[1.05rem]"
    : "text-base font-semibold leading-snug tracking-tight text-white sm:text-[1.05rem]";
  const descClass = isBand
    ? "mt-2.5 max-w-[22rem] text-sm leading-relaxed text-slate-600 md:max-w-none"
    : "mt-2.5 max-w-[22rem] text-sm leading-relaxed text-slate-400/95 md:max-w-none";

  return (
    <motion.div
      className="mx-auto w-full max-w-5xl"
      initial={animate ? { opacity: 0, y: 16 } : false}
      whileInView={animate ? { opacity: 1, y: 0 } : undefined}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.5, ease: easeOut }}
    >
      <p className={titleClass}>Why it helps</p>
      <ul className="mt-10 grid grid-cols-1 gap-10 sm:mt-12 sm:gap-12 md:grid-cols-3 md:gap-8 lg:gap-10" role="list">
        {benefits.map(({ key, Icon, title, description }, i) => (
          <motion.li
            key={key}
            className="flex flex-col items-center text-center"
            initial={animate ? { opacity: 0, y: 12 } : false}
            whileInView={animate ? { opacity: 1, y: 0 } : undefined}
            viewport={{ once: true, margin: "-24px" }}
            transition={{ duration: 0.4, delay: i * 0.06, ease: easeOut }}
          >
            <div className="mb-4 flex size-14 items-center justify-center rounded-2xl border border-teal-900/10 bg-white/75 shadow-[0_8px_20px_-12px_rgba(15,23,42,0.3)] md:mb-4">
              <Icon tone={tone} />
            </div>
            <h3 className={h3Class}>{title}</h3>
            <p className={descClass}>{description}</p>
          </motion.li>
        ))}
      </ul>
    </motion.div>
  );
}
