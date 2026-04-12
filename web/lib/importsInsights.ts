/** Pure helpers for Imports page insight copy - no React. */

export type SummaryRollup = {
  orders: number;
  grossSales: number;
  netAfterFees: number;
  fees: number;
  shipping: number;
  refunds: number;
};

export function rollupSummaryMetrics(rows: { OrderCount?: string; GrossSales?: string; NetSalesMinusFees?: string; TotalFees?: string; ShippingAmount?: string; RefundAmount?: string }[]): SummaryRollup {
  let orders = 0,
    grossSales = 0,
    netAfterFees = 0,
    fees = 0,
    shipping = 0,
    refunds = 0;
  const toN = (v: string | undefined) => {
    const s = String(v ?? "").trim().replace(/[^0-9.-]/g, "");
    const n = Number(s);
    return Number.isNaN(n) ? 0 : n;
  };
  for (const r of rows) {
    orders += toN(r.OrderCount);
    grossSales += toN(r.GrossSales);
    netAfterFees += toN(r.NetSalesMinusFees);
    fees += toN(r.TotalFees);
    shipping += toN(r.ShippingAmount);
    refunds += toN(r.RefundAmount);
  }
  return { orders, grossSales, netAfterFees, fees, shipping, refunds };
}

export type PerOrderSummary = {
  avgGrossPerOrder: number;
  avgNetPerOrder: number;
  feeImpactPerOrder: number;
  effectiveFeeRate: number | null;
} | null;

export function computePerOrderFromSummary(rollup: SummaryRollup): PerOrderSummary {
  if (rollup.orders <= 0) return null;
  const avgGrossPerOrder = rollup.grossSales / rollup.orders;
  const avgNetPerOrder = rollup.netAfterFees / rollup.orders;
  const feeImpactPerOrder = (rollup.grossSales - rollup.netAfterFees) / rollup.orders;
  const effectiveFeeRate = rollup.grossSales > 0 ? rollup.fees / rollup.grossSales : null;
  return { avgGrossPerOrder, avgNetPerOrder, feeImpactPerOrder, effectiveFeeRate };
}

export function shippingNetEstimate(params: {
  shippingCollected: number;
  orderCountForCalc: number;
  estimatedShippingPerOrder: number;
}): number {
  return params.shippingCollected - params.orderCountForCalc * params.estimatedShippingPerOrder;
}

export type OrderBuckets = { under5: number; fiveTo10: number; tenTo20: number; over20: number };

export function orderBucketsTakeaway(buckets: OrderBuckets, total: number): { line: string; detail?: string } {
  if (total <= 0) return { line: "Add order rows to see how checkout totals cluster." };
  const u5 = buckets.under5 / total;
  const f5 = buckets.fiveTo10 / total;
  const t10 = buckets.tenTo20 / total;
  const o20 = buckets.over20 / total;

  const maxShare = Math.max(u5, f5, t10, o20);
  let line = "";
  if (u5 === maxShare && u5 >= 0.35) {
    line = "Most of your orders are under $5.";
  } else if (f5 === maxShare && f5 >= 0.35) {
    line = "Your volume is concentrated in the $5–10 range.";
  } else if (t10 === maxShare && t10 >= 0.3) {
    line = "A large share of orders fall in the $10–20 band.";
  } else if (o20 === maxShare && o20 >= 0.25) {
    line = "A notable share of orders are $20+ checkouts.";
  } else if (t10 + o20 >= u5 + f5 && t10 + o20 > 0.35) {
    line = "Mid-to-higher checkouts ($10+) make up a solid share of your order count.";
  } else {
    line = "Order sizes are spread across bands - no single range dominates.";
  }

  const revenueShare = (bandCount: number, low: number, high: number) =>
    bandCount > 0 ? ` ~${((bandCount / total) * 100).toFixed(0)}% of orders between $${low}–${high}` : "";

  let detail: string | undefined;
  if (o20 + t10 >= u5 + f5 && o20 + t10 > 0.25) {
    detail = "Higher-value bands often carry more of the headline revenue in the same order count.";
  }

  return { line, detail };
}

export function combinedShippingInterpretation(shippingNet: number): string {
  if (shippingNet > 15) {
    return "Shipping collected is covering your assumed per-order cost with room left - on these numbers, postage isn’t dragging net.";
  }
  if (shippingNet < -15) {
    return "After your assumed packing cost, buyer-paid shipping may not fully cover what you spend to ship - worth revisiting Settings.";
  }
  return "Shipping collected and your assumed cost are in the same ballpark - small swings in either direction change the story.";
}
