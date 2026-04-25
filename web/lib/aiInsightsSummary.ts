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
  "What happened: This window may be too thin for a strong pattern. Why it matters: One unusual week can mislead decisions. Smart next move: Compare another similar date range before changing pricing.",
  "What happened: Cost and net signals need a quick sanity check. Why it matters: Wrong fee or shipping assumptions can hide real performance. Smart next move: Reconcile summary totals with the marketplace export.",
] as const;

/**
 * Local coaching lines when the AI API is unavailable or returns invalid output.
 * 1–3 bullets: TCG marketplace-specific, evaluative, actionable.
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
      "What happened: Estimated net is negative in this window. Why it matters: Shipping and fee drag can erase profit even when sales are active. Smart next move: Recheck shipping settings and confirm reported fees match the marketplace export.",
    );
  }

  if (revenue > 0 && costs != null && costs > 0 && lines.length < 3) {
    const pct = Math.round((costs / revenue) * 1000) / 10;
    let label: string;
    if (pct < 22) label = "fairly lean";
    else if (pct <= 38) label = "in a normal range";
    else label = "a heavy slice of gross";
    lines.push(
      `What happened: Costs are about ${pct}% of gross in this period. Why it matters: This ${label} can cap profit per order. Smart next move: Review fee-heavy listings and low-value shipments first.`,
    );
    usedCostRatio = true;
  }

  if (fees > 0 && shipEst > 0 && lines.length < 3) {
    if (fees >= shipEst * 1.12) {
      lines.push(
        "What happened: Fees are a bigger margin drag than shipping in this export. Why it matters: More orders alone will not fix thin per-order net. Smart next move: Tighten pricing on fee-sensitive cards and monitor avg net per order.",
      );
    } else if (shipEst >= fees * 1.12) {
      lines.push(
        "What happened: Shipping pressure is higher than fee pressure in this window. Why it matters: Many low-value single orders can dilute profit fast. Smart next move: Prioritize inventory depth that helps buyers complete more cards per cart.",
      );
    }
  }

  if (
    aov != null &&
    aov > 0 &&
    Number.isFinite(aov) &&
    orders >= 1 &&
    lines.length < 3 &&
    !usedAovDollars
  ) {
    usedAovDollars = true;
    const a = fmtUsd(aov);
    if (aov < 18) {
      lines.push(
        `What happened: Average order value is ${a}, with likely many small single-need orders. Why it matters: Profit per shipment can stay thin despite steady traffic. Smart next move: Expand in-demand low-price inventory so buyers can fill multiple missing cards.`,
      );
    } else if (aov < 30) {
      lines.push(
        `What happened: Average order value is ${a}, suggesting mixed single-card and multi-card carts. Why it matters: Multi-card carts usually absorb shipping and fees better. Smart next move: Deepen overlapping set inventory so one buyer can find more needed cards.`,
      );
    } else {
      lines.push(
        `What happened: Average order value is ${a}, which points to larger carts. Why it matters: Your inventory likely matched several buyer needs in one stop. Smart next move: Repeat this category mix and confirm it holds across another date range.`,
      );
    }
  }

  if (
    avgNet != null &&
    Number.isFinite(avgNet) &&
    orders >= 1 &&
    lines.length < 3 &&
    !usedNetPerOrderDollars
  ) {
    usedNetPerOrderDollars = true;
    lines.push(
      `What happened: Net after costs is about ${fmtUsd(avgNet)} per order. Why it matters: This is the cleanest signal of whether current order mix is sustainable. Smart next move: Track this number weekly before making pricing changes.`,
    );
  }

  if (s.refunds != null && s.refunds > 0 && revenue > 0 && lines.length < 3) {
    const rPct = (s.refunds / revenue) * 100;
    if (rPct >= 2.5) {
      lines.push(
        `What happened: Refunds are about ${Math.round(rPct)}% of gross in this window. Why it matters: Returns can quietly erase gains from otherwise healthy sales. Smart next move: Check repeat refund SKUs before adjusting broad pricing.`,
      );
    }
  }

  const top = s.topProductsByRevenue[0];
  if (top && revenue > 0 && lines.length < 3) {
    const share = top.revenue / revenue;
    if (share >= 0.36) {
      const label = safeProductLabel(top.name);
      lines.push(
        `What happened: ${label} drives a large share of revenue. Why it matters: Heavy reliance on one line reduces repeatability if demand shifts. Smart next move: Add nearby inventory buyers often need in the same cart.`,
      );
    }
  }

  if (
    s.feeRate != null &&
    s.feeRate > 0 &&
    revenue > 0 &&
    lines.length < 3 &&
    !usedCostRatio
  ) {
    const fr = (s.feeRate * 100).toFixed(1);
    lines.push(
      `What happened: Effective fee rate is about ${fr}% of gross. Why it matters: Fee pressure sets a hard floor on profitable low-value orders. Smart next move: Audit low-margin cards where fees consume most of each sale.`,
    );
  }

  let out = dedupeInsightLines(lines).slice(0, 3);

  let fillerIdx = 0;
  while (out.length < 2 && fillerIdx < FALLBACK_FILLERS.length) {
    out = dedupeInsightLines([...out, FALLBACK_FILLERS[fillerIdx]]);
    fillerIdx++;
  }

  if (out.length === 0) {
    return [
      "What happened: No usable order and sales summary signals are available yet. Why it matters: Insights stay generic without marketplace export data. Smart next move: Import Order List and Sales Summary, then rerun insights.",
    ];
  }

  if (out.length === 1) {
    out = dedupeInsightLines([...out, FALLBACK_FILLERS[0]]);
  }

  return out.slice(0, 3);
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
