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

  return {
    workspaceLabel: input.workspaceStoreLabel || "Workspace",
    dateRange,
    totalRevenue: input.derived.grossSales,
    totalProfit: input.estimatedNet,
    totalOrders: input.derived.orders,
    averageOrderValue: input.derived.aov,
    totalShippingCollected: input.derived.shipping,
    estimatedFulfillmentShippingCost: input.shippingEstimatedCost,
    totalFees: input.derived.fees,
    feeRate: input.feeRate,
    refunds: input.derived.refunds,
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

function dedupeFallbackLines(lines: string[]): string[] {
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

/**
 * Short, local summaries when the AI API is unavailable or returns invalid output.
 * Same bullet-friendly shape as model insights.
 */
export function buildFallbackInsights(s: AiInsightsSummaryPayload): string[] {
  const lines: string[] = [];

  if (s.totalOrders > 0 || s.totalRevenue > 0) {
    lines.push(
      `You have ${s.totalOrders.toLocaleString()} orders with ${fmtUsd(s.totalRevenue)} in total revenue.`,
    );
  }
  if (s.averageOrderValue != null && s.averageOrderValue > 0 && Number.isFinite(s.averageOrderValue)) {
    lines.push(`Average order value is approximately ${fmtUsd(s.averageOrderValue)}.`);
  }
  const fees = s.totalFees ?? 0;
  const shipCost = s.estimatedFulfillmentShippingCost;
  if (fees + shipCost > 0) {
    lines.push(`Fees and shipping total about ${fmtUsd(fees + shipCost)}.`);
  }
  if (lines.length < 2 && s.totalProfit != null && Number.isFinite(s.totalProfit)) {
    lines.push(`Estimated net after fees and shipping is about ${fmtUsd(s.totalProfit)}.`);
  }
  if (lines.length < 2 && s.topProductsByRevenue[0]) {
    const top = s.topProductsByRevenue[0];
    lines.push(`Top line by revenue: ${top.name} at ${fmtUsd(top.revenue)}.`);
  }

  const out = dedupeFallbackLines(lines).slice(0, 3);
  if (out.length > 0) return out;
  return ["Your dashboard totals are ready from the latest import."];
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
