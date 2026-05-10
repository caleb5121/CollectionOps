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
import DashboardGrossBreakdownBar from "../../../components/dashboard/DashboardGrossBreakdownBar";
import { MiniSparkline } from "../../../components/dashboard/MiniSparkline";
import AiInsightsModal from "../../../components/dashboard/AiInsightsModal";
import { canRequestAiInsights } from "../../../lib/aiInsightsSummary";
import { useAuth } from "../../../components/AuthProvider";
import { fetchCurrentUserStoreData, type UserStoreDataRow } from "../../../lib/supabase/userStoreData";
import { revenueHalfPeriodDelta } from "../../../lib/dashboardPeriodTrend";

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

  const revenueTrendDelta = useMemo(
    () => revenueHalfPeriodDelta(dashboardDailyRevenue),
    [dashboardDailyRevenue],
  );
  const revSpark = useMemo(() => dashboardDailyRevenue.map((p) => p.revenue), [dashboardDailyRevenue]);
  const ordSpark = useMemo(() => dashboardDailyRevenue.map((p) => p.orders), [dashboardDailyRevenue]);
  const shipSpark = useMemo(() => dashboardDailyRevenue.map((p) => p.shipping), [dashboardDailyRevenue]);

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
      <section className="flex flex-col pb-2" style={{ gap: "calc(var(--section-gap) + 0.5rem)" }} aria-labelledby="dashboard-hero-heading">
        <h1 id="dashboard-hero-heading" className="sr-only">
          Dashboard summary
        </h1>

        <Reveal>
          <motion.div
            className="relative border-b border-[color:color-mix(in_oklab,var(--border-warm)_78%,transparent)] pb-10 pt-2 sm:pb-12"
            initial={reduceMotion ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
          >
            <div
              className="pointer-events-none absolute -inset-x-4 -top-2 bottom-0 rounded-none opacity-50 dark:opacity-35 sm:-inset-x-2"
              aria-hidden
              style={{
                backgroundImage:
                  "radial-gradient(ellipse 72% 60% at 100% 0%, color-mix(in oklab, var(--metric-positive) 12%, transparent), transparent 58%), linear-gradient(180deg, color-mix(in oklab, var(--accent-soft) 22%, transparent) 0%, transparent 42%)",
              }}
            />
            <div className="relative z-[1] flex flex-col gap-1">
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[color:var(--foreground-muted)]">
                  Total earned
                </p>
                <p
                  data-testid="dashboard-total-earned"
                  className="mt-3 text-5xl font-bold leading-[1.05] tracking-[-0.045em] sm:text-6xl lg:text-[3.5rem] lg:leading-[1.02]"
                >
                  {totalEarned != null ? (
                    <AnimatedCurrency value={totalEarned} className="text-metric-hero" />
                  ) : (
                    <span className="text-[color:var(--metric-positive)]">{formatCurrency(null)}</span>
                  )}
                </p>
                <p className="mt-3 max-w-xl text-[0.9375rem] font-normal leading-[1.65] text-[color:var(--foreground-muted)]">
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
                <p className="mt-3 max-w-2xl text-sm leading-relaxed text-[color:var(--foreground-muted)]">{heroComparison}</p>
              </div>
            </div>
          </motion.div>
        </Reveal>

        <div>
          <p className="font-display mb-5 text-base font-semibold tracking-[-0.02em] text-[color:var(--foreground)] sm:mb-6">
            Profitability <span className="font-normal text-[color:var(--foreground-muted)]">&amp; drivers</span>
          </p>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:gap-8">
            {keepRatePct != null ? (
              <div
                className="app-premium-card w-full border-[color:color-mix(in_oklab,var(--warm-gold)_38%,var(--border-warm))] bg-[linear-gradient(168deg,color-mix(in_oklab,var(--warm-gold-soft)_55%,var(--surface-raised))_0%,var(--surface-raised)_100%)] p-7 dark:border-stone-700/60 dark:bg-[linear-gradient(168deg,color-mix(in_oklab,var(--warm-gold-soft)_28%,var(--surface-raised))_0%,var(--surface-raised)_100%)] lg:col-span-4"
                data-testid="dashboard-keep-rate-card"
              >
                <div className="relative z-[1]">
                  <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-[color:var(--warm-brown)]">
                    <IconRevenue className="h-4 w-4 shrink-0 opacity-90" aria-hidden />
                    Estimated keep rate
                  </p>
                  <p className="mt-4 text-4xl font-bold tabular-nums tracking-[-0.04em] text-[color:var(--warm-brown)] sm:text-5xl lg:text-[2.875rem] lg:leading-none">
                    {keepRatePct}%
                  </p>
                  <p className="mt-4 text-sm font-normal leading-[1.65] text-[color:var(--foreground-muted)]">
                    Of {formatCurrency(grossSalesValue)} gross becomes your Total earned after estimated fees and shipping in this
                    range.
                  </p>
                </div>
              </div>
            ) : null}
            <div className={`min-w-0 space-y-6 ${keepRatePct != null ? "lg:col-span-8" : "lg:col-span-12"}`}>
              <div className="app-metric-strip grid grid-cols-1 divide-y divide-[color:color-mix(in_oklab,var(--border-warm)_68%,transparent)] sm:grid-cols-3 sm:divide-x sm:divide-y-0">
                <div className="flex min-h-[10.5rem] flex-col p-6 sm:min-h-[11rem]">
                  <div className="flex items-start justify-between gap-2">
                    <p className="flex min-w-0 items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-[color:var(--foreground-muted)]">
                      <IconRevenue className="h-3.5 w-3.5 shrink-0 text-[color:var(--metric-positive)]" aria-hidden />
                      {itemsSold != null ? "You sold" : "Gross sales"}
                    </p>
                    {revSpark.length >= 2 ? (
                      <MiniSparkline values={revSpark} color="var(--metric-positive)" className="opacity-95" />
                    ) : null}
                  </div>
                  <p className="mt-4 text-3xl font-bold tabular-nums tracking-[-0.035em] text-[color:var(--foreground)] sm:text-4xl">
                    {itemsSold != null ? `${itemsSold.toLocaleString()} items` : formatCurrency(grossSalesValue)}
                  </p>
                  <p className="mt-auto pt-3 text-xs font-medium leading-snug text-[color:var(--foreground-muted)]">
                    {itemsSold != null ? "Line-item volume" : "Buyer revenue before costs"}
                  </p>
                </div>
                <div className="flex min-h-[10.5rem] flex-col p-6 sm:min-h-[11rem]">
                  <div className="flex items-start justify-between gap-2">
                    <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-[color:var(--foreground-muted)]">
                      <IconOrders className="h-3.5 w-3.5 shrink-0 text-[color:var(--metric-neutral)]" aria-hidden />
                      Orders
                    </p>
                    {ordSpark.length >= 2 ? (
                      <MiniSparkline values={ordSpark} color="var(--metric-neutral)" className="opacity-95" />
                    ) : null}
                  </div>
                  <p
                    data-testid="dashboard-orders-count"
                    className="mt-4 text-3xl font-bold tabular-nums tracking-[-0.035em] text-[color:var(--metric-neutral)] sm:text-4xl"
                  >
                    {ordersValue.toLocaleString()}
                  </p>
                  <p className="mt-auto pt-3 text-xs font-medium text-[color:var(--foreground-muted)]">Checkouts</p>
                </div>
                <div className="flex min-h-[10.5rem] flex-col p-6 sm:min-h-[11rem]">
                  <div className="flex items-start justify-between gap-2">
                    <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-[color:var(--foreground-muted)]">
                      <IconCost className="h-3.5 w-3.5 shrink-0 text-[color:var(--metric-negative)]" aria-hidden />
                      Costs
                    </p>
                    {shipSpark.length >= 2 ? (
                      <MiniSparkline values={shipSpark} color="var(--metric-negative)" className="opacity-90" />
                    ) : null}
                  </div>
                  <p className="mt-4 text-3xl font-bold tabular-nums tracking-[-0.035em] text-[color:var(--metric-negative)] sm:text-4xl">
                    {formatCurrency(costsValue)}
                  </p>
                  <p className="mt-auto pt-3 text-xs font-medium text-[color:var(--foreground-muted)]">
                    Fees + shipping
                    {shipSpark.length >= 2 ? (
                      <span className="mt-0.5 block text-[10px] font-normal opacity-80">Daily shipping (import)</span>
                    ) : null}
                  </p>
                </div>
              </div>
              {dashboardDailyRevenue.length > 0 ? (
                <div className="grid grid-cols-1 gap-5 xl:grid-cols-5 xl:gap-6">
                  <div className="min-w-0 xl:col-span-3">
                    <DashboardRevenueChart
                      points={dashboardDailyRevenue}
                      lineStroke="var(--metric-positive)"
                      periodDeltaPct={revenueTrendDelta}
                    />
                  </div>
                  <div className="flex min-w-0 flex-col justify-start gap-5 xl:col-span-2">
                    <DashboardGrossBreakdownBar gross={grossSalesValue} net={netValue} costs={costsValue} />
                  </div>
                </div>
              ) : (
                <DashboardGrossBreakdownBar gross={grossSalesValue} net={netValue} costs={costsValue} />
              )}
            </div>
          </div>
        </div>

        {insightsEligible ? (
          <AiInsightsModal embedded open={true} presentation="inline" onClose={() => {}} />
        ) : null}

        <aside className="relative border-l-[3px] border-[color:var(--accent)] pl-5 sm:pl-7">
          <p className="font-display text-base font-semibold tracking-[-0.02em] text-[color:var(--foreground)]">Quick take</p>
          <p className="mt-3 max-w-3xl text-[0.9375rem] font-normal leading-[1.65] text-[color:var(--foreground-muted)]">
            {quickTake}
          </p>
        </aside>
      </section>
    </PageShell>
  );
}
