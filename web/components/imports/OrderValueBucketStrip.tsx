"use client";

import type { OrderBuckets } from "../../lib/importsInsights";

const BAR_COLORS = [
  "bg-zinc-300 dark:bg-zinc-600",
  "bg-zinc-400 dark:bg-zinc-500",
  "bg-zinc-500 dark:bg-zinc-400",
  "bg-[color:var(--accent)]/80 dark:bg-[color:var(--accent)]/70",
];

export function OrderValueBucketStrip({ buckets, total }: { buckets: OrderBuckets; total: number }) {
  if (total <= 0) return null;

  const bands: { key: keyof OrderBuckets; label: string }[] = [
    { key: "under5", label: "Under $5" },
    { key: "fiveTo10", label: "$5–10" },
    { key: "tenTo20", label: "$10–20" },
    { key: "over20", label: "$20+" },
  ];

  return (
    <>
      <div
        className="mt-3 flex h-2 w-full overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800"
        role="img"
        aria-label="Order value distribution"
      >
        {bands.map(({ key, label }, i) => {
          const c = buckets[key];
          const pct = total > 0 ? (c / total) * 100 : 0;
          if (pct <= 0) return null;
          return (
            <div
              key={key}
              className={`h-full min-w-px ${BAR_COLORS[i] ?? "bg-zinc-400"}`}
              style={{ width: `${pct}%` }}
              title={`${label}: ${Math.round(pct)}%`}
            />
          );
        })}
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {bands.map(({ key, label }) => {
          const c = buckets[key];
          const pct = total > 0 ? Math.round((c / total) * 100) : 0;
          return (
            <div
              key={key}
              className="rounded-lg border border-zinc-200/90 bg-white px-3 py-2.5 text-center shadow-sm dark:border-zinc-800/75 dark:bg-zinc-900/50"
            >
              <div className="text-[0.625rem] font-medium uppercase tracking-[0.08em] text-zinc-500 dark:text-zinc-400">
                {label}
              </div>
              <div className="mt-1 text-sm font-semibold tabular-nums text-zinc-900 dark:text-zinc-50">{pct}%</div>
              <div className="text-[0.6875rem] tabular-nums text-zinc-500 dark:text-zinc-500">
                {c} order{c !== 1 ? "s" : ""}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
