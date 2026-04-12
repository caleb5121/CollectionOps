"use client";

import Link from "next/link";

export function DashboardEmptyState() {
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white px-6 py-10 text-center shadow-sm dark:border-slate-700/70 dark:bg-slate-900/70 sm:px-12 sm:py-12">
      <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50 sm:text-3xl">No data yet</h2>
      <p className="mx-auto mt-3 max-w-md text-sm text-slate-600 dark:text-slate-300">
        Import your Order List and Sales Summary to see your numbers here.
      </p>
      <Link
        href="/data"
        className="mt-7 inline-flex items-center justify-center rounded-xl bg-[color:var(--accent)] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:opacity-95"
      >
        Import data
      </Link>
    </div>
  );
}
