import { findHeaderByNormalizedCandidates, normalizeHeaderKey } from "./csvHeaderNormalize";

export type OrderListColumnMap = {
  ok: boolean;
  /** Required for date range / trends */
  orderDateKey: string | null;
  /** Checkout / gross per order (single column) */
  orderTotalKey: string | null;
  productKey: string | null;
  /** Buyer / collected shipping (not assumed fulfillment cost). */
  shippingKey: string | null;
  /** Per-row assumed fulfillment / shipping cost (e.g. estimated_shipping_usd). */
  assumedShippingKey: string | null;
  feesKey: string | null;
  payoutKey: string | null;
  itemCountKey: string | null;
  gameKey: string | null;
  orderIdKey: string | null;
  missingRequired: string[];
  /** Normalized keys we mapped to roles */
  rolesMatched: string[];
};

const ORDER_DATE_CANDIDATES = [
  "order date",
  "orderdate",
  "order_date",
  "purchase date",
  "purchasedate",
  "ship date",
  "shipdate",
  "sale date",
  "saledate",
];

const ORDER_TOTAL_CANDIDATES = [
  "total amt",
  "totalamt",
  "order total",
  "ordertotal",
  "order_total",
  "checkout total",
  "checkouttotal",
  "grand total",
  "grandtotal",
  "order amount",
  "orderamount",
];

const PRODUCT_CANDIDATES = ["product amt", "productamt", "product amount", "subtotal", "items total", "itemstotal"];

const SHIPPING_CANDIDATES = [
  "shipping amt",
  "shippingamt",
  "shipping amount",
  "shippingamount",
  "shipping collected",
  "shippingcollected",
  "shipping",
  "buyer shipping",
  "buyershipping",
];

/** Fulfillment / assumed cost columns - excluded from gross and from buyer-paid shipping totals. */
const ASSUMED_SHIPPING_COST_CANDIDATES = [
  "estimated shipping usd",
  "estimatedshippingusd",
  "estimated_shipping_usd",
  "assumed shipping",
  "assumedshipping",
  "assumed shipping cost",
  "assumedshippingcost",
  "fulfillment cost",
  "fulfillmentcost",
];

const FEES_CANDIDATES = [
  "total fees",
  "totalfees",
  "marketplace fees",
  "marketplacefees",
  "marketplace_fees",
  "fees",
  "fee total",
  "feetotal",
  "tcgplayer fees",
  "tcgplayerfees",
];

const PAYOUT_CANDIDATES = [
  "net sales minus fees",
  "netsalesminusfees",
  "payout usd",
  "payoutusd",
  "payout_usd",
  "payout",
  "net payout",
  "netpayout",
  "seller payout",
  "sellerpayout",
];

const ITEM_COUNT_CANDIDATES = [
  "item count",
  "itemcount",
  "item_count",
  "quantity",
  "qty",
  "line items",
  "lineitems",
  "items",
];

const GAME_CANDIDATES = ["game", "label", "tcg", "product line", "productline", "category"];

const ORDER_ID_CANDIDATES = ["order id", "orderid", "order_id", "transaction id", "transactionid"];

function pick(headers: string[], candidates: string[]): string | null {
  return findHeaderByNormalizedCandidates(headers, candidates);
}

/**
 * Required for CardOps order math: order date + (total column OR both product and shipping).
 */
export function resolveOrderListColumnMap(headers: string[]): OrderListColumnMap {
  const orderDateKey = pick(headers, ORDER_DATE_CANDIDATES);
  const orderTotalKey = pick(headers, ORDER_TOTAL_CANDIDATES);
  const productKey = pick(headers, PRODUCT_CANDIDATES);
  const assumedShippingKey = pick(headers, ASSUMED_SHIPPING_COST_CANDIDATES);
  const shippingKey = pick(headers, SHIPPING_CANDIDATES);
  const feesKey = pick(headers, FEES_CANDIDATES);
  const payoutKey = pick(headers, PAYOUT_CANDIDATES);
  const itemCountKey = pick(headers, ITEM_COUNT_CANDIDATES);
  const gameKey = pick(headers, GAME_CANDIDATES);
  const orderIdKey = pick(headers, ORDER_ID_CANDIDATES);

  const missingRequired: string[] = [];
  if (!orderDateKey) missingRequired.push("order_date (or Order Date, purchase date, …)");
  const hasTotal = Boolean(orderTotalKey) || (Boolean(productKey) && Boolean(shippingKey));
  if (!hasTotal) {
    missingRequired.push("order_total / Total Amt (or Product Amt + Shipping Amt)");
  }

  const ok = Boolean(orderDateKey) && hasTotal;

  const rolesMatched: string[] = [];
  if (orderDateKey) rolesMatched.push("orderDate");
  if (orderTotalKey) rolesMatched.push("orderTotal");
  if (productKey) rolesMatched.push("product");
  if (shippingKey) rolesMatched.push("shipping");
  if (assumedShippingKey) rolesMatched.push("assumedShipping");
  if (feesKey) rolesMatched.push("fees");
  if (payoutKey) rolesMatched.push("payout");
  if (itemCountKey) rolesMatched.push("itemCount");
  if (gameKey) rolesMatched.push("game");
  if (orderIdKey) rolesMatched.push("orderId");

  return {
    ok,
    orderDateKey,
    orderTotalKey,
    productKey,
    shippingKey,
    assumedShippingKey,
    feesKey,
    payoutKey,
    itemCountKey,
    gameKey,
    orderIdKey,
    missingRequired,
    rolesMatched,
  };
}

export function orderListRowsParsedCount(data: { rows: unknown[] }): number {
  return data.rows.length;
}

/** Debug: raw headers + normalized list */
export function debugOrderListHeaders(headers: string[]): { raw: string[]; normalized: string[] } {
  return {
    raw: headers.map((h) => String(h ?? "").trim()).filter(Boolean),
    normalized: headers.map((h) => normalizeHeaderKey(String(h ?? ""))).filter((k) => k.length > 0),
  };
}

export function toNumberLooseCell(v: unknown): number {
  if (v === null || v === undefined) return 0;
  const s = String(v).trim();
  if (!s) return 0;
  const cleaned = s.replace(/[^0-9.-]/g, "");
  const n = Number(cleaned);
  return Number.isNaN(n) ? 0 : n;
}

/** Single-row checkout total using mapped columns (Total Amt, order_total, or product + shipping). */
export function orderRowCheckoutTotal(r: Record<string, string>, m: OrderListColumnMap): number {
  if (m.orderTotalKey) return toNumberLooseCell(r[m.orderTotalKey]);
  if (m.productKey && m.shippingKey) {
    return toNumberLooseCell(r[m.productKey]) + toNumberLooseCell(r[m.shippingKey]);
  }
  return 0;
}
