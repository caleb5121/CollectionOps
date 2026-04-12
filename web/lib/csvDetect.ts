import type { CsvData } from "./csvData";
import { buildHeaderLookup, normalizeHeaderKey } from "./csvHeaderNormalize";
import { resolveOrderListColumnMap } from "./orderListColumnMap";
import { resolveSalesSummaryColumnMap } from "./salesSummaryColumnMap";

/**
 * Classify CSV for import slot validation (Order List vs Sales Summary).
 * Uses normalized header matching first, then legacy heuristics.
 */
export function detectCsvImportKind(data: CsvData): "order" | "summary" | "unknown" {
  if (resolveSalesSummaryColumnMap(data.headers).ok) return "summary";
  if (resolveOrderListColumnMap(data.headers).ok) return "order";

  const lookup = buildHeaderLookup(data.headers);
  const has = (c: string) => lookup.has(normalizeHeaderKey(c));

  if (has("grosssales") && has("ordercount")) return "summary";
  if (has("netsalesminusfees") && has("grosssales")) return "summary";

  if (
    (has("orderdate") || has("order_date") || has("order date")) &&
    (has("totalamt") || has("ordertotal") || has("order_total") || has("order total"))
  ) {
    return "order";
  }

  if (has("productamt") && (has("totalamt") || has("shippingamt"))) return "order";

  return "unknown";
}
