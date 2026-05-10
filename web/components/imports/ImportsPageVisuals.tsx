"use client";

import { motion, useReducedMotion } from "framer-motion";

const easeFlow = [0.23, 1, 0.32, 1] as const;

/** Hero mark: stacked data + import arrow - used at top of Imports page. */
export function ImportPageHeroIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 56 56"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <rect
        x="8"
        y="10"
        width="28"
        height="22"
        rx="3"
        className="stroke-[color:var(--accent)]"
        strokeWidth="2"
        fill="color-mix(in oklab, var(--accent-soft) 100%, transparent)"
      />
      <path
        d="M13 17h18M13 22h14M13 27h10"
        className="stroke-stone-400 dark:stroke-stone-500"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M38 32l8 8-8 8"
        className="stroke-[color:var(--accent)]"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <rect
        x="30"
        y="36"
        width="18"
        height="14"
        rx="2.5"
        className="stroke-[color:var(--accent)]"
        strokeWidth="2"
        fill="var(--surface-raised)"
      />
      <path d="M34 42h10M34 46h7" className="stroke-stone-400 dark:stroke-stone-500" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function IconCalendarImport({ className = "h-5 w-5 text-[color:var(--accent)]" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} aria-hidden>
      <rect x="3.5" y="5.5" width="17" height="16" rx="2" strokeLinecap="round" />
      <path d="M3.5 10.5h17M8.5 3.5v4M15.5 3.5v4" strokeLinecap="round" />
      <path d="M8 15h2.5M12.25 15h3.5M8 18.5h8" strokeLinecap="round" opacity={0.9} />
    </svg>
  );
}

export function IconOrderListSlot({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} aria-hidden>
      <path
        d="M5 4.5h14a1.5 1.5 0 011.5 1.5v13A1.5 1.5 0 0119 20.5H5A1.5 1.5 0 013.5 19V6A1.5 1.5 0 015 4.5z"
        strokeLinejoin="round"
      />
      <path d="M7.5 9h9M7.5 12.5h6M7.5 16h7" strokeLinecap="round" className="opacity-85" />
    </svg>
  );
}

export function IconSalesSummarySlot({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} aria-hidden>
      <path d="M4.5 18.5h15" strokeLinecap="round" />
      <path d="M7 18V11l3 3 3-5 4 6.5" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="14" y="5.5" width="5.5" height="4" rx="1" strokeLinejoin="round" />
    </svg>
  );
}

export function IconCloudUpload({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.65} aria-hidden>
      <path
        d="M7 18.25h-.5a4.25 4.25 0 010-8.5h.35a5.5 5.5 0 0110.75 1.7 3.25 3.25 0 013.4 3.1v.15a3.5 3.5 0 01-3.35 3.55H17"
        strokeLinejoin="round"
      />
      <path d="M12 15.25V8M9.5 10.75L12 8l2.5 2.75" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function IconCsvBadge({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.65} aria-hidden>
      <path
        d="M8.5 3.5h5.2L18.5 8.3V19a1.5 1.5 0 01-1.5 1.5H8.5A1.5 1.5 0 017 19V5A1.5 1.5 0 018.5 3.5z"
        strokeLinejoin="round"
      />
      <path d="M13.5 3.6V8H18" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M9.5 13h5M9.5 16h3" strokeLinecap="round" className="text-emerald-700 dark:text-emerald-400" stroke="currentColor" />
    </svg>
  );
}

/** Down arrow between import steps - subtle motion + “Next” cue. */
export function ImportsFlowArrow({
  caption = "Next step",
  showCaption = true,
}: {
  caption?: string;
  /** Set false for inline hints where the label would be redundant. */
  showCaption?: boolean;
}) {
  const reduceMotion = useReducedMotion();
  return (
    <div className="flex flex-col items-center gap-1 py-2" aria-hidden>
      {showCaption && caption ? (
        <span className="text-[0.625rem] font-semibold uppercase tracking-[0.14em] text-stone-500 dark:text-stone-400">
          {caption}
        </span>
      ) : null}
      <motion.div
        className="flex flex-col items-center text-[color:var(--accent)] drop-shadow-[0_2px_10px_color-mix(in_oklab,var(--accent)_35%,transparent)]"
        initial={false}
        animate={reduceMotion ? {} : { y: [0, 6, 0] }}
        transition={reduceMotion ? { duration: 0 } : { duration: 2.4, repeat: Infinity, ease: easeFlow }}
      >
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 5v14" />
          <path d="M7 14l5 5 5-5" />
        </svg>
      </motion.div>
    </div>
  );
}
