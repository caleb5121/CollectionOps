import type { CsvData } from "./csvData";
import { debugOrderListHeaders, resolveOrderListColumnMap } from "./orderListColumnMap";
import { resolveSalesSummaryColumnMap } from "./salesSummaryColumnMap";

export function analyzeOrderCsv(fileName: string, data: CsvData): {
  mapped: boolean;
  missingRequired: string[];
  detectedHeaders: string[];
  rowCount: number;
} {
  const map = resolveOrderListColumnMap(data.headers);
  const dbg = debugOrderListHeaders(data.headers);
  const rowCount = data.rows.length;

  const payload = {
    file: fileName,
    kind: "order" as const,
    rowsParsed: rowCount,
    mappingOk: map.ok,
    columnsRaw: dbg.raw,
    columnsNormalized: dbg.normalized,
    keysResolved: {
      orderDate: map.orderDateKey,
      orderTotal: map.orderTotalKey,
      product: map.productKey,
      shipping: map.shippingKey,
      assumedShipping: map.assumedShippingKey,
      fees: map.feesKey,
      payout: map.payoutKey,
    },
    missingRequiredForCalculations: map.missingRequired,
    rolesMatched: map.rolesMatched,
  };

  if (map.ok) {
    console.info("[CardOps CSV] Order list - mapped for calculations", payload);
  } else {
    console.warn("[CardOps CSV] Order list - loaded but NOT mapped for calculations", payload);
  }

  return {
    mapped: map.ok,
    missingRequired: map.missingRequired,
    detectedHeaders: dbg.raw,
    rowCount,
  };
}

export function analyzeSummaryCsv(fileName: string, data: CsvData): {
  mapped: boolean;
  missingRequired: string[];
  detectedHeaders: string[];
  rowCount: number;
} {
  const map = resolveSalesSummaryColumnMap(data.headers);
  const headers = data.headers.map((h) => String(h ?? "").trim()).filter(Boolean);
  const rowCount = data.rows.length;

  const payload = {
    file: fileName,
    kind: "summary" as const,
    rowsParsed: rowCount,
    mappingOk: map.ok,
    columnsRaw: headers,
    keysResolved: {
      orderCount: map.orderCountKey,
      grossSales: map.grossSalesKey,
      fees: map.feesKey,
      net: map.netKey,
      shipping: map.shippingKey,
      refunds: map.refundsKey,
    },
    missingRequiredForCalculations: map.missingRequired,
    rolesMatched: map.rolesMatched,
  };

  if (map.ok) {
    console.info("[CardOps CSV] Sales summary - mapped for calculations", payload);
  } else {
    console.warn("[CardOps CSV] Sales summary - loaded but NOT mapped for calculations", payload);
  }

  return {
    mapped: map.ok,
    missingRequired: map.missingRequired,
    detectedHeaders: headers,
    rowCount,
  };
}
