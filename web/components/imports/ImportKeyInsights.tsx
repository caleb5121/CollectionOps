"use client";

import { useMemo } from "react";
import {
  combinedShippingInterpretation,
  computePerOrderFromSummary,
  orderBucketsTakeaway,
  shippingNetEstimate,
  type OrderBuckets,
  type SummaryRollup,
} from "../../lib/importsInsights";

function formatCurrency(n: number | null | undefined) {
  if (n === null || n === undefined || Number.isNaN(n)) return "-";
  return n.toLocaleString(undefined, { style: "currency", currency: "USD" });
}

export function ImportKeyInsights({
  hasSummary,
  hasOrders,
  summaryRollup,
  orderBuckets,
  ordersFromList,
  estimatedShippingPerOrder,
}: {
  hasSummary: boolean;
  hasOrders: boolean;
  summaryRollup: SummaryRollup | null;
  orderBuckets: OrderBuckets | null;
  ordersFromList: number;
  estimatedShippingPerOrder: number;
}) {
  const perOrder = useMemo(() => {
    if (!hasSummary || !summaryRollup || summaryRollup.orders <= 0) return null;
    return computePerOrderFromSummary(summaryRollup);
  }, [hasSummary, summaryRollup]);

  const shippingNet = useMemo(() => {
    if (!hasSummary || !hasOrders || !summaryRollup) return null;
    const oc = summaryRollup.orders > 0 ? summaryRollup.orders : ordersFromList;
    if (oc <= 0) return null;
    return shippingNetEstimate({
      shippingCollected: summaryRollup.shipping,
      orderCountForCalc: oc,
      estimatedShippingPerOrder,
    });
  }, [hasSummary, hasOrders, summaryRollup, ordersFromList, estimatedShippingPerOrder]);

  const bucketInsight = useMemo(() => {
    if (!orderBuckets || ordersFromList <= 0) return null;
    return orderBucketsTakeaway(orderBuckets, ordersFromList);
  }, [orderBuckets, ordersFromList]);

  const narrativeLines = useMemo(() => {
    const lines: string[] = [];
    if (perOrder) {
      lines.push(`You average ${formatCurrency(perOrder.avgNetPerOrder)} net per order.`);
      lines.push(
        `About ${formatCurrency(perOrder.feeImpactPerOrder)} per order sits between gross and net (fees and similar lines in the export).`,
      );
      if (perOrder.effectiveFeeRate != null && summaryRollup && summaryRollup.grossSales > 0) {
        lines.push(`Effective fee rate is about ${(perOrder.effectiveFeeRate * 100).toFixed(1)}% of gross.`);
      }
    }
    if (bucketInsight?.line) {
      lines.push(bucketInsight.line);
    }
    if (shippingNet != null && hasSummary && hasOrders) {
      lines.push(combinedShippingInterpretation(shippingNet));
    }
    return lines.slice(0, 5);
  }, [perOrder, bucketInsight, shippingNet, hasSummary, hasOrders, summaryRollup]);

  if (!hasSummary && !hasOrders) return null;
  if (narrativeLines.length === 0) return null;

  return (
    <div className="rounded-xl border border-zinc-200/90 bg-white px-5 py-5 shadow-sm dark:border-zinc-800/80 dark:bg-zinc-950/45 sm:px-6">
      <h3 className="text-[0.6875rem] font-medium uppercase tracking-[0.1em] text-zinc-500 dark:text-zinc-400">Key insights</h3>
      <p className="mt-2 text-[0.8125rem] leading-relaxed text-zinc-600 dark:text-zinc-400">
        Pulled from the CSVs in this workspace - processed locally in your browser.
      </p>
      <ul className="mt-4 space-y-2.5 text-sm font-medium leading-snug text-zinc-800 dark:text-zinc-100">
        {narrativeLines.map((line, i) => (
          <li key={i} className="flex gap-2">
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[color:var(--accent)]" aria-hidden />
            <span>{line}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
