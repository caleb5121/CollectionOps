import type { CsvData } from "./csvData";
import { resolveOrderListColumnMap } from "./orderListColumnMap";
import { resolveSalesSummaryColumnMap } from "./salesSummaryColumnMap";

/** Non-blocking checks - surfaced so bad uploads are not silently treated as complete. */
export function validateOrderListCsv(data: CsvData): string[] {
  const issues: string[] = [];
  if (!data.headers.length) {
    issues.push("Order List file has no header row.");
    return issues;
  }
  if (data.rows.length === 0) {
    issues.push("Order List has no data rows.");
  }

  const map = resolveOrderListColumnMap(data.headers);
  if (!map.ok) {
    issues.push(
      "Order List rows parsed, but required columns were not recognized. This format is not supported for calculations. Please upload a standard TCGplayer Order List export."
    );
    if (map.missingRequired.length > 0) {
      issues.push(`Missing or unrecognized: ${map.missingRequired.join("; ")}`);
    }
  }

  return issues;
}

export function validateSalesSummaryCsv(data: CsvData): string[] {
  const issues: string[] = [];
  if (!data.headers.length) {
    issues.push("Sales Summary has no header row.");
    return issues;
  }
  if (data.rows.length === 0) {
    issues.push("Sales Summary has no data rows.");
  }

  const map = resolveSalesSummaryColumnMap(data.headers);
  if (!map.ok) {
    issues.push(
      "Sales Summary loaded, but required columns were not recognized. This format is not supported for calculations. Please upload a standard TCGplayer Sales Summary export."
    );
    if (map.missingRequired.length > 0) {
      issues.push(`Missing or unrecognized: ${map.missingRequired.join("; ")}`);
    }
  }

  return issues;
}
