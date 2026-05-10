"use client";

import Link from "next/link";
import { IconCost, IconOrders, IconRevenue } from "../MetricIcons";

export function DashboardEmptyState() {
  return (
    <div className="app-premium-card px-7 py-9 sm:px-10 sm:py-10 dark:border-stone-700/65 dark:bg-stone-900/50 dark:shadow-[0_16px_48px_-20px_rgba(0,0,0,0.45)]">
      <h2 className="font-display text-xl font-semibold tracking-tight text-[color:var(--foreground)] sm:text-2xl">
        Your store snapshot starts here
      </h2>
      <p className="mt-4 max-w-lg text-[0.9375rem] leading-relaxed text-[color:var(--foreground-muted)]">
        Import your Order List and Sales Summary to unlock profit, fees, shipping, and store trends.
      </p>
      <Link
        href="/data"
        className="mt-7 inline-flex items-center justify-center rounded-[var(--radius-button)] border border-[color:color-mix(in_oklab,var(--cta-orange)_40%,transparent)] bg-[color:var(--cta-orange)] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_2px_10px_-4px_rgba(234,88,12,0.45)] transition-[transform,background-color,box-shadow] duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] hover:bg-[color:var(--cta-orange-hover)] active:scale-[0.97] dark:shadow-orange-950/40"
      >
        Import data
      </Link>
      <p className="mt-2 text-[0.8125rem] text-zinc-500 dark:text-zinc-500">Takes about a minute</p>

      <div
        className="mt-8 grid grid-cols-3 gap-4 border-t border-stone-200/80 pt-6 dark:border-stone-800/80 sm:gap-5"
        aria-hidden
      >
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-[0.625rem] font-medium uppercase tracking-[0.1em] text-zinc-400 dark:text-zinc-600">
            <IconRevenue className="h-3 w-3 shrink-0 opacity-70" />
            Total earned
          </p>
          <p className="mt-1.5 text-sm tabular-nums text-zinc-300 dark:text-zinc-600"> - </p>
        </div>
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-[0.625rem] font-medium uppercase tracking-[0.1em] text-zinc-400 dark:text-zinc-600">
            <IconOrders className="h-3 w-3 shrink-0 opacity-70" />
            Orders
          </p>
          <p className="mt-1.5 text-sm tabular-nums text-zinc-300 dark:text-zinc-600"> - </p>
        </div>
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-[0.625rem] font-medium uppercase tracking-[0.1em] text-zinc-400 dark:text-zinc-600">
            <IconCost className="h-3 w-3 shrink-0 opacity-70" />
            Costs
          </p>
          <p className="mt-1.5 text-sm tabular-nums text-zinc-300 dark:text-zinc-600"> - </p>
        </div>
      </div>
    </div>
  );
}
