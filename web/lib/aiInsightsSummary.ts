import type { CsvData } from "./csvData";
import { aggregateWorkspaceDateRange } from "./importMetadata";
import type { ImportChunk } from "./importMerge";
import { findHeaderByNormalizedCandidates } from "./csvHeaderNormalize";
import {
  orderRowCheckoutTotal,
  toNumberLooseCell,
  type OrderListColumnMap,
} from "./orderListColumnMap";

export type AiInsightsProductSummary = {
  name: string;
  revenue: number;
  quantity: number;
};

export type AiInsightsSummaryPayload = {
  workspaceLabel: string;
  dateRange: { from: string; to: string } | null;
  totalRevenue: number;
  totalProfit: number | null;
  totalOrders: number;
  averageOrderValue: number | null;
  totalShippingCollected: number;
  estimatedFulfillmentShippingCost: number;
  totalFees: number | null;
  feeRate: number | null;
  refunds: number | null;
  /** Fees plus shipping counted against net (matches dashboard Costs card when available). */
  costsForNetDisplay: number | null;
  /** estimatedNet / orders when both are known. */
  avgNetPerOrder: number | null;
  topProductsByRevenue: AiInsightsProductSummary[];
};

const PRODUCT_LABEL_CANDIDATES = [
  "product name",
  "productname",
  "item name",
  "itemname",
  "item title",
  "itemtitle",
  "description",
  "product description",
  "productdescription",
  "card name",
  "cardname",
  "sku",
  "line item",
  "lineitem",
  "item",
];

function usedOrderColumnKeys(m: OrderListColumnMap): Set<string> {
  return new Set(
    [
      m.orderDateKey,
      m.orderTotalKey,
      m.productKey,
      m.shippingKey,
      m.assumedShippingKey,
      m.feesKey,
      m.payoutKey,
      m.itemCountKey,
      m.gameKey,
      m.orderIdKey,
    ].filter(Boolean) as string[],
  );
}

function pickProductLabelKey(headers: string[], m: OrderListColumnMap): string | null {
  const used = usedOrderColumnKeys(m);
  const fromCandidates = findHeaderByNormalizedCandidates(headers, PRODUCT_LABEL_CANDIDATES);
  if (fromCandidates && !used.has(fromCandidates)) return fromCandidates;
  if (m.gameKey) return m.gameKey;
  return null;
}

function aggregateTopProducts(
  data: CsvData,
  m: OrderListColumnMap,
  limit: number,
): AiInsightsProductSummary[] {
  const labelKey = pickProductLabelKey(data.headers, m);
  if (!labelKey) return [];

  const map = new Map<string, { revenue: number; quantity: number }>();
  for (const r of data.rows) {
    const raw = String(r[labelKey] ?? "").trim();
    const name = raw || "Unlabeled";
    const revenue = orderRowCheckoutTotal(r, m);
    const q = m.itemCountKey ? toNumberLooseCell(r[m.itemCountKey]) : 0;
    const quantity = q > 0 ? q : 1;
    const prev = map.get(name) ?? { revenue: 0, quantity: 0 };
    map.set(name, { revenue: prev.revenue + revenue, quantity: prev.quantity + quantity });
  }

  return [...map.entries()]
    .map(([name, v]) => ({ name, revenue: v.revenue, quantity: v.quantity }))
    .filter((p) => p.revenue > 0 || p.quantity > 0)
    .sort((a, b) => b.revenue - a.revenue || b.quantity - a.quantity)
    .slice(0, limit);
}

export type BuildAiInsightsSummaryInput = {
  workspaceStoreLabel: string;
  effectiveOrderImports: ImportChunk[];
  effectiveSummaryImports: ImportChunk[];
  derived: {
    orders: number;
    grossSales: number;
    shipping: number;
    fees: number | null;
    netAfterFees: number | null;
    refunds: number | null;
    aov: number | null;
  };
  estimatedNet: number | null;
  shippingEstimatedCost: number;
  feeRate: number | null;
  costsForNetDisplay: number | null;
  orderData: CsvData | null;
  orderColumnMap: OrderListColumnMap | null;
};

export function buildAiInsightsSummary(input: BuildAiInsightsSummaryInput): AiInsightsSummaryPayload {
  const range = aggregateWorkspaceDateRange(input.effectiveOrderImports, input.effectiveSummaryImports);
  const dateRange =
    range != null
      ? { from: range.from.toISOString().slice(0, 10), to: range.to.toISOString().slice(0, 10) }
      : null;

  let topProductsByRevenue: AiInsightsProductSummary[] = [];
  if (input.orderData && input.orderColumnMap?.ok) {
    topProductsByRevenue = aggregateTopProducts(input.orderData, input.orderColumnMap, 3);
  }

  const orders = input.derived.orders;
  let avgNetPerOrder: number | null = null;
  if (input.estimatedNet != null && Number.isFinite(input.estimatedNet) && orders > 0) {
    avgNetPerOrder = input.estimatedNet / orders;
  }

  return {
    workspaceLabel: input.workspaceStoreLabel || "Workspace",
    dateRange,
    totalRevenue: input.derived.grossSales,
    totalProfit: input.estimatedNet,
    totalOrders: orders,
    averageOrderValue: input.derived.aov,
    totalShippingCollected: input.derived.shipping,
    estimatedFulfillmentShippingCost: input.shippingEstimatedCost,
    totalFees: input.derived.fees,
    feeRate: input.feeRate,
    refunds: input.derived.refunds,
    costsForNetDisplay: input.costsForNetDisplay,
    avgNetPerOrder,
    topProductsByRevenue,
  };
}

export function canRequestAiInsights(input: {
  hasOrderImport: boolean;
  hasDashboardImport: boolean;
  derived: { grossSales: number; orders: number };
}): boolean {
  if (!input.hasOrderImport && !input.hasDashboardImport) return false;
  return input.derived.grossSales > 0 || input.derived.orders > 0;
}

function fmtUsd(n: number): string {
  if (!Number.isFinite(n)) return "$0";
  return n.toLocaleString(undefined, { style: "currency", currency: "USD" });
}

export function dedupeInsightLines(lines: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const s of lines) {
    const k = s.toLowerCase().replace(/\s+/g, " ").trim();
    if (!k || seen.has(k)) continue;
    seen.add(k);
    out.push(s.trim());
  }
  return out;
}

function safeProductLabel(name: string): string {
  return name.trim().replace(/["\n\r]/g, " ").slice(0, 52).trim() || "Top line";
}

function costBasisForRatio(s: AiInsightsSummaryPayload): number | null {
  if (s.costsForNetDisplay != null && s.costsForNetDisplay > 0) return s.costsForNetDisplay;
  const fees = s.totalFees;
  if (fees == null) return null;
  const sum = fees + s.estimatedFulfillmentShippingCost;
  return sum > 0 ? sum : null;
}

const FALLBACK_FILLERS = [
  "Next upload: compare cost ratio and basket size to this period so you can tell if margin is improving.",
  "If net looks off, confirm gross and fee columns in the Sales Summary match the marketplace report before changing prices.",
] as const;

/**
 * Local coaching lines when the AI API is unavailable or returns invalid output.
 * 2–4 bullets: evaluative, actionable, minimal number repetition.
 */
export function buildFallbackInsights(s: AiInsightsSummaryPayload): string[] {
  const revenue = s.totalRevenue;
  const orders = s.totalOrders;
  const fees = s.totalFees ?? 0;
  const shipEst = s.estimatedFulfillmentShippingCost;
  const aov = s.averageOrderValue;
  const profit = s.totalProfit;
  const avgNet = s.avgNetPerOrder;
  const costs = costBasisForRatio(s);

  const lines: string[] = [];
  let usedAovDollars = false;
  let usedNetPerOrderDollars = false;
  let usedCostRatio = false;

  if (profit != null && profit < 0 && revenue > 0) {
    lines.push(
      "Estimated net is negative with your current fee and shipping assumptions. Recheck Settings (shipping per order), then confirm the summary matches what the marketplace actually charged.",
    );
  }

  if (revenue > 0 && costs != null && costs > 0 && lines.length < 4) {
    const pct = Math.round((costs / revenue) * 1000) / 10;
    let label: string;
    if (pct < 22) label = "fairly lean";
    else if (pct <= 38) label = "in a normal range";
    else label = "a heavy slice of gross";
    lines.push(
      `Costs are about ${pct}% of gross sales (fees plus estimated shipping in your net). That is ${label} for marketplace selling.`,
    );
    usedCostRatio = true;
  }

  if (fees > 0 && shipEst > 0 && lines.length < 4) {
    if (fees >= shipEst * 1.12) {
      lines.push("Fees are the larger drag on profit than estimated shipping for this export.");
    } else if (shipEst >= fees * 1.12) {
      lines.push(
        "Estimated shipping hits margin harder than fees here. Small changes to fulfillment assumptions move net the most.",
      );
    }
  }

  if (
    aov != null &&
    aov > 0 &&
    Number.isFinite(aov) &&
    orders >= 1 &&
    lines.length < 4 &&
    !usedAovDollars
  ) {
    usedAovDollars = true;
    const a = fmtUsd(aov);
    if (aov < 18) {
      lines.push(
        `Average order value is ${a}. Bundling, cart minimums, or multi-item incentives usually lift basket size faster than chasing more tiny orders.`,
      );
    } else if (aov < 30) {
      lines.push(
        `Average order value is ${a}. Raising it above about $30 would widen profit per shipment without needing more buyers.`,
      );
    } else {
      lines.push(
        `Average order value is ${a}. Keep monitoring cost ratio as volume grows so margin does not slip while baskets look healthy.`,
      );
    }
  }

  if (
    avgNet != null &&
    Number.isFinite(avgNet) &&
    orders >= 1 &&
    lines.length < 4 &&
    !usedNetPerOrderDollars
  ) {
    usedNetPerOrderDollars = true;
    lines.push(
      `Net after costs averages about ${fmtUsd(avgNet)} per order. Use that when judging promos or small price moves.`,
    );
  }

  if (s.refunds != null && s.refunds > 0 && revenue > 0 && lines.length < 4) {
    const rPct = (s.refunds / revenue) * 100;
    if (rPct >= 2.5) {
      lines.push(
        `Refunds are about ${Math.round(rPct)}% of gross in this window. If that is unusual, inspect the worst SKUs or fulfillment issues before cutting prices.`,
      );
    }
  }

  const top = s.topProductsByRevenue[0];
  if (top && revenue > 0 && lines.length < 4) {
    const share = top.revenue / revenue;
    if (share >= 0.36) {
      const label = safeProductLabel(top.name);
      lines.push(
        `${label} carries a large share of revenue here. Strong, but thin demand elsewhere raises risk if that line slows.`,
      );
    }
  }

  if (
    s.feeRate != null &&
    s.feeRate > 0 &&
    revenue > 0 &&
    lines.length < 4 &&
    !usedCostRatio
  ) {
    const fr = (s.feeRate * 100).toFixed(1);
    lines.push(
      `Effective fee rate is about ${fr}% of gross. Build listing and promo math on that take, not on headline sales.`,
    );
  }

  let out = dedupeInsightLines(lines).slice(0, 4);

  let fillerIdx = 0;
  while (out.length < 2 && fillerIdx < FALLBACK_FILLERS.length) {
    out = dedupeInsightLines([...out, FALLBACK_FILLERS[fillerIdx]]);
    fillerIdx++;
  }

  if (out.length === 0) {
    return [
      "Import Order List and Sales Summary to unlock basket size, cost ratio, and per-order net from your own files.",
    ];
  }

  if (out.length === 1) {
    out = dedupeInsightLines([...out, FALLBACK_FILLERS[0]]);
  }

  return out.slice(0, 4);
}

/** Parse JSON body from /api/ai-insights: `{ "insights": [...] }` or a raw string array. */
export function parseInsightsResponseBody(body: unknown): string[] {
  if (body == null) return [];
  if (Array.isArray(body)) {
    return body
      .filter((x): x is string => typeof x === "string" && x.trim().length > 0)
      .map((x) => x.trim());
  }
  if (typeof body === "object" && body !== null && "insights" in body) {
    const ins = (body as { insights: unknown }).insights;
    if (Array.isArray(ins)) {
      return ins
        .filter((x): x is string => typeof x === "string" && x.trim().length > 0)
        .map((x) => x.trim());
    }
  }
  return [];
}
