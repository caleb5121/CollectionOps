"use client";

import { motion, useReducedMotion } from "framer-motion";
import Link from "next/link";
import { IconOrders, IconRevenue } from "../MetricIcons";

function formatCurrency(n: number | null | undefined) {
  if (n === null || n === undefined || Number.isNaN(n)) return "-";
  return n.toLocaleString(undefined, { style: "currency", currency: "USD" });
}

type Props = {
  estimatedNet: number | null | undefined;
  orders: number;
  avgNetPerOrder: number | null | undefined;
  workspaceLabel: string;
  reconciliationSynced: boolean | null;
  hasMismatch: boolean;
};

export function DashboardStickySummary({
  estimatedNet,
  orders,
  avgNetPerOrder,
  workspaceLabel,
  reconciliationSynced,
  hasMismatch,
}: Props) {
  const reduce = useReducedMotion();

  return (
    <motion.div
      className="sticky top-0 z-40 -mx-4 mb-4 border-b border-slate-200/80 bg-white/88 px-4 py-2.5 shadow-[0_8px_30px_-12px_rgba(15,23,42,0.12)] backdrop-blur-md dark:border-slate-700/60 dark:bg-slate-950/88 dark:shadow-[0_8px_30px_-12px_rgba(0,0,0,0.45)] sm:-mx-6 sm:px-6"
      initial={reduce ? false : { y: -6, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <div className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-1 text-[11px] sm:text-xs">
          <span className="inline-flex items-center gap-1.5 font-semibold text-slate-500 dark:text-slate-400">
            <IconRevenue className="h-3.5 w-3.5 text-[color:var(--accent)] opacity-90" aria-hidden />
            <span className="text-slate-600 dark:text-slate-300">Net</span>
            <span className="tabular-nums text-slate-900 dark:text-slate-50">{formatCurrency(estimatedNet)}</span>
          </span>
          <span className="hidden h-3 w-px bg-slate-200 dark:bg-slate-600 sm:block" aria-hidden />
          <span className="inline-flex items-center gap-1.5 font-semibold text-slate-500 dark:text-slate-400">
            <IconOrders className="h-3.5 w-3.5 text-[color:var(--accent)] opacity-90" aria-hidden />
            <span className="text-slate-600 dark:text-slate-300">Orders</span>
            <span className="tabular-nums text-slate-900 dark:text-slate-50">{orders}</span>
          </span>
          <span className="hidden h-3 w-px bg-slate-200 dark:bg-slate-600 sm:block" aria-hidden />
          <span className="font-semibold text-slate-500 dark:text-slate-400">
            Avg{" "}
            <span className="tabular-nums text-slate-900 dark:text-slate-50">{formatCurrency(avgNetPerOrder)}</span>
          </span>
          <span className="hidden h-3 w-px bg-slate-200 dark:bg-slate-600 md:block" aria-hidden />
          <span className="max-w-[10rem] truncate font-medium text-slate-600 dark:text-slate-300" title={workspaceLabel}>
            {workspaceLabel}
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {hasMismatch ? (
            <span className="rounded-full border border-amber-300/80 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-900 dark:border-amber-800/50 dark:bg-amber-950/50 dark:text-amber-100">
              Count mismatch
            </span>
          ) : reconciliationSynced ? (
            <span className="rounded-full border border-teal-300/70 bg-teal-50/90 px-2 py-0.5 text-[10px] font-semibold text-teal-900 dark:border-teal-800/45 dark:bg-teal-950/40 dark:text-teal-100">
              Counts aligned
            </span>
          ) : (
            <span className="rounded-full border border-slate-200/90 bg-white/90 px-2 py-0.5 text-[10px] font-semibold text-slate-600 dark:border-slate-600 dark:bg-slate-800/80 dark:text-slate-300">
              Ready
            </span>
          )}
          <Link
            href="/data"
            className="rounded-lg border border-slate-200/90 bg-white/90 px-2.5 py-1 text-[10px] font-semibold text-slate-700 shadow-sm transition-app hover:border-slate-300 hover:shadow dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200"
          >
            Imports
          </Link>
        </div>
      </div>
    </motion.div>
  );
}
