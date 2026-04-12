"use client";

import { useMemo } from "react";
import { rollupSummaryMetrics } from "../../lib/importsInsights";
import type { CsvData } from "../../lib/csvData";
import StatusPill from "../StatusPill";

function formatCurrency(n: number | null | undefined) {
  if (n === null || n === undefined || Number.isNaN(n)) return "-";
  return n.toLocaleString(undefined, { style: "currency", currency: "USD" });
}

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
      <div className="app-panel-3d flex min-h-[220px] flex-col justify-center rounded-2xl border border-dashed border-slate-300/90 bg-white/90 p-8 text-center dark:border-slate-600/72 dark:bg-slate-900/55 sm:p-10">
        <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">Sales Summary preview</p>
        <p className="mt-2 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
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
    <div className="app-panel-3d rounded-2xl border border-slate-200/85 bg-white/96 p-6 dark:border-slate-700/75 dark:bg-slate-900/82 sm:p-8">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-4 dark:border-slate-800/80">
        <div>
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-50">Sales Summary preview</h2>
          {summaryFileName ? <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{summaryFileName}</p> : null}
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
        <div className="rounded-2xl border border-blue-200/80 bg-gradient-to-br from-blue-50/95 to-white px-4 py-4 dark:border-blue-900/50 dark:from-blue-950/40 dark:to-slate-950/80">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-blue-800/90 dark:text-blue-200/90">
            Gross sales
          </div>
          <div className="mt-1 text-2xl font-bold tabular-nums tracking-tight text-slate-900 dark:text-white">
            {formatCurrency(rollup.grossSales)}
          </div>
        </div>
        <div className="rounded-2xl border border-emerald-200/80 bg-gradient-to-br from-emerald-50/95 to-white px-4 py-4 dark:border-emerald-900/45 dark:from-emerald-950/35 dark:to-slate-950/80">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-emerald-800/90 dark:text-emerald-200/85">
            Net sales
          </div>
          <div className="mt-1 text-2xl font-bold tabular-nums tracking-tight text-slate-900 dark:text-white">
            {formatCurrency(rollup.netAfterFees)}
          </div>
        </div>
        <div className="rounded-2xl border border-amber-200/85 bg-gradient-to-br from-amber-50/95 to-white px-4 py-4 dark:border-amber-900/45 dark:from-amber-950/35 dark:to-slate-950/80">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-amber-900/85 dark:text-amber-100/90">
            Fees paid
          </div>
          <div className="mt-1 text-2xl font-bold tabular-nums tracking-tight text-slate-900 dark:text-white">
            {formatCurrency(rollup.fees)}
          </div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {secondary.map(({ label, value }) => (
          <div
            key={label}
            className="rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-2.5 dark:border-slate-700/60 dark:bg-slate-900/50"
          >
            <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">{label}</div>
            <div className="mt-0.5 text-sm font-semibold tabular-nums text-slate-900 dark:text-slate-50">{value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
