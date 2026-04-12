"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import TrendAnalysisChart from "../../../components/TrendAnalysisChart";
import { Reveal } from "../../../components/motion/Reveal";
import { Stagger, StaggerItem } from "../../../components/motion/Stagger";
import { AnimatedBarWidth } from "../../../components/motion/AnimatedBarWidth";
import { IconCost, IconOrders, IconRevenue } from "../../../components/MetricIcons";
import PageShell, { PageIntroGradient } from "../../../components/PageShell";
import { useData } from "../../../components/DataProvider";
import type { CsvData } from "../../../lib/csvData";
import {
  computeTrendsPeriodOverPeriod,
  type TrendsKpiComparison,
} from "../../../lib/trendsWeekOverWeek";
import { groupTrendPointsForChart, inferTrendChartGranularity, type TrendChartGranularity } from "../../../lib/trendChartAggregation";
import { buildTrendInsightsPanel } from "../../../lib/trendInsights";
import MiniSparkline from "../../../components/MiniSparkline";

function formatCurrency(n: number | null | undefined) {
  if (n === null || n === undefined || Number.isNaN(n)) return "-";
  return n.toLocaleString(undefined, { style: "currency", currency: "USD" });
}

function parseOrderRowDate(orderDateRaw: string): Date | null {
  const s = (orderDateRaw ?? "").trim();
  if (!s) return null;
  const parts = s.split(",").map((x) => x.trim());
  const datePart = parts.length > 1 ? parts[1] : parts[0];
  const d = new Date(datePart);
  return Number.isNaN(d.getTime()) ? null : d;
}

function orderDataDateRange(orderData: CsvData | null, orderDateKey: string | null): { start: Date; end: Date } | null {
  if (!orderData?.rows?.length || !orderDateKey) return null;
  const key = orderDateKey;
  let min: Date | null = null;
  let max: Date | null = null;
  for (const r of orderData.rows) {
    const d = parseOrderRowDate(r[key] ?? "");
    if (!d) continue;
    if (!min || d < min) min = d;
    if (!max || d > max) max = d;
  }
  if (!min || !max) return null;
  return { start: min, end: max };
}

function formatDataRangeLabel(start: Date, end: Date): string {
  const sameYear = start.getFullYear() === end.getFullYear();
  const base: Intl.DateTimeFormatOptions = { month: "long", day: "numeric" };
  const startStr = new Intl.DateTimeFormat("en-US", {
    ...base,
    ...(sameYear ? {} : { year: "numeric" }),
  }).format(start);
  const endStr = new Intl.DateTimeFormat("en-US", {
    ...base,
    year: sameYear ? undefined : "numeric",
  }).format(end);
  if (startStr === endStr) return startStr;
  return `${startStr} → ${endStr}`;
}

function EmptyTrendsChartIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      className={className}
      width={48}
      height={48}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path
        d="M8 36V12M8 36h32M14 28l8-10 6 5 10-14"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="text-slate-300 dark:text-slate-600"
      />
      <circle cx="14" cy="28" r="2" className="fill-slate-300 dark:fill-slate-600" />
      <circle cx="22" cy="18" r="2" className="fill-slate-300 dark:fill-slate-600" />
      <circle cx="28" cy="23" r="2" className="fill-slate-300 dark:fill-slate-600" />
      <circle cx="38" cy="9" r="2" className="fill-slate-300 dark:fill-slate-600" />
    </svg>
  );
}

function ComparisonChange({
  pct,
  label,
}: {
  pct: number;
  label: TrendsKpiComparison["comparisonLabel"];
}) {
  const positive = pct > 0;
  const negative = pct < 0;
  return (
    <p
      className={`mt-1.5 text-[11px] font-medium tabular-nums ${
        positive ? "text-emerald-700 dark:text-emerald-400" : negative ? "text-red-600 dark:text-red-400" : "text-slate-500 dark:text-slate-400"
      }`}
    >
      {pct >= 0 ? "+" : ""}
      {pct.toFixed(1)}% {label}
    </p>
  );
}

function ComparisonDeltaRow({
  comparison,
  pct,
}: {
  comparison: TrendsKpiComparison | null;
  pct: number | null;
}) {
  if (comparison != null && pct != null && !Number.isNaN(pct)) {
    return <ComparisonChange pct={pct} label={comparison.comparisonLabel} />;
  }
  return (
    <p className="mt-1.5 text-[11px] font-normal text-slate-400 dark:text-slate-500">No comparison yet</p>
  );
}

export default function TrendsPage() {
  const [trendMetric, setTrendMetric] = useState<"revenue" | "orders" | "shipping">("revenue");
  const [granularityOverride, setGranularityOverride] = useState<TrendChartGranularity | null>(null);
  const reduceMotion = useReducedMotion();
  const {
    trendsTrendData,
    trendsDailyTrendData,
    trendsOrderValueBuckets,
    trendsOrderMetrics,
    trendsOrderData,
    trendsOrderColumnMap,
    trendsOrderListReady,
    trendsValidBatchCount,
    trendsHasReviewBatch,
  } = useData();

  const showFullTrendsUi = trendsOrderListReady;

  const dailyFingerprint = useMemo(
    () => trendsDailyTrendData.map((p) => p.dateMs).join(","),
    [trendsDailyTrendData],
  );

  useEffect(() => {
    setGranularityOverride(null);
  }, [dailyFingerprint]);

  const inferredGranularity = useMemo(
    () => inferTrendChartGranularity(trendsDailyTrendData),
    [trendsDailyTrendData],
  );

  const chartGranularity = granularityOverride ?? inferredGranularity;

  const chartDisplayData = useMemo(
    () => groupTrendPointsForChart(trendsDailyTrendData, chartGranularity),
    [trendsDailyTrendData, chartGranularity],
  );

  const comparison = useMemo(
    () => (showFullTrendsUi ? computeTrendsPeriodOverPeriod(chartDisplayData) : null),
    [showFullTrendsUi, chartDisplayData],
  );

  const insightsPanel = useMemo(
    () => (showFullTrendsUi ? buildTrendInsightsPanel(chartDisplayData, chartGranularity) : null),
    [showFullTrendsUi, chartDisplayData, chartGranularity],
  );

  const dataRangeLabel = useMemo(() => {
    const range = orderDataDateRange(trendsOrderData, trendsOrderColumnMap?.orderDateKey ?? null);
    if (!range) return null;
    return formatDataRangeLabel(range.start, range.end);
  }, [trendsOrderData, trendsOrderColumnMap?.orderDateKey]);

  const metrics = useMemo(() => {
    if (!trendsTrendData.length) {
      return {
        totalRevenue: 0,
        avgOrderValue: 0,
        ordersCount: 0,
        shippingTotal: 0,
        sparkRevenue: [] as number[],
        sparkAov: [] as number[],
        sparkOrders: [] as number[],
        sparkShipping: [] as number[],
      };
    }

    const totalRevenue = trendsTrendData.reduce((s, p) => s + p.revenue, 0);
    const ordersCount = trendsTrendData.reduce((s, p) => s + p.orders, 0);
    const shippingTotal = trendsTrendData.reduce((s, p) => s + p.shipping, 0);
    const avgOrderValue = ordersCount > 0 ? totalRevenue / ordersCount : 0;

    const src = chartDisplayData.length > 0 ? chartDisplayData : trendsTrendData;
    const revSeries = src.map((p) => p.revenue);
    const ordSeries = src.map((p) => p.orders);
    const shipSeries = src.map((p) => p.shipping);
    const aovSeries = src.map((p) => (p.orders > 0 ? p.revenue / p.orders : 0));

    return {
      totalRevenue,
      avgOrderValue,
      ordersCount: trendsOrderMetrics?.orders ?? ordersCount,
      shippingTotal,
      sparkRevenue: revSeries,
      sparkAov: aovSeries,
      sparkOrders: ordSeries,
      sparkShipping: shipSeries,
    };
  }, [trendsTrendData, trendsOrderMetrics?.orders, chartDisplayData]);

  const distributionRows = trendsOrderValueBuckets
    ? [
        { label: "< $5", count: trendsOrderValueBuckets.under5 },
        { label: "$5–10", count: trendsOrderValueBuckets.fiveTo10 },
        { label: "$10–20", count: trendsOrderValueBuckets.tenTo20 },
        { label: "$20+", count: trendsOrderValueBuckets.over20 },
      ]
    : [
        { label: "< $5", count: 0 },
        { label: "$5–10", count: 0 },
        { label: "$10–20", count: 0 },
        { label: "$20+", count: 0 },
      ];

  const totalOrdersInBuckets = distributionRows.reduce((s, r) => s + r.count, 0);

  const showComparisonHint = showFullTrendsUi && chartDisplayData.length < 2;

  const fadeTransition = reduceMotion ? { duration: 0 } : { duration: 0.22, ease: [0.22, 1, 0.36, 1] as const };

  return (
    <PageShell maxWidth="wide-xl">
      <PageIntroGradient title="Trends" className="sm:p-6">
        <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <p className="max-w-md text-xs font-medium leading-relaxed text-white/70">
            Detailed view of your performance
          </p>
          <Link
            href="/dashboard"
            className="shrink-0 self-start rounded-lg border border-white/30 bg-white/15 px-3 py-1.5 text-center text-xs font-semibold text-white shadow-sm backdrop-blur-sm transition hover:bg-white/25"
          >
            Back to Dashboard
          </Link>
        </div>
        {showFullTrendsUi && dataRangeLabel ? (
          <p className="mt-3 text-sm font-normal text-white/80">
            <span className="tabular-nums">{dataRangeLabel}</span>
          </p>
        ) : null}
        {showFullTrendsUi && trendsHasReviewBatch ? (
          <p className="mt-2 max-w-xl text-xs font-normal leading-relaxed text-amber-50/95 dark:text-amber-100/90">
            Some data may need review
          </p>
        ) : null}
        {showComparisonHint ? (
          <p className="mt-2 max-w-xl text-xs font-normal leading-relaxed text-white/70">
            Add another day or week of orders so we can compare this period to the previous one on KPIs.
          </p>
        ) : null}
      </PageIntroGradient>

      <AnimatePresence mode="wait" initial={false}>
        {!showFullTrendsUi ? (
          <motion.div
            key="trends-empty"
            role="status"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={fadeTransition}
            className="flex min-h-[min(72vh,44rem)] flex-col items-center justify-center px-4 py-12 text-center sm:py-16"
          >
            {trendsValidBatchCount === 0 ? (
              <>
                <EmptyTrendsChartIcon className="mb-5 shrink-0" />
                <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-50 sm:text-2xl">
                  No trends yet
                </h2>
                <p className="mt-3 max-w-sm text-sm leading-relaxed text-slate-500 dark:text-slate-400">
                  Upload your first order list to see performance over time
                </p>
                <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
                  <Link
                    href="/data"
                    className="inline-flex items-center justify-center rounded-full bg-[color:var(--accent)] px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition-app hover:brightness-105 active:translate-y-px"
                  >
                    Go to Imports
                  </Link>
                  <Link
                    href="/dashboard"
                    className="text-sm font-medium text-slate-600 underline-offset-2 hover:underline dark:text-slate-400"
                  >
                    Back to Dashboard
                  </Link>
                </div>
              </>
            ) : (
              <>
                <EmptyTrendsChartIcon className="mb-5 shrink-0" />
                <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-50 sm:text-2xl">
                  No trends yet
                </h2>
                <p className="mt-3 max-w-sm text-sm leading-relaxed text-slate-500 dark:text-slate-400">
                  Only fully validated imports feed Trends. Fix your batch on Imports, then return here.
                </p>
                <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
                  <Link
                    href="/data"
                    className="inline-flex items-center justify-center rounded-full bg-[color:var(--accent)] px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition-app hover:brightness-105 active:translate-y-px"
                  >
                    Go to Imports
                  </Link>
                  <Link
                    href="/dashboard"
                    className="text-sm font-medium text-slate-600 underline-offset-2 hover:underline dark:text-slate-400"
                  >
                    Back to Dashboard
                  </Link>
                </div>
              </>
            )}
          </motion.div>
        ) : (
          <motion.div
            key="trends-full"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={fadeTransition}
            className="mt-6 space-y-8 sm:mt-8"
          >
            <Reveal>
              <TrendAnalysisChart
                displayData={chartDisplayData}
                granularity={chartGranularity}
                inferredGranularity={inferredGranularity}
                onGranularityChange={setGranularityOverride}
                metric={trendMetric}
                onMetricChange={setTrendMetric}
              />
            </Reveal>

            <Stagger className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <StaggerItem>
                <div className="flex min-h-0 flex-col rounded-xl border border-slate-200/70 bg-white/80 p-4 opacity-[0.92] dark:border-slate-700/60 dark:bg-slate-900/70">
                  <p className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
                    <IconRevenue className="h-3.5 w-3.5 shrink-0 text-[color:var(--accent)] opacity-90" aria-hidden />
                    Total revenue
                  </p>
                  <p
                    data-testid="trends-total-revenue"
                    className="mt-1.5 text-xl font-bold tabular-nums tracking-tight text-slate-800 dark:text-slate-100"
                  >
                    {formatCurrency(metrics.totalRevenue)}
                  </p>
                  <ComparisonDeltaRow comparison={comparison} pct={comparison?.revenuePct ?? null} />
                  <div className="mt-2 flex flex-1 flex-col justify-end opacity-90">
                    <MiniSparkline values={metrics.sparkRevenue} stroke="#2563eb" empty={metrics.sparkRevenue.length === 0} />
                  </div>
                </div>
              </StaggerItem>
              <StaggerItem>
                <div className="flex min-h-0 flex-col rounded-xl border border-slate-200/70 bg-white/80 p-4 opacity-[0.92] dark:border-slate-700/60 dark:bg-slate-900/70">
                  <p className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
                    <IconRevenue className="h-3.5 w-3.5 shrink-0 text-[color:var(--accent)] opacity-75" aria-hidden />
                    Avg order value
                  </p>
                  <p className="mt-1.5 text-xl font-bold tabular-nums tracking-tight text-slate-800 dark:text-slate-100">
                    {formatCurrency(metrics.avgOrderValue)}
                  </p>
                  <ComparisonDeltaRow comparison={comparison} pct={comparison?.aovPct ?? null} />
                  <div className="mt-2 flex flex-1 flex-col justify-end opacity-90">
                    <MiniSparkline values={metrics.sparkAov} stroke="#2563eb" empty={metrics.sparkAov.length === 0} />
                  </div>
                </div>
              </StaggerItem>
              <StaggerItem>
                <div className="flex min-h-0 flex-col rounded-xl border border-slate-200/70 bg-white/80 p-4 opacity-[0.92] dark:border-slate-700/60 dark:bg-slate-900/70">
                  <p className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
                    <IconOrders className="h-3.5 w-3.5 shrink-0 text-[color:var(--accent)] opacity-90" aria-hidden />
                    Orders
                  </p>
                  <p className="mt-1.5 text-xl font-bold tabular-nums tracking-tight text-slate-800 dark:text-slate-100">
                    {metrics.ordersCount}
                  </p>
                  <ComparisonDeltaRow comparison={comparison} pct={comparison?.ordersPct ?? null} />
                  <div className="mt-2 flex flex-1 flex-col justify-end opacity-90">
                    <MiniSparkline values={metrics.sparkOrders} stroke="#2563eb" empty={metrics.sparkOrders.length === 0} />
                  </div>
                </div>
              </StaggerItem>
              <StaggerItem>
                <div className="flex min-h-0 flex-col rounded-xl border border-slate-200/70 bg-white/80 p-4 opacity-[0.92] dark:border-slate-700/60 dark:bg-slate-900/70">
                  <p className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
                    <IconCost className="h-3.5 w-3.5 shrink-0 text-[color:var(--accent)] opacity-90" aria-hidden />
                    Shipping
                  </p>
                  <p className="mt-1.5 text-xl font-bold tabular-nums tracking-tight text-slate-800 dark:text-slate-100">
                    {formatCurrency(metrics.shippingTotal)}
                  </p>
                  <div className="mt-2 flex flex-1 flex-col justify-end opacity-90">
                    <MiniSparkline values={metrics.sparkShipping} stroke="#2563eb" empty={metrics.sparkShipping.length === 0} />
                  </div>
                </div>
              </StaggerItem>
            </Stagger>

            {insightsPanel ? (
              <Reveal delay={0.03}>
                <div className="app-section-surface p-5 sm:p-6">
                  <h2 className="mb-4 text-base font-bold text-slate-900 dark:text-slate-50">Insights</h2>
                  <p className="mb-3 text-[11px] font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">
                    Based on {chartGranularity} chart view
                  </p>
                  <ul className="space-y-2.5 text-sm leading-relaxed text-slate-700 dark:text-slate-300">
                    <li>{insightsPanel.bestLine}</li>
                    <li>{insightsPanel.weakestLine}</li>
                    <li>{insightsPanel.trendLine}</li>
                  </ul>
                </div>
              </Reveal>
            ) : null}

            <Reveal delay={0.05}>
              <div className="app-section-surface p-5 sm:p-6">
                <h2 className="mb-5 text-base font-bold text-slate-900 dark:text-slate-50">Order Size Breakdown</h2>
                <div className="space-y-3.5">
                  {distributionRows.map(({ label, count }) => {
                    const sharePct = totalOrdersInBuckets > 0 ? (count / totalOrdersInBuckets) * 100 : 0;
                    const barPct =
                      totalOrdersInBuckets > 0 ? (count / totalOrdersInBuckets) * 100 : count > 0 ? 100 : 0;
                    return (
                      <div key={label} className="flex items-center gap-2 sm:gap-3">
                        <div className="w-[4.5rem] shrink-0 text-sm font-medium text-slate-700 dark:text-slate-300 sm:w-24">
                          {label}
                        </div>
                        <div className="min-w-0 flex-1">
                          <AnimatedBarWidth
                            pct={Math.max(barPct, count > 0 ? 2 : 0)}
                            className={count > 0 ? "bg-[color:var(--accent)]" : "bg-slate-200 dark:bg-slate-600"}
                          />
                        </div>
                        <div className="flex w-[5.5rem] shrink-0 flex-col items-end text-right sm:w-28">
                          <span className="text-sm font-semibold tabular-nums text-slate-900 dark:text-slate-50">
                            {`${sharePct.toFixed(0)}%`}
                          </span>
                          <span className="text-xs tabular-nums text-slate-500 dark:text-slate-400">
                            {`${count} ${count === 1 ? "order" : "orders"}`}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </Reveal>

            <div className="flex justify-center pb-2">
              <Link
                href="/dashboard"
                className="inline-flex items-center justify-center rounded-xl border border-slate-200/90 bg-white px-5 py-2.5 text-sm font-semibold text-slate-800 shadow-sm transition hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
              >
                Back to Dashboard
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </PageShell>
  );
}
