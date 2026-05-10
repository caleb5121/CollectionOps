"use client";

import Link from "next/link";
import { IconCost, IconOrders, IconRevenue } from "../MetricIcons";

export function DashboardEmptyState() {
  return (
    <div className="app-premium-card relative overflow-hidden px-7 py-10 sm:px-10 sm:py-12 dark:border-stone-700/65 dark:bg-stone-900/50">
      <div
        className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full opacity-[0.55] dark:opacity-40"
        style={{
          background: "radial-gradient(circle at 30% 30%, color-mix(in oklab, var(--accent) 35%, transparent), transparent 70%)",
        }}
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -bottom-24 -left-12 h-48 w-48 rounded-full opacity-45 dark:opacity-30"
        style={{
          background: "radial-gradient(circle at 60% 60%, color-mix(in oklab, var(--warm-gold) 40%, transparent), transparent 68%)",
        }}
        aria-hidden
      />
      <div className="relative z-[1]">
        <h2 className="font-display text-xl font-semibold tracking-[-0.02em] text-[color:var(--foreground)] sm:text-2xl">
          Your store snapshot starts here
        </h2>
        <p className="mt-4 max-w-lg text-[0.9375rem] font-normal leading-[1.65] text-[color:var(--foreground-muted)]">
          Import your Order List and Sales Summary to unlock profit, fees, shipping, and store trends.
        </p>
        <Link
          href="/data"
          className="mt-8 inline-flex items-center justify-center rounded-[var(--radius-button)] border border-[color:color-mix(in_oklab,var(--cta-orange)_35%,transparent)] bg-[color:var(--cta-orange)] px-6 py-3 text-sm font-semibold text-white shadow-[0_2px_8px_-2px_rgba(234,88,12,0.4),0_8px_22px_-8px_rgba(234,88,12,0.25)] transition-[transform,background-color,box-shadow] duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] hover:bg-[color:var(--cta-orange-hover)] hover:shadow-[0_4px_14px_-4px_rgba(234,88,12,0.45)] active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--cta-orange)]/40 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface-raised)] dark:shadow-orange-950/40"
        >
          Import data
        </Link>
        <p className="mt-2 text-[0.8125rem] font-medium text-[color:var(--foreground-muted)]">Takes about a minute</p>

        <div
          className="mt-10 grid grid-cols-3 gap-4 border-t border-[color:color-mix(in_oklab,var(--border-warm)_75%,transparent)] pt-8 dark:border-stone-800/80 sm:gap-6"
          aria-hidden
        >
          {[
            { Icon: IconRevenue, label: "Total earned" },
            { Icon: IconOrders, label: "Orders" },
            { Icon: IconCost, label: "Costs" },
          ].map(({ Icon, label }) => (
            <div key={label} className="min-w-0">
              <p className="flex items-center gap-1.5 text-[0.625rem] font-semibold uppercase tracking-[0.12em] text-[color:var(--foreground-muted)]">
                <Icon className="h-3 w-3 shrink-0 opacity-80" />
                {label}
              </p>
                <div className="mt-3 space-y-2">
                <div className="h-2.5 w-[70%] max-w-[5.5rem] animate-pulse rounded-full bg-[color:color-mix(in_oklab,var(--border-warm)_55%,transparent)] motion-reduce:animate-none dark:bg-stone-700/80" />
                <div className="h-2.5 w-[45%] max-w-[3.5rem] animate-pulse rounded-full bg-[color:color-mix(in_oklab,var(--border-warm)_40%,transparent)] motion-reduce:animate-none dark:bg-stone-800/90" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
