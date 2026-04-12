import { findHeaderByNormalizedCandidates } from "./csvHeaderNormalize";

export type SalesSummaryColumnMap = {
  ok: boolean;
  orderCountKey: string | null;
  grossSalesKey: string | null;
  shippingKey: string | null;
  feesKey: string | null;
  netKey: string | null;
  refundsKey: string | null;
  missingRequired: string[];
  rolesMatched: string[];
};

function pick(headers: string[], candidates: string[]): string | null {
  return findHeaderByNormalizedCandidates(headers, candidates);
}

const ORDER_COUNT = [
  "ordercount",
  "order_count",
  "orders",
  "order count",
  "number of orders",
  "numberoforders",
];

const GROSS = [
  "grosssales",
  "gross_sales",
  "gross sales",
  "total sales",
  "totalsales",
  "gross revenue",
  "grossrevenue",
];

const FEES = ["totalfees", "total_fees", "total fees", "fees", "marketplace fees", "marketplacefees"];

const NET = [
  "netsalesminusfees",
  "net sales minus fees",
  "net_sales_minus_fees",
  "net sales",
  "netsales",
  "net revenue",
  "netrevenue",
  "payout",
];

const SHIPPING = ["shippingamount", "shipping_amount", "shipping amount", "shipping total", "shippingtotal"];

const REFUNDS = ["refundamount", "refund_amount", "refund amount", "refunds", "total refunds", "totalrefunds"];

/**
 * Dashboard math expects order count, gross, fees, net at minimum (TCGplayer-style).
 */
export function resolveSalesSummaryColumnMap(headers: string[]): SalesSummaryColumnMap {
  const orderCountKey = pick(headers, ORDER_COUNT);
  const grossSalesKey = pick(headers, GROSS);
  const feesKey = pick(headers, FEES);
  const netKey = pick(headers, NET);
  const shippingKey = pick(headers, SHIPPING);
  const refundsKey = pick(headers, REFUNDS);

  const missingRequired: string[] = [];
  if (!orderCountKey) missingRequired.push("OrderCount (or order_count, orders…)");
  if (!grossSalesKey) missingRequired.push("GrossSales (or gross_sales…)");
  if (!feesKey) missingRequired.push("TotalFees (or marketplace_fees…)");
  if (!netKey) missingRequired.push("NetSalesMinusFees (or net / payout column…)");

  const ok = Boolean(orderCountKey && grossSalesKey && feesKey && netKey);

  const rolesMatched: string[] = [];
  if (orderCountKey) rolesMatched.push("orderCount");
  if (grossSalesKey) rolesMatched.push("grossSales");
  if (feesKey) rolesMatched.push("fees");
  if (netKey) rolesMatched.push("net");
  if (shippingKey) rolesMatched.push("shipping");
  if (refundsKey) rolesMatched.push("refunds");

  return {
    ok,
    orderCountKey,
    grossSalesKey,
    shippingKey,
    feesKey,
    netKey,
    refundsKey,
    missingRequired,
    rolesMatched,
  };
}
