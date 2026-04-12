"use client";

import { useMemo } from "react";
import { motion, useReducedMotion } from "framer-motion";
import PageShell from "../../../components/PageShell";
import { Reveal } from "../../../components/motion/Reveal";
import { AnimatedCurrency } from "../../../components/motion/AnimatedNumber";
import { IconCost, IconOrders, IconRevenue } from "../../../components/MetricIcons";
import { useData } from "../../../components/DataProvider";
import { toNumberLooseCell } from "../../../lib/orderListColumnMap";
import {
  aggregateWorkspaceDateRange,
  formatDashboardViewingDateRangeLabel,
} from "../../../lib/importMetadata";
import { DashboardEmptyState } from "../../../components/dashboard/DashboardEmptyState";
import AiInsightsHeaderButton from "../../../components/dashboard/AiInsightsHeaderButton";

function formatCurrency(n: number | null | undefined) {
  if (n === null || n === undefined || Number.isNaN(n)) return "-";
  return n.toLocaleString(undefined, { style: "currency", currency: "USD" });
}

export default function DashboardPage() {
  const {
    hasDashboardImport,
    hasOrderImport,
    derived,
    orderData,
    orderColumnMap,
    estimatedNet,
    costsForNetDisplay,
    effectiveOrderImports,
    effectiveSummaryImports,
  } = useData();

  const reduceMotion = useReducedMotion();
  const workspaceEmpty = !hasOrderImport && !hasDashboardImport;

  const itemsSold = useMemo(() => {
    if (!orderData?.rows.length || !orderColumnMap?.ok) return null;
    const k = orderColumnMap.itemCountKey;
    if (!k) return null;
    let s = 0;
    for (const r of orderData.rows) s += toNumberLooseCell(r[k]);
    return s;
  }, [orderData, orderColumnMap]);

  const workspaceDateRange = useMemo(
    () => aggregateWorkspaceDateRange(effectiveOrderImports, effectiveSummaryImports),
    [effectiveOrderImports, effectiveSummaryImports],
  );
  const dashboardDateRangeLabel = workspaceDateRange
    ? formatDashboardViewingDateRangeLabel(workspaceDateRange.from, workspaceDateRange.to)
    : "No import date range available";

  if (workspaceEmpty) {
    return (
      <PageShell maxWidth="wide-xl">
        <DashboardEmptyState />
      </PageShell>
    );
  }

  const totalEarned = estimatedNet;

  return (
    <PageShell maxWidth="wide-xl" action={<AiInsightsHeaderButton />}>
      <section className="space-y-8 sm:space-y-10" aria-labelledby="dashboard-hero-heading">
        <h1 id="dashboard-hero-heading" className="sr-only">
          Dashboard summary
        </h1>

        <Reveal>
          <motion.div
            className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 px-6 py-8 text-white shadow-xl ring-1 ring-white/10 sm:px-10 sm:py-10"
            initial={reduceMotion ? false : { opacity: 0.92, scale: 0.985 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          >
            <div
              className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_20%_0%,rgba(45,212,191,0.12),transparent_55%)]"
              aria-hidden
            />
            <div className="relative max-w-2xl">
              <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">Total Earned</h2>
              <p className="mt-1 text-sm text-white/65">From imported sales data</p>
              <p className="text-sm text-white/55">After fees and estimated shipping</p>
              <p
                data-testid="dashboard-date-range-label"
                className={`mt-3 text-sm leading-snug sm:text-[0.9375rem] ${
                  workspaceDateRange
                    ? "font-medium text-teal-100/95"
                    : "font-normal text-white/50"
                }`}
              >
                {dashboardDateRangeLabel}
              </p>
              <p
                data-testid="dashboard-total-earned"
                className="mt-4 text-4xl font-bold tabular-nums tracking-tight sm:text-5xl"
              >
                {totalEarned != null ? <AnimatedCurrency value={totalEarned} /> : formatCurrency(null)}
              </p>
              <p className="mt-3 text-[11px] font-medium text-white/40">Based on your latest import</p>
            </div>
          </motion.div>
        </Reveal>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="app-panel-3d rounded-2xl border border-slate-200/85 bg-white/96 p-5 dark:border-slate-700/75 dark:bg-slate-900/82">
            <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
              <IconRevenue className="h-4 w-4 shrink-0 text-[color:var(--accent)]" aria-hidden />
              You sold
            </p>
            <p className="mt-2 text-2xl font-bold tabular-nums tracking-tight text-slate-900 dark:text-slate-50">
              {itemsSold != null ? `${itemsSold.toLocaleString()} items` : formatCurrency(derived.grossSales)}
            </p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {itemsSold != null ? "Items sold" : "Gross sales"}
            </p>
          </div>
          <div className="app-panel-3d rounded-2xl border border-slate-200/85 bg-white/96 p-5 dark:border-slate-700/75 dark:bg-slate-900/82">
            <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
              <IconOrders className="h-4 w-4 shrink-0 text-[color:var(--accent)]" aria-hidden />
              Orders
            </p>
            <p
              data-testid="dashboard-orders-count"
              className="mt-2 text-2xl font-bold tabular-nums tracking-tight text-slate-900 dark:text-slate-50"
            >
              {derived.orders.toLocaleString()}
            </p>
          </div>
          <div className="app-panel-3d rounded-2xl border border-slate-200/85 bg-white/96 p-5 dark:border-slate-700/75 dark:bg-slate-900/82">
            <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
              <IconCost className="h-4 w-4 shrink-0 text-[color:var(--accent)]" aria-hidden />
              Costs
            </p>
            <p className="mt-2 text-2xl font-bold tabular-nums tracking-tight text-slate-900 dark:text-slate-50">
              {formatCurrency(costsForNetDisplay)}
            </p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Fees + shipping</p>
          </div>
        </div>
      </section>
    </PageShell>
  );
}
