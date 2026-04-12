/** Minimal inline icons for KPI rows - 20×20, currentColor. */

export function IconRevenue({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="currentColor" aria-hidden>
      <path d="M4 14V10h3v4H4zm5-6V4h3v4H9zm5 8v-6h3v6h-3z" />
    </svg>
  );
}

export function IconOrders({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none" stroke="currentColor" aria-hidden>
      <path
        strokeWidth={1.75}
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M5 7h10l-1 9H6L5 7zm2-3h6v3H7V4z"
      />
    </svg>
  );
}

export function IconCost({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none" stroke="currentColor" aria-hidden>
      <path
        strokeWidth={1.75}
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M6 5h8v2H6V5zm0 4h4v4H6V9zm0 6h8v2H6v-2zm8-4h-2v-2h2v2z"
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
