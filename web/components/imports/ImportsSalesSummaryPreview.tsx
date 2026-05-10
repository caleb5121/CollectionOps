"use client";

import { useMemo } from "react";
import { rollupSummaryMetrics } from "../../lib/importsInsights";
import type { CsvData } from "../../lib/csvData";
import StatusPill from "../StatusPill";

function formatCurrency(n: number | null | undefined) {
  if (n === null || n === undefined || Number.isNaN(n)) return "-";
  return n.toLocaleString(undefined, { style: "currency", currency: "USD" });
}

const metricCard =
  "rounded-lg border border-zinc-200/90 bg-white px-4 py-3 shadow-sm dark:border-zinc-800/80 dark:bg-zinc-900/55";

export function ImportsSalesSummaryPreview({
  summaryData,
  summaryFileName,
  rowCountLabel,
}: {
  summaryData: CsvData | null;
  summaryFileName: string | null;
  rowCountLabel?: string;
}) {
  const rollup = useMemo(() => {
    if (!summaryData?.rows?.length) return null;
    return rollupSummaryMetrics(summaryData.rows);
  }, [summaryData]);

  if (!summaryData || !rollup) {
    return (
      <div className="flex min-h-[220px] flex-col justify-center rounded-xl border border-dashed border-zinc-300/90 bg-zinc-50/50 p-8 text-center dark:border-zinc-700/70 dark:bg-zinc-950/35 sm:p-10">
        <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Sales Summary preview</p>
        <p className="mt-2 text-[0.8125rem] leading-relaxed text-zinc-600 dark:text-zinc-400">
          Add a Sales Summary CSV to see gross sales, net after fees, fees paid, shipping collected, and refunds in one
          place.
        </p>
      </div>
    );
  }

  const secondary = [
    { label: "Order count", value: String(Math.round(rollup.orders)) },
    { label: "Shipping collected", value: formatCurrency(rollup.shipping) },
    { label: "Refunds", value: formatCurrency(rollup.refunds) },
  ];

  return (
    <div className="rounded-xl border border-zinc-200/90 bg-white p-6 shadow-sm dark:border-zinc-800/80 dark:bg-zinc-950/45 sm:p-8">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3 border-b border-zinc-200/80 pb-4 dark:border-zinc-800/80">
        <div>
          <h2 className="text-base font-semibold tracking-[-0.02em] text-zinc-900 dark:text-zinc-50">Sales Summary preview</h2>
          {summaryFileName ? <p className="mt-1 text-[0.8125rem] text-zinc-500 dark:text-zinc-400">{summaryFileName}</p> : null}
        </div>
        {rowCountLabel ? (
          <StatusPill variant="neutral">{rowCountLabel}</StatusPill>
        ) : (
          <StatusPill variant="neutral">
            {summaryData.rows.length} row{summaryData.rows.length !== 1 ? "s" : ""}
          </StatusPill>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className={metricCard}>
          <div className="text-[0.6875rem] font-medium uppercase tracking-[0.1em] text-zinc-500 dark:text-zinc-400">
            Gross sales
          </div>
          <div className="mt-1 text-2xl font-semibold tabular-nums tracking-[-0.03em] text-zinc-900 dark:text-white">
            {formatCurrency(rollup.grossSales)}
          </div>
        </div>
        <div className={metricCard}>
          <div className="text-[0.6875rem] font-medium uppercase tracking-[0.1em] text-zinc-500 dark:text-zinc-400">
            Net sales
          </div>
          <div className="mt-1 text-2xl font-semibold tabular-nums tracking-[-0.03em] text-zinc-900 dark:text-white">
            {formatCurrency(rollup.netAfterFees)}
          </div>
        </div>
        <div className={metricCard}>
          <div className="text-[0.6875rem] font-medium uppercase tracking-[0.1em] text-zinc-500 dark:text-zinc-400">
            Fees paid
          </div>
          <div className="mt-1 text-2xl font-semibold tabular-nums tracking-[-0.03em] text-zinc-900 dark:text-white">
            {formatCurrency(rollup.fees)}
          </div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {secondary.map(({ label, value }) => (
          <div
            key={label}
            className="rounded-lg border border-zinc-200/85 bg-zinc-50/80 px-3 py-2.5 dark:border-zinc-800/70 dark:bg-zinc-900/45"
          >
            <div className="text-[0.6875rem] font-medium text-zinc-500 dark:text-zinc-400">{label}</div>
            <div className="mt-0.5 text-sm font-semibold tabular-nums text-zinc-900 dark:text-zinc-50">{value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
