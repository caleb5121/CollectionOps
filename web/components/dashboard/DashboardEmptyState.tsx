"use client";

import Link from "next/link";
import { IconCost, IconOrders, IconRevenue } from "../MetricIcons";

export function DashboardEmptyState() {
  return (
    <div className="rounded-xl border border-slate-200/80 bg-white px-5 py-6 shadow-sm dark:border-slate-700/70 dark:bg-slate-900/70 sm:px-6 sm:py-7">
      <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50 sm:text-3xl">
        Your store snapshot starts here
      </h2>
      <p className="mt-2 max-w-lg text-sm leading-relaxed text-slate-500 dark:text-slate-400">
        Import your Order List and Sales Summary to unlock profit, fees, shipping, and store trends.
      </p>
      <Link
        href="/data"
        className="mt-5 inline-flex items-center justify-center rounded-xl bg-[color:var(--accent)] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:opacity-95"
      >
        Import data
      </Link>
      <p className="mt-2 text-xs text-slate-500 dark:text-slate-500">Takes about a minute</p>

      <div
        className="mt-5 grid grid-cols-3 gap-3 border-t border-slate-100 pt-4 dark:border-slate-800/80 sm:gap-4"
        aria-hidden
      >
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-600">
            <IconRevenue className="h-3 w-3 shrink-0 opacity-70" />
            Total earned
          </p>
          <p className="mt-1 text-sm tabular-nums text-slate-300 dark:text-slate-600">—</p>
        </div>
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-600">
            <IconOrders className="h-3 w-3 shrink-0 opacity-70" />
            Orders
          </p>
          <p className="mt-1 text-sm tabular-nums text-slate-300 dark:text-slate-600">—</p>
        </div>
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-600">
            <IconCost className="h-3 w-3 shrink-0 opacity-70" />
            Costs
          </p>
          <p className="mt-1 text-sm tabular-nums text-slate-300 dark:text-slate-600">—</p>
        </div>
      </div>
    </div>
  );
}
