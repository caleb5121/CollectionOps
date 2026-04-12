import type { TrendPoint } from "./trendPoint";

export type DataConfidence = "low" | "medium" | "high";

function avg(nums: number[]): number {
  if (nums.length === 0) return 0;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

/** Compare first vs second half of a series; % change. */
export function halfOverHalfPct(series: number[]): number | null {
  if (series.length < 2) return null;
  const mid = Math.floor(series.length / 2);
  const first = series.slice(0, mid);
  const second = series.slice(mid);
  const sum1 = first.reduce((a, b) => a + b, 0);
  const sum2 = second.reduce((a, b) => a + b, 0);
  if (sum1 === 0 && sum2 === 0) return null;
  if (sum1 === 0) return sum2 > 0 ? 100 : null;
  return ((sum2 - sum1) / sum1) * 100;
}

export function subtleChangeHint(pct: number | null): string {
  if (pct == null || Number.isNaN(pct)) return "-";
  if (Math.abs(pct) < 4) return "steady";
  const arrow = pct >= 0 ? "↑" : "↓";
  return `${arrow} ${Math.abs(pct).toFixed(0)}%`;
}

export function computeDataConfidence(trendData: TrendPoint[]): DataConfidence {
  const n = trendData.length;
  if (n < 10) return "low";
  if (n < 21) return "medium";
  const zeroDays = trendData.filter((p) => p.orders === 0 && p.revenue === 0).length;
  const inactiveRatio = n > 0 ? zeroDays / n : 0;
  if (inactiveRatio > 0.35) return "medium";
  return "high";
}

export function mapMomentumStatus(score: number): string {
  if (score >= 70) return "Strong";
  if (score >= 45) return "Stable";
  return "Low";
}

/** Higher score = more efficient (lower fees relative to sales). */
export function mapFeeEfficiencyStatus(score: number): string {
  if (score >= 70) return "Efficient";
  if (score >= 45) return "Balanced";
  return "High Fees";
}

export function mapOrderStrengthStatus(score: number): string {
  if (score >= 70) return "High Value";
  if (score >= 45) return "Average";
  return "Low Value";
}

export function buildPerformanceInsight(params: {
  confidence: DataConfidence;
  trendData: TrendPoint[];
  feeRate: number | null;
  orderStrengthScore: number;
}): string {
  const { confidence, trendData, feeRate, orderStrengthScore } = params;

  if (confidence === "low") {
    return "Not enough data yet to identify reliable trends. Upload more data to unlock insights.";
  }
  if (confidence === "medium") {
    return "Sales show early signs of change, but more data is needed for reliable trends.";
  }

  const rev = trendData.map((p) => p.revenue);
  const ord = trendData.map((p) => p.orders);
  const n = rev.length;
  if (n < 3) {
    return "Sales patterns look relatively steady across this period.";
  }

  const earlyR = avg(rev.slice(0, Math.max(1, Math.ceil(n / 3))));
  const lateR = avg(rev.slice(Math.floor((2 * n) / 3)));
  const earlyO = avg(ord.slice(0, Math.max(1, Math.ceil(n / 3))));
  const lateO = avg(ord.slice(Math.floor((2 * n) / 3)));

  const parts: string[] = [];

  const zeroDays = trendData.filter((p) => p.orders === 0 || p.revenue <= 0).length;
  if (n > 0 && zeroDays / n > 0.25) {
    parts.push("Sales activity is inconsistent, with several inactive days.");
  }

  if (lateR < earlyR * 0.88 && earlyR > 0) {
    parts.push("Sales activity decreased toward the end of the period.");
  } else if (lateR > earlyR * 1.12 && earlyR >= 0) {
    parts.push("Sales activity increased toward the end of the period.");
  }

  if (feeRate != null && feeRate > 0.14) {
    parts.push("Fees are taking a noticeable portion of your sales.");
  }

  if (orderStrengthScore < 55 && lateO <= earlyO * 1.15) {
    parts.push("Average order size stays modest relative to fees across the period.");
  }

  if (parts.length === 0) {
    return "Sales patterns look relatively steady across this period.";
  }

  return parts.slice(0, 2).join(" ");
}

export type InsightTone = "positive" | "caution" | "negative" | "neutral";

export type TopInsight = {
  headline: string;
  supporting: string;
  tone: InsightTone;
};

function num(v: unknown): number {
  if (v === null || v === undefined) return 0;
  const s = String(v).trim();
  if (!s) return 0;
  const cleaned = s.replace(/[^0-9.-]/g, "");
  const n = Number(cleaned);
  return Number.isNaN(n) ? 0 : n;
}

/** Per-order estimated return after allocating fees evenly and subtracting assumed shipping (order-level, not card-level). */
export function perOrderEstimatedNetReturns(params: {
  rows: Record<string, string>[];
  totalKey: string;
  feesTotal: number | null;
  shippingPerOrder: number;
}): number[] {
  const n = params.rows.length;
  if (n === 0) return [];
  const feeAlloc = params.feesTotal != null ? params.feesTotal / n : 0;
  return params.rows.map((r) => num(r[params.totalKey]) - feeAlloc - params.shippingPerOrder);
}

/** Share of total estimated net attributable to the top `fraction` of orders by estimated net (desc). */
export function topFractionShareOfTotal(nets: number[], fraction: number): number | null {
  if (nets.length === 0) return null;
  const total = nets.reduce((a, b) => a + b, 0);
  if (Math.abs(total) < 1e-9) return null;
  const sorted = [...nets].sort((a, b) => b - a);
  const k = Math.max(1, Math.ceil(fraction * nets.length));
  const topSum = sorted.slice(0, k).reduce((a, b) => a + b, 0);
  return (topSum / total) * 100;
}

export function buildTopThreeInsights(params: {
  confidence: DataConfidence;
  daysAnalyzed: number | null;
  orderCount: number;
  hasOrderImport: boolean;
  hasDashboardImport: boolean;
  /** Order list rows (transaction-level). */
  orderRows: Record<string, string>[] | null;
  orderTotalKey: string;
  buckets: { under5: number; fiveTo10: number; tenTo20: number; over20: number } | null;
  fees: number | null;
  shippingPerOrder: number;
  grossSales: number;
  youMade: number | null;
  feeRate: number | null;
  ordersFromSummary: number;
  avgNetPerOrder: number | null;
}): TopInsight[] {
  const {
    confidence,
    daysAnalyzed,
    orderCount,
    hasOrderImport,
    hasDashboardImport,
    orderRows,
    orderTotalKey,
    buckets,
    fees,
    shippingPerOrder,
    grossSales,
    youMade,
    feeRate,
    ordersFromSummary,
    avgNetPerOrder,
  } = params;

  const sampleSoft =
    confidence === "low"
      ? "Short sample - read this as directional, not definitive."
      : confidence === "medium"
        ? "Limited window - patterns may shift with more days."
        : null;

  const nets =
    hasOrderImport && orderRows && orderRows.length > 0
      ? perOrderEstimatedNetReturns({
          rows: orderRows,
          totalKey: orderTotalKey,
          feesTotal: fees,
          shippingPerOrder,
        })
      : null;

  const lowCheckoutShare =
    buckets && orderCount > 0 ? (buckets.under5 / orderCount) * 100 : null;

  const lossOrderShare =
    nets && nets.length > 0 ? (nets.filter((x) => x < 0).length / nets.length) * 100 : null;

  const conc = nets && nets.length >= 5 ? topFractionShareOfTotal(nets, 0.2) : null;

  const out: TopInsight[] = [];

  // --- Insight 1: order value / low-return share (outcome framing)
  if (lowCheckoutShare != null && orderCount >= 3) {
    const strong = lowCheckoutShare >= 40;
    out.push({
      headline:
        strong
          ? "A large share of orders were small checkouts"
          : "Order checkouts spread across several dollar bands",
      supporting: [
        `${lowCheckoutShare.toFixed(0)}% of orders were under $5 at checkout (order total, not individual cards).`,
        strong
          ? "That mix often means a lot of packing activity relative to headline revenue - net depends on fees and your shipping assumptions."
          : "This is one snapshot of buyer behavior in your export window - not something you can fully steer.",
        sampleSoft,
      ]
        .filter(Boolean)
        .join(" "),
      tone: strong ? "caution" : "neutral",
    });
  } else if (hasDashboardImport && !hasOrderImport) {
    out.push({
      headline: "Order-level detail is not in this workspace yet",
      supporting:
        "Add an Order List export to see checkout distribution and order-level estimates. The dashboard still uses your Sales Summary for totals.",
      tone: "neutral",
    });
  }

  // --- Insight 2: concentration or fees
  if (youMade != null && youMade < 0 && hasDashboardImport) {
    out.push({
      headline: "Estimated net is negative under current assumptions",
      supporting:
        "That usually means fees plus assumed shipping outpaced what this export attributes to sales. Adjust shipping assumptions in Settings or verify the summary lines.",
      tone: "negative",
    });
  } else if (conc != null && nets && nets.length >= 8) {
    const topHeavy = conc >= 55;
    const highVol = orderCount >= 80;
    out.push({
      headline: topHeavy
        ? "Estimated profit is concentrated in a minority of orders"
        : "Estimated profit is spread more evenly across orders",
      supporting: [
        `About ${Math.min(100, Math.max(0, conc)).toFixed(0)}% of estimated net (fees allocated evenly per order, shipping assumed) sits in the top 20% of orders by estimated return.`,
        highVol
          ? "At higher volume, concentration and outliers matter more than a single average."
          : null,
        sampleSoft,
      ]
        .filter(Boolean)
        .join(" "),
      tone: topHeavy ? "caution" : "positive",
    });
  } else if (feeRate != null && feeRate > 0.14 && hasDashboardImport) {
    out.push({
      headline: "Fees take a noticeable slice of gross sales",
      supporting: `Effective fee rate is about ${(feeRate * 100).toFixed(1)}% of gross in this summary - a normal marketplace constraint, not something you toggle per buyer. ${sampleSoft ?? ""}`.trim(),
      tone: "caution",
    });
  }

  // --- Insight 3: store DNA / effort vs reward
  const netPer = avgNetPerOrder;
  if (netPer != null && orderCount >= 5 && hasDashboardImport) {
    const highEffortLowMargin = orderCount >= 25 && netPer < 4;
    const concentrated = orderCount < 25 && netPer >= 8;
    if (highEffortLowMargin) {
      out.push({
        headline: "High activity, modest estimated net per order",
        supporting:
          "Many orders in this window with relatively small estimated net per order after fees and assumed shipping - a common pattern when buyers buy small baskets. This describes workload vs payout, not a pricing prescription.",
        tone: "caution",
      });
    } else if (concentrated) {
      out.push({
        headline: "Fewer orders, stronger estimated net per order",
        supporting:
          "Volume is lower but estimated net per order is higher - an outcome snapshot for this export only.",
        tone: "positive",
      });
    } else if (lossOrderShare != null && lossOrderShare >= 15 && nets && nets.length >= 10) {
      out.push({
        headline: "A notable share of orders look negative on estimated net",
        supporting: `${lossOrderShare.toFixed(0)}% of orders are below zero after even fee allocation and assumed shipping - worth checking assumptions or summary alignment, not card-level pricing.`,
        tone: "negative",
      });
    } else {
      out.push({
        headline: "Mixed return profile across this window",
        supporting:
          "Orders combine stronger and weaker estimated outcomes - typical for marketplace selling where basket size varies.",
        tone: "neutral",
      });
    }
  }

  // --- Backfill to exactly 3 with summary-only insights
  while (out.length < 3 && hasDashboardImport) {
    if (out.length === 0) {
      out.push({
        headline:
          grossSales > 0
            ? `Gross sales landed around ${grossSales.toLocaleString(undefined, { style: "currency", currency: "USD" })}`
            : "Sales summary is present but gross looks empty",
        supporting:
          ordersFromSummary > 0
            ? `Across about ${Math.round(ordersFromSummary)} orders in the summary row(s). Refunds in CSV may be incomplete - treat net as approximate.`
            : "Check that GrossSales and OrderCount populated correctly in your export.",
        tone: grossSales > 0 ? "neutral" : "caution",
      });
      continue;
    }
    if (out.length === 1 && !out.some((x) => x.headline.toLowerCase().includes("fee"))) {
      out.push({
        headline: "Totals come from your Sales Summary rows",
        supporting:
          "CardOps does not infer SKUs or games from line items - only what your CSV aggregates. Mixed inventory still rolls up here as one store outcome.",
        tone: "neutral",
      });
      continue;
    }
    out.push({
      headline: "Compare uploads later",
      supporting:
        "This workspace is built so you can add another export later and compare periods - shipping profiles and benchmarks are on the roadmap.",
      tone: "neutral",
    });
  }

  if (out.length === 0) {
    return [
      {
        headline: "Import data to see order-level outcomes",
        supporting: "Add a Sales Summary for totals and an Order List for distribution and estimates.",
        tone: "neutral",
      },
      {
        headline: "Assumptions stay visible",
        supporting: "Shipping and net figures use your Settings assumptions - not measured per package.",
        tone: "neutral",
      },
      {
        headline: "No buyer steering",
        supporting:
          "Insights describe what happened in the export - not levers to force basket sizes.",
        tone: "neutral",
      },
    ];
  }

  return out.slice(0, 3);
}
