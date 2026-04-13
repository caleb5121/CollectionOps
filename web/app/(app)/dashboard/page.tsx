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

function buildHeroComparisonLine(params: {
  gross: number;
  estimatedNet: number | null;
  costsForNet: number | null;
}): string {
  const { gross, estimatedNet, costsForNet } = params;
  if (gross > 0 && estimatedNet != null && Number.isFinite(estimatedNet)) {
    const keep = (estimatedNet / gross) * 100;
    if (keep >= -5 && keep <= 100) {
      return `You keep about ${keep.toFixed(0)}% of gross after costs in this range.`;
    }
  }
  if (gross > 0 && costsForNet != null && costsForNet > 0) {
    const pct = (costsForNet / gross) * 100;
    const band = pct < 26 ? "a lean slice" : pct < 40 ? "typical for marketplace sellers" : "a large share of gross";
    return `Costs are ${pct.toFixed(1)}% of gross — ${band}.`;
  }
  return "Snapshot from your current import — add another period later to compare.";
}

function buildQuickTake(params: {
  gross: number;
  costsForNet: number | null;
  aov: number | null;
  orders: number;
}): string {
  const { gross, costsForNet, aov, orders } = params;
  if (gross > 0 && costsForNet != null) {
    const cPct = (costsForNet / gross) * 100;
    if (aov != null && aov < 15 && cPct < 38 && orders >= 3) {
      return "Costs look under control, but average order value is on the low side — worth watching basket size.";
    }
    if (cPct >= 40) {
      return "Costs are taking a large share of gross — double-check fees and shipping settings before you change prices.";
    }
    if (aov != null && aov >= 28) {
      return "Basket sizes look healthy; keep cost ratio steady as volume grows.";
    }
    if (cPct < 30) {
      return "Cost structure looks efficient for this import window.";
    }
  }
  return "Numbers are in — open View insights for a deeper read on fees, baskets, and net.";
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

  const heroComparison = useMemo(
    () =>
      buildHeroComparisonLine({
        gross: derived.grossSales,
        estimatedNet,
        costsForNet: costsForNetDisplay,
      }),
    [derived.grossSales, estimatedNet, costsForNetDisplay],
  );

  const quickTake = useMemo(
    () =>
      buildQuickTake({
        gross: derived.grossSales,
        costsForNet: costsForNetDisplay,
        aov: derived.aov,
        orders: derived.orders,
      }),
    [derived.grossSales, costsForNetDisplay, derived.aov, derived.orders],
  );

  if (workspaceEmpty) {
    return (
      <PageShell maxWidth="wide-xl" contentClassName="px-6 pt-4 pb-5 sm:px-8 sm:pt-5 sm:pb-6 lg:px-10">
        <DashboardEmptyState />
      </PageShell>
    );
  }

  const totalEarned = estimatedNet;

  return (
    <PageShell
      maxWidth="wide-xl"
      contentClassName="px-6 pt-4 pb-6 sm:px-8 sm:pt-5 sm:pb-8 lg:px-10"
    >
      <section className="flex flex-col gap-6 sm:gap-8" aria-labelledby="dashboard-hero-heading">
        <h1 id="dashboard-hero-heading" className="sr-only">
          Dashboard summary
        </h1>

        <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-slate-50/40 shadow-sm dark:border-slate-700/70 dark:bg-slate-900/35 dark:shadow-[0_1px_0_rgba(255,255,255,0.04)_inset]">
          <Reveal>
            <motion.div
              className="relative overflow-hidden border-b border-white/10 bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 px-5 py-5 text-white sm:px-7 sm:py-6"
              initial={reduceMotion ? false : { opacity: 0.92, scale: 0.985 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
            >
              <div
                className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_20%_0%,rgba(45,212,191,0.12),transparent_55%)]"
                aria-hidden
              />
              <div className="relative flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                <div className="min-w-0 flex-1">
                  <h2 className="text-xl font-bold tracking-tight text-white sm:text-2xl">Total Earned</h2>
                  <p className="mt-1 text-xs text-white/60 sm:text-sm">After fees and estimated shipping · from imported sales</p>
                  <p
                    data-testid="dashboard-date-range-label"
                    className={`mt-1.5 text-xs font-medium leading-snug sm:text-sm ${
                      workspaceDateRange ? "text-teal-100/90" : "text-white/45"
                    }`}
                  >
                    {dashboardDateRangeLabel}
                  </p>
                  <p
                    data-testid="dashboard-total-earned"
                    className="mt-2.5 text-3xl font-bold tabular-nums tracking-tight sm:mt-3 sm:text-4xl"
                  >
                    {totalEarned != null ? <AnimatedCurrency value={totalEarned} /> : formatCurrency(null)}
                  </p>
                  <p className="mt-1.5 max-w-md text-xs leading-snug text-white/55 sm:mt-2 sm:text-sm">{heroComparison}</p>
                </div>
                <div className="flex shrink-0 sm:pt-0.5">
                  <AiInsightsHeaderButton variant="hero" />
                </div>
              </div>
            </motion.div>
          </Reveal>

          <div className="bg-slate-50/95 px-2.5 py-2 dark:bg-slate-950/55 sm:px-3 sm:py-2.5">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 sm:gap-2.5">
              <div className="app-panel-3d rounded-lg border border-slate-200/90 bg-white/98 p-3.5 dark:border-slate-700/70 dark:bg-slate-900/88 sm:p-4">
                <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
                  <IconRevenue className="h-4 w-4 shrink-0 text-[color:var(--accent)]" aria-hidden />
                  You sold
                </p>
                <p className="mt-1.5 text-xl font-bold tabular-nums tracking-tight text-slate-900 dark:text-slate-50 sm:text-2xl">
                  {itemsSold != null ? `${itemsSold.toLocaleString()} items` : formatCurrency(derived.grossSales)}
                </p>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  {itemsSold != null ? "Items sold" : "Gross sales"}
                </p>
              </div>
              <div className="app-panel-3d rounded-lg border border-slate-200/90 bg-white/98 p-3.5 dark:border-slate-700/70 dark:bg-slate-900/88 sm:p-4">
                <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
                  <IconOrders className="h-4 w-4 shrink-0 text-[color:var(--accent)]" aria-hidden />
                  Orders
                </p>
                <p
                  data-testid="dashboard-orders-count"
                  className="mt-1.5 text-xl font-bold tabular-nums tracking-tight text-slate-900 dark:text-slate-50 sm:text-2xl"
                >
                  {derived.orders.toLocaleString()}
                </p>
              </div>
              <div className="app-panel-3d rounded-lg border border-slate-200/90 bg-white/98 p-3.5 dark:border-slate-700/70 dark:bg-slate-900/88 sm:p-4">
                <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
                  <IconCost className="h-4 w-4 shrink-0 text-[color:var(--accent)]" aria-hidden />
                  Costs
                </p>
                <p className="mt-1.5 text-xl font-bold tabular-nums tracking-tight text-slate-900 dark:text-slate-50 sm:text-2xl">
                  {formatCurrency(costsForNetDisplay)}
                </p>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Fees + shipping</p>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200/80 bg-slate-50/80 px-4 py-3 dark:border-slate-700/60 dark:bg-slate-900/50 sm:px-5 sm:py-3.5">
          <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">Quick take</p>
          <p className="mt-1 text-sm leading-relaxed text-slate-700 dark:text-slate-200">{quickTake}</p>
        </div>
      </section>
    </PageShell>
  );
}
