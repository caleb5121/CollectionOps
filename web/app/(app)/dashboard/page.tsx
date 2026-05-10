"use client";

import { useEffect, useMemo, useState } from "react";
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
  formatImportMonthYear,
} from "../../../lib/importMetadata";
import { buildDailyTrendPointsFromTrendsSegments } from "../../../lib/trendsSeriesFromImports";
import { DashboardEmptyState } from "../../../components/dashboard/DashboardEmptyState";
import DashboardRevenueChart from "../../../components/dashboard/DashboardRevenueChart";
import AiInsightsModal from "../../../components/dashboard/AiInsightsModal";
import { canRequestAiInsights } from "../../../lib/aiInsightsSummary";
import { useAuth } from "../../../components/AuthProvider";
import { fetchCurrentUserStoreData, type UserStoreDataRow } from "../../../lib/supabase/userStoreData";

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
    return `Costs are ${pct.toFixed(1)}% of gross, ${band}.`;
  }
  return "Snapshot from your current import. Add another period later to compare.";
}

/** Same band as hero comparison line - when present, show a dedicated profitability card. */
function keepRateFromGrossNet(gross: number, net: number | null): number | null {
  if (gross <= 0 || net == null || !Number.isFinite(net)) return null;
  const keep = (net / gross) * 100;
  if (keep < -5 || keep > 100) return null;
  return Math.round(keep);
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
      return "Costs look under control, but average order value is on the low side. Worth watching basket size.";
    }
    if (cPct >= 40) {
      return "Costs are taking a large share of gross. Double-check fees and shipping settings before you change prices.";
    }
    if (aov != null && aov >= 28) {
      return "Basket sizes look healthy; keep cost ratio steady as volume grows.";
    }
    if (cPct < 30) {
      return "Cost structure looks efficient for this import window.";
    }
  }
  return "Numbers are in - check Store insights below for fees, baskets, and net.";
}

export default function DashboardPage() {
  const { user } = useAuth();
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
    lastImportDate,
    lastImportBatch,
  } = useData();
  const [savedStoreData, setSavedStoreData] = useState<UserStoreDataRow | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!user) {
      setSavedStoreData(null);
      return;
    }
    void fetchCurrentUserStoreData().then((row) => {
      if (!cancelled) setSavedStoreData(row);
    });
    return () => {
      cancelled = true;
    };
  }, [user]);

  const reduceMotion = useReducedMotion();
  const workspaceEmpty = !hasOrderImport && !hasDashboardImport && !savedStoreData;

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

  const dashboardDailyRevenue = useMemo(
    () =>
      buildDailyTrendPointsFromTrendsSegments([
        { orderImports: effectiveOrderImports, summaryImports: effectiveSummaryImports },
      ]),
    [effectiveOrderImports, effectiveSummaryImports],
  );

  const heroImportPeriodLabel = useMemo(() => {
    if (workspaceDateRange) return dashboardDateRangeLabel;
    if (savedStoreData) {
      const anchor = lastImportDate ?? lastImportBatch?.at ?? null;
      if (anchor) {
        return `Showing your last import: ${formatImportMonthYear(anchor)}`;
      }
      return "Showing your saved dashboard";
    }
    return dashboardDateRangeLabel;
  }, [workspaceDateRange, savedStoreData, lastImportDate, lastImportBatch, dashboardDateRangeLabel]);

  const grossSalesValue = savedStoreData?.total_revenue ?? derived.grossSales;
  const ordersValue = savedStoreData?.total_orders ?? derived.orders;
  const costsValue = savedStoreData?.total_costs ?? costsForNetDisplay;
  const netValue = savedStoreData?.total_profit ?? estimatedNet;

  const heroComparison = useMemo(
    () =>
      buildHeroComparisonLine({
        gross: grossSalesValue,
        estimatedNet: netValue,
        costsForNet: costsValue,
      }),
    [grossSalesValue, netValue, costsValue],
  );

  const quickTake = useMemo(
    () =>
      buildQuickTake({
        gross: grossSalesValue,
        costsForNet: costsValue,
        aov: derived.aov,
        orders: ordersValue,
      }),
    [grossSalesValue, costsValue, derived.aov, ordersValue],
  );

  const insightsEligible = useMemo(
    () => canRequestAiInsights({ hasOrderImport, hasDashboardImport, derived }),
    [hasOrderImport, hasDashboardImport, derived],
  );

  const keepRatePct = useMemo(
    () => keepRateFromGrossNet(grossSalesValue, netValue),
    [grossSalesValue, netValue],
  );

  if (workspaceEmpty) {
    return (
      <PageShell maxWidth="wide-xl" contentClassName="px-6 pt-5 pb-6 sm:px-10 sm:pt-6 sm:pb-8 lg:px-12">
        <DashboardEmptyState />
      </PageShell>
    );
  }

  const totalEarned = netValue;

  return (
    <PageShell
      maxWidth="wide-xl"
      contentClassName="px-6 pt-5 pb-8 sm:px-10 sm:pt-6 sm:pb-10 lg:px-12"
    >
      <section className="flex flex-col" style={{ gap: "var(--section-gap)" }} aria-labelledby="dashboard-hero-heading">
        <h1 id="dashboard-hero-heading" className="sr-only">
          Dashboard summary
        </h1>

        <div className="overflow-hidden rounded-[var(--radius-card)] border border-[color:color-mix(in_oklab,var(--border-warm)_80%,transparent)] bg-[var(--surface-muted)] shadow-[var(--shadow-card-lift),0_20px_50px_-28px_rgba(26,155,127,0.09)] ring-1 ring-[color:color-mix(in_oklab,var(--metric-positive)_12%,transparent)] dark:border-stone-700/65 dark:bg-stone-900/35 dark:shadow-[0_12px_48px_-20px_rgba(0,0,0,0.5)] dark:ring-stone-800/45">
          <Reveal>
            <motion.div
              className="relative overflow-visible border-b border-[color:color-mix(in_oklab,var(--metric-positive)_18%,var(--border-warm))] bg-[color:color-mix(in_oklab,var(--metric-positive)_09%,var(--surface-raised))] px-6 py-8 sm:px-10 sm:py-10 dark:border-stone-700/50 dark:bg-[color:color-mix(in_oklab,var(--metric-positive)_12%,var(--surface-raised))]"
              initial={reduceMotion ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
            >
              <div className="relative flex flex-col gap-1">
                <div className="min-w-0">
                  <p className="text-xs font-medium uppercase tracking-[0.14em] text-[color:var(--foreground-muted)]">
                    Total earned
                  </p>
                  <p
                    data-testid="dashboard-total-earned"
                    className="mt-3 text-4xl font-bold tabular-nums tracking-[-0.04em] text-[color:var(--metric-positive)] sm:text-5xl lg:text-[3rem] lg:leading-none"
                  >
                    {totalEarned != null ? <AnimatedCurrency value={totalEarned} /> : formatCurrency(null)}
                  </p>
                  <p className="mt-2 max-w-xl text-[0.9375rem] leading-relaxed text-[color:var(--foreground-muted)]">
                    After fees and estimated shipping · from your imported sales
                  </p>
                  <p
                    data-testid="dashboard-date-range-label"
                    className={`font-display mt-4 text-base font-semibold leading-snug tracking-tight ${
                      workspaceDateRange || savedStoreData ? "text-[color:var(--foreground)]" : "text-stone-400 dark:text-stone-500"
                    }`}
                  >
                    {heroImportPeriodLabel}
                  </p>
                  <p className="mt-3 max-w-2xl text-sm leading-relaxed text-[color:var(--foreground-muted)]">
                    {heroComparison}
                  </p>
                </div>
              </div>
            </motion.div>
          </Reveal>

          <div className="bg-[color:color-mix(in_oklab,var(--surface-muted)_48%,var(--surface-raised))] px-5 py-6 dark:bg-stone-950/40 sm:px-8 sm:py-8">
            <p className="font-display mb-5 px-0.5 text-sm font-semibold tracking-tight text-[color:var(--foreground)]">
              Profitability <span className="font-normal text-[color:var(--foreground-muted)]">&amp; drivers</span>
            </p>
            <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:gap-8">
              {keepRatePct != null ? (
                <div
                  className="app-premium-card w-full shrink-0 border-[color:color-mix(in_oklab,var(--warm-gold)_40%,var(--border-warm))] bg-[color:color-mix(in_oklab,var(--warm-gold-soft)_50%,var(--surface-raised))] p-6 dark:border-stone-700/60 dark:bg-[color:color-mix(in_oklab,var(--warm-gold-soft)_25%,var(--surface-raised))] lg:max-w-md lg:flex-1"
                  data-testid="dashboard-keep-rate-card"
                >
                  <p className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.12em] text-[color:var(--warm-brown)]">
                    <IconRevenue className="h-4 w-4 shrink-0 opacity-90" aria-hidden />
                    Estimated keep rate
                  </p>
                  <p className="mt-3 text-3xl font-bold tabular-nums tracking-[-0.03em] text-[color:var(--warm-brown)] sm:text-4xl lg:text-[2.75rem]">
                    {keepRatePct}%
                  </p>
                  <p className="mt-3 text-sm leading-relaxed text-[color:var(--foreground-muted)]">
                    Of {formatCurrency(grossSalesValue)} gross becomes your Total earned after estimated fees and shipping in
                    this range.
                  </p>
                </div>
              ) : null}
              <div className="min-w-0 flex-1 space-y-6">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 sm:gap-5">
                  <div className="app-premium-card p-6 dark:border-stone-700/60 dark:bg-stone-900/50">
                    <p className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.12em] text-[color:var(--foreground-muted)]">
                      <IconRevenue className="h-3.5 w-3.5 shrink-0 text-[color:var(--metric-positive)]" aria-hidden />
                      {itemsSold != null ? "You sold" : "Gross sales"}
                    </p>
                    <p className="mt-3 text-2xl font-bold tabular-nums tracking-[-0.03em] text-[color:var(--foreground)] sm:text-3xl">
                      {itemsSold != null ? `${itemsSold.toLocaleString()} items` : formatCurrency(grossSalesValue)}
                    </p>
                    <p className="mt-2 text-xs leading-snug text-[color:var(--foreground-muted)]">
                      {itemsSold != null ? "Line-item volume" : "Buyer revenue before costs"}
                    </p>
                  </div>
                  <div className="app-premium-card p-6 dark:border-stone-700/55 dark:bg-stone-900/40">
                    <p className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.12em] text-[color:var(--foreground-muted)]">
                      <IconOrders className="h-3.5 w-3.5 shrink-0 text-[color:var(--metric-neutral)]" aria-hidden />
                      Orders
                    </p>
                    <p
                      data-testid="dashboard-orders-count"
                      className="mt-3 text-2xl font-bold tabular-nums tracking-[-0.03em] text-[color:var(--metric-neutral)] sm:text-3xl"
                    >
                      {ordersValue.toLocaleString()}
                    </p>
                    <p className="mt-2 text-xs text-[color:var(--foreground-muted)]">Checkouts</p>
                  </div>
                  <div className="app-premium-card p-6 dark:border-stone-700/55 dark:bg-stone-900/40">
                    <p className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.12em] text-[color:var(--foreground-muted)]">
                      <IconCost className="h-3.5 w-3.5 shrink-0 text-[color:var(--metric-negative)]" aria-hidden />
                      Costs
                    </p>
                    <p className="mt-3 text-2xl font-bold tabular-nums tracking-[-0.03em] text-[color:var(--metric-negative)] sm:text-3xl">
                      {formatCurrency(costsValue)}
                    </p>
                    <p className="mt-2 text-xs text-[color:var(--foreground-muted)]">Fees + shipping</p>
                  </div>
                </div>
                {dashboardDailyRevenue.length > 0 ? (
                  <DashboardRevenueChart points={dashboardDailyRevenue} lineStroke="var(--metric-positive)" />
                ) : null}
              </div>
            </div>
          </div>
        </div>

        {insightsEligible ? (
          <AiInsightsModal embedded open={true} presentation="inline" onClose={() => {}} />
        ) : null}

        <div className="app-premium-card px-6 py-6 dark:border-stone-700/65 dark:bg-stone-900/50 sm:px-8 sm:py-7">
          <p className="font-display text-sm font-semibold tracking-tight text-[color:var(--foreground)]">Quick take</p>
          <p className="mt-3 text-[0.9375rem] leading-relaxed text-[color:var(--foreground-muted)]">{quickTake}</p>
        </div>
      </section>
    </PageShell>
  );
}
