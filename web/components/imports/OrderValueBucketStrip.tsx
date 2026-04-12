"use client";

import type { OrderBuckets } from "../../lib/importsInsights";

const BAR_COLORS = [
  "bg-slate-300/90 dark:bg-slate-600/90",
  "bg-slate-400/90 dark:bg-slate-500/85",
  "bg-slate-500/85 dark:bg-slate-400/70",
  "bg-slate-600/90 dark:bg-slate-300/50",
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
        className="mt-3 flex h-2.5 w-full overflow-hidden rounded-full bg-slate-200/90 dark:bg-slate-800/90"
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
              className={`h-full min-w-px ${BAR_COLORS[i] ?? "bg-slate-400"}`}
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
            className="rounded-xl border border-slate-200/80 bg-white/90 px-3 py-2.5 text-center dark:border-slate-700/60 dark:bg-slate-900/50"
          >
            <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</div>
            <div className="mt-1 text-sm font-bold tabular-nums text-slate-900 dark:text-slate-50">{pct}%</div>
            <div className="text-[11px] tabular-nums text-slate-500 dark:text-slate-500">
              {c} order{c !== 1 ? "s" : ""}
            </div>
          </div>
        );
      })}
    </div>
    </>
  );
}
