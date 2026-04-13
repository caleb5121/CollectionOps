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
import { buildTrendInsightsStructuredPanel } from "../../../lib/trendInsights";
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

  const insightsStructured = useMemo(
    () => (showFullTrendsUi ? buildTrendInsightsStructuredPanel(chartDisplayData, chartGranularity) : null),
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
  let dominantBucketIndex = -1;
  let dominantBucketMax = 0;
  for (let i = 0; i < distributionRows.length; i++) {
    const c = distributionRows[i]!.count;
    if (c > dominantBucketMax) {
      dominantBucketMax = c;
      dominantBucketIndex = i;
    }
  }
  if (dominantBucketMax === 0) dominantBucketIndex = -1;

  const showComparisonHint = showFullTrendsUi && chartDisplayData.length < 2;

  const fadeTransition = reduceMotion ? { duration: 0 } : { duration: 0.22, ease: [0.22, 1, 0.36, 1] as const };

  return (
    <PageShell maxWidth="wide-xl" contentClassName="px-6 pt-5 pb-5 sm:px-8 sm:pt-6 sm:pb-6 lg:px-10">
      {showFullTrendsUi ? (
        <PageIntroGradient title="Trends" size="strip">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
            <div className="min-w-0 flex-1 space-y-1">
              {dataRangeLabel ? (
                <p className="text-xs font-medium tabular-nums text-white/90">
                  <span className="text-white/60">Range · </span>
                  {dataRangeLabel}
                </p>
              ) : (
                <p className="text-xs text-white/70">Revenue, orders, and fees from your imports</p>
              )}
              {trendsHasReviewBatch ? (
                <p className="text-[11px] font-medium text-amber-100/95">Some data may need review</p>
              ) : null}
              {showComparisonHint ? (
                <p className="text-[11px] text-white/65">Add another period to unlock period-over-period KPIs.</p>
              ) : null}
            </div>
            <Link
              href="/dashboard"
              className="shrink-0 self-start rounded-md border border-white/35 bg-white/10 px-2.5 py-1 text-center text-[11px] font-semibold text-white transition hover:bg-white/20 sm:self-center"
            >
              Back to Dashboard
            </Link>
          </div>
        </PageIntroGradient>
      ) : null}

      <AnimatePresence mode="wait" initial={false}>
        {!showFullTrendsUi ? (
          <motion.div
            key="trends-empty"
            role="status"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={fadeTransition}
            className="mx-auto max-w-lg py-6 text-center sm:py-7"
          >
            <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50 sm:text-3xl">
              See performance over time
            </h2>
            {trendsValidBatchCount === 0 ? (
              <p className="mt-2 text-sm leading-relaxed text-slate-500 dark:text-slate-400">
                Once you upload order data, Trends will show revenue, orders, fees, and momentum across your selected date
                range.
              </p>
            ) : (
              <p className="mt-2 text-sm leading-relaxed text-slate-500 dark:text-slate-400">
                Only fully validated imports feed Trends. Fix your batch on Imports, then return here.
              </p>
            )}
            <Link
              href="/data"
              className="mt-5 inline-flex items-center justify-center rounded-xl bg-[color:var(--accent)] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-app hover:opacity-95 active:translate-y-px"
            >
              Go to Imports
            </Link>
            <p className="mt-2 text-xs text-slate-500 dark:text-slate-500">Start with one CSV pair</p>
            <p className="mt-4">
              <Link
                href="/dashboard"
                className="text-xs font-medium text-slate-500 underline-offset-2 hover:underline dark:text-slate-500"
              >
                Back to Dashboard
              </Link>
            </p>
          </motion.div>
        ) : (
          <motion.div
            key="trends-full"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={fadeTransition}
            className="mt-4 space-y-5 sm:mt-5"
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

            {insightsStructured ? (
              <Reveal delay={0.03}>
                <div className="app-section-surface p-4 sm:p-5">
                  <h2 className="text-sm font-bold text-slate-900 dark:text-slate-50">Insights</h2>
                  <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                    From your {chartGranularity} chart
                  </p>
                  <div className="mt-4 space-y-4">
                    {[insightsStructured.best, insightsStructured.weakest, insightsStructured.trend].map((block) => (
                      <div
                        key={block.label}
                        className="rounded-lg border border-slate-200/70 bg-white/60 px-3 py-2.5 dark:border-slate-700/55 dark:bg-slate-900/40"
                      >
                        <p className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                          {block.label}
                        </p>
                        <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">{block.period}</p>
                        <p className="mt-1 text-sm font-semibold tabular-nums text-slate-900 dark:text-slate-50">{block.value}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </Reveal>
            ) : null}

            <Reveal delay={0.05}>
              <div className="app-section-surface p-4 sm:p-5">
                <h2 className="text-sm font-bold text-slate-900 dark:text-slate-50">Order size breakdown</h2>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Where your orders fall by price range</p>
                <div className="mt-4 space-y-3">
                  {distributionRows.map(({ label, count }, rowIdx) => {
                    const sharePct = totalOrdersInBuckets > 0 ? (count / totalOrdersInBuckets) * 100 : 0;
                    const barPct =
                      totalOrdersInBuckets > 0 ? (count / totalOrdersInBuckets) * 100 : count > 0 ? 100 : 0;
                    const isDominant = rowIdx === dominantBucketIndex && count > 0;
                    return (
                      <div key={label} className="flex items-center gap-2 sm:gap-3">
                        <div
                          className={`w-[4.5rem] shrink-0 text-sm font-medium sm:w-24 ${isDominant ? "text-slate-900 dark:text-slate-100" : "text-slate-700 dark:text-slate-300"}`}
                        >
                          {label}
                          {isDominant ? (
                            <span className="ml-1 text-[10px] font-semibold uppercase tracking-wide text-[color:var(--accent)]">
                              Top
                            </span>
                          ) : null}
                        </div>
                        <div className={`min-w-0 flex-1 ${isDominant ? "rounded-full ring-2 ring-[color:var(--accent)]/35 ring-offset-2 ring-offset-white dark:ring-offset-slate-900" : ""}`}>
                          <AnimatedBarWidth
                            thick
                            pct={Math.max(barPct, count > 0 ? 2 : 0)}
                            className={
                              count > 0
                                ? isDominant
                                  ? "bg-[color:var(--accent)]"
                                  : "bg-slate-400 dark:bg-slate-500"
                                : "bg-slate-200 dark:bg-slate-600"
                            }
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

            <div className="flex justify-center pb-1">
              <Link
                href="/dashboard"
                className="text-sm font-medium text-slate-500 underline-offset-2 hover:text-slate-800 hover:underline dark:text-slate-400 dark:hover:text-slate-200"
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
