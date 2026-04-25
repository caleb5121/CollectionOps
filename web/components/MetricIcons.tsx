/** Minimal inline icons for KPI rows - 20×20, currentColor. */

/** Sales / “You sold” — small trend line + arrow up. */
export function IconRevenue({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none" stroke="currentColor" aria-hidden>
      <path
        strokeWidth={1.75}
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3.5 14.5L7.5 10l3 2.5L15.5 5"
      />
      <path
        strokeWidth={1.75}
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12.5 5h3v3"
      />
    </svg>
  );
}

/** Orders — envelope. */
export function IconOrders({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none" stroke="currentColor" aria-hidden>
      <path
        strokeWidth={1.75}
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3.5 7.5L10 12l6.5-4.5V15.5H3.5V7.5z"
      />
    </svg>
  );
}

/** Costs / fees — dollar bill. */
export function IconCost({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none" stroke="currentColor" aria-hidden>
      <path
        strokeWidth={1.75}
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M5 6.5h10a1 1 0 011 1v5a1 1 0 01-1 1H5a1 1 0 01-1-1v-5a1 1 0 011-1z"
      />
      {/* simple $ */}
      <path
        strokeWidth={1.85}
        strokeLinecap="round"
        d="M10 7.5v5M8.35 9.2c.35-.45 1-.7 1.65-.7s1.3.25 1.65.7.35 1-.05 1.45-.75.75-1.6.75-1.35.25-1.35.75.35.55 1.05.8 1.65.8s1.3-.25 1.65-.7"
      />
    </svg>
  );
}

/** Net / profit - subtle chart check */
export function IconNet({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none" stroke="currentColor" aria-hidden>
      <path strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" d="M4 14l4-8 4 5 4-6" />
      <path strokeWidth={1.75} strokeLinecap="round" d="M4 17h12" />
    </svg>
  );
}

export function IconShipping({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none" stroke="currentColor" aria-hidden>
      <path
        strokeWidth={1.75}
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3.5 13h2.5l1.5-6h7l1.2 4H6.5M14 11h2l1.5 2.5V16H14M5 16h1.5a1.5 1.5 0 003 0H14"
      />
    </svg>
  );
}

export function IconTrend({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none" stroke="currentColor" aria-hidden>
      <path strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" d="M3 16V4m0 0l4 4m-4-4l4-4m10 12v-6l-3 3-3-3-4 4" />
    </svg>
  );
}
