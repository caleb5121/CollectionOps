import type { CsvData } from "./csvData";
import type {
  DetectedImportKind,
  ImportCheck,
  ImportChunk,
  ImportValidationStatus,
} from "./importMerge";
import { importChunkContributesToMergedWorkspace } from "./importMerge";
import {
  csvOrderDateRange,
  csvSummaryDateRange,
  formatImportRangeLabel,
  parseOrderRowDate,
} from "./importMetadata";
import { computeImportTimeAlignment, type ImportTimeAlignment } from "./crossFileTimeAlignment";
import { detectCsvImportKind } from "./csvDetect";
import {
  orderRowCheckoutTotal,
  resolveOrderListColumnMap,
  type OrderListColumnMap,
} from "./orderListColumnMap";
import { IMPORT_FILTER_CHUNK_SIZE } from "./importPerformanceConstants";
import { logImportPerf } from "./importPerfLog";
import { resolveSalesSummaryColumnMap, type SalesSummaryColumnMap } from "./salesSummaryColumnMap";

export type { ImportCheck, ImportValidationStatus, DetectedImportKind } from "./importMerge";

const FINGERPRINT_FULL_SCAN_MAX = 1_500_000;

function fingerprintSlice(text: string): string {
  let h = 5381;
  for (let i = 0; i < text.length; i++) {
    h = (h * 33) ^ text.charCodeAt(i);
    h >>>= 0;
  }
  return h.toString(16);
}

/** Fast stable fingerprint for duplicate file detection (not cryptographic). Samples very large files. */
export function fingerprintCsvText(text: string): string {
  if (text.length <= FINGERPRINT_FULL_SCAN_MAX) {
    return fingerprintSlice(text);
  }
  const headN = 900_000;
  const tailN = 400_000;
  const head = text.slice(0, headN);
  const tail = text.slice(-tailN);
  return fingerprintSlice(`${head}\n@@cardops_fp_len=${text.length}@@\n${tail}`);
}

function strictNumericCell(raw: string | undefined): number | null {
  const s = String(raw ?? "").trim();
  if (!s) return null;
  const cleaned = s.replace(/[^0-9.-]/g, "");
  if (cleaned === "" || cleaned === "-" || cleaned === ".") return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

export function filterOrderRows(data: CsvData, map: OrderListColumnMap): {
  filtered: CsvData;
  rowsAccepted: number;
  rowsSkipped: number;
} {
  if (!map.ok || !map.orderDateKey) {
    return { filtered: { headers: data.headers, rows: [] }, rowsAccepted: 0, rowsSkipped: data.rows.length };
  }
  const kept: Record<string, string>[] = [];
  let skipped = 0;
  const dk = map.orderDateKey;
  for (const r of data.rows) {
    if (!parseOrderRowDate(r[dk] ?? "")) {
      skipped++;
      continue;
    }
    if (map.orderTotalKey) {
      if (strictNumericCell(r[map.orderTotalKey]) === null) {
        skipped++;
        continue;
      }
    } else if (map.productKey && map.shippingKey) {
      if (strictNumericCell(r[map.productKey]) === null || strictNumericCell(r[map.shippingKey]) === null) {
        skipped++;
        continue;
      }
    } else {
      skipped++;
      continue;
    }
    const total = orderRowCheckoutTotal(r, map);
    if (!Number.isFinite(total) || total < 0) {
      skipped++;
      continue;
    }
    kept.push(r);
  }
  return { filtered: { headers: data.headers, rows: kept }, rowsAccepted: kept.length, rowsSkipped: skipped };
}

export function filterSummaryRows(data: CsvData, map: SalesSummaryColumnMap): {
  filtered: CsvData;
  rowsAccepted: number;
  rowsSkipped: number;
} {
  if (!map.ok) {
    return { filtered: { headers: data.headers, rows: [] }, rowsAccepted: 0, rowsSkipped: data.rows.length };
  }
  const keys = [map.orderCountKey, map.grossSalesKey, map.feesKey, map.netKey] as const;
  const kept: Record<string, string>[] = [];
  let skipped = 0;
  for (const r of data.rows) {
    let ok = true;
    for (const k of keys) {
      if (!k || strictNumericCell(r[k]) === null) ok = false;
    }
    if (!ok) {
      skipped++;
      continue;
    }
    kept.push(r);
  }
  return { filtered: { headers: data.headers, rows: kept }, rowsAccepted: kept.length, rowsSkipped: skipped };
}

function yieldToBrowser(): Promise<void> {
  return new Promise((r) => setTimeout(r, 0));
}

/** Same as `filterOrderRows` but processes in chunks so the UI thread can breathe on huge files. */
export async function filterOrderRowsChunked(
  data: CsvData,
  map: OrderListColumnMap,
  options?: {
    chunkSize?: number;
    onProgress?: (processed: number, total: number) => void;
  },
): Promise<{ filtered: CsvData; rowsAccepted: number; rowsSkipped: number }> {
  const t0 = typeof performance !== "undefined" ? performance.now() : Date.now();
  if (!map.ok || !map.orderDateKey) {
    return { filtered: { headers: data.headers, rows: [] }, rowsAccepted: 0, rowsSkipped: data.rows.length };
  }
  const kept: Record<string, string>[] = [];
  let skipped = 0;
  const dk = map.orderDateKey;
  const total = data.rows.length;
  const chunkSize = options?.chunkSize ?? IMPORT_FILTER_CHUNK_SIZE;
  const onProgress = options?.onProgress;
  let i = 0;
  while (i < total) {
    const end = Math.min(i + chunkSize, total);
    for (let j = i; j < end; j++) {
      const r = data.rows[j]!;
      if (!parseOrderRowDate(r[dk] ?? "")) {
        skipped++;
        continue;
      }
      if (map.orderTotalKey) {
        if (strictNumericCell(r[map.orderTotalKey]) === null) {
          skipped++;
          continue;
        }
      } else if (map.productKey && map.shippingKey) {
        if (strictNumericCell(r[map.productKey]) === null || strictNumericCell(r[map.shippingKey]) === null) {
          skipped++;
          continue;
        }
      } else {
        skipped++;
        continue;
      }
      const rowTotal = orderRowCheckoutTotal(r, map);
      if (!Number.isFinite(rowTotal) || rowTotal < 0) {
        skipped++;
        continue;
      }
      kept.push(r);
    }
    i = end;
    onProgress?.(i, total);
    if (i < total) await yieldToBrowser();
  }
  logImportPerf("filter_order_rows", (typeof performance !== "undefined" ? performance.now() : Date.now()) - t0, {
    rows: total,
  });
  return { filtered: { headers: data.headers, rows: kept }, rowsAccepted: kept.length, rowsSkipped: skipped };
}

/** Same as `filterSummaryRows` but chunked for large summaries. */
export async function filterSummaryRowsChunked(
  data: CsvData,
  map: SalesSummaryColumnMap,
  options?: {
    chunkSize?: number;
    onProgress?: (processed: number, total: number) => void;
  },
): Promise<{ filtered: CsvData; rowsAccepted: number; rowsSkipped: number }> {
  const t0 = typeof performance !== "undefined" ? performance.now() : Date.now();
  if (!map.ok) {
    return { filtered: { headers: data.headers, rows: [] }, rowsAccepted: 0, rowsSkipped: data.rows.length };
  }
  const keys = [map.orderCountKey, map.grossSalesKey, map.feesKey, map.netKey] as const;
  const kept: Record<string, string>[] = [];
  let skipped = 0;
  const total = data.rows.length;
  const chunkSize = options?.chunkSize ?? IMPORT_FILTER_CHUNK_SIZE;
  const onProgress = options?.onProgress;
  let i = 0;
  while (i < total) {
    const end = Math.min(i + chunkSize, total);
    for (let j = i; j < end; j++) {
      const r = data.rows[j]!;
      let ok = true;
      for (const k of keys) {
        if (!k || strictNumericCell(r[k]) === null) ok = false;
      }
      if (!ok) {
        skipped++;
        continue;
      }
      kept.push(r);
    }
    i = end;
    onProgress?.(i, total);
    if (i < total) await yieldToBrowser();
  }
  logImportPerf("filter_summary_rows", (typeof performance !== "undefined" ? performance.now() : Date.now()) - t0, {
    rows: total,
  });
  return { filtered: { headers: data.headers, rows: kept }, rowsAccepted: kept.length, rowsSkipped: skipped };
}

export function orderRequiredScore(m: OrderListColumnMap): { found: number; total: number } {
  const total = 2;
  let found = 0;
  if (m.orderDateKey) found++;
  const hasTotal = Boolean(m.orderTotalKey) || (Boolean(m.productKey) && Boolean(m.shippingKey));
  if (hasTotal) found++;
  return { found, total };
}

export function summaryRequiredScore(m: SalesSummaryColumnMap): { found: number; total: number } {
  const reqs = [m.orderCountKey, m.grossSalesKey, m.feesKey, m.netKey].filter(Boolean);
  return { found: reqs.length, total: 4 };
}

function detectedLabel(kind: ReturnType<typeof detectCsvImportKind>): DetectedImportKind {
  if (kind === "order") return "order_list";
  if (kind === "summary") return "sales_summary";
  return "unknown";
}

export function buildImportCheckOrder(
  data: CsvData,
  map: OrderListColumnMap,
  rowsRead: number,
  rowsAccepted: number,
  rowsSkipped: number,
  extraWarnings: number
): ImportCheck {
  const { found, total } = orderRequiredScore(map);
  const range = csvOrderDateRange({ headers: data.headers, rows: data.rows });
  return {
    detectedType: "order_list",
    rowsRead,
    rowsAccepted,
    rowsSkipped,
    requiredFound: found,
    requiredTotal: total,
    dateRangeLabel: range ? formatImportRangeLabel(range.from, range.to) : null,
    warningCount: rowsSkipped + extraWarnings,
  };
}

export function buildImportCheckSummary(
  data: CsvData,
  map: SalesSummaryColumnMap,
  rowsRead: number,
  rowsAccepted: number,
  rowsSkipped: number,
  extraWarnings: number
): ImportCheck {
  const { found, total } = summaryRequiredScore(map);
  const range = csvSummaryDateRange({ headers: data.headers, rows: data.rows });
  return {
    detectedType: "sales_summary",
    rowsRead,
    rowsAccepted,
    rowsSkipped,
    requiredFound: found,
    requiredTotal: total,
    dateRangeLabel: range ? formatImportRangeLabel(range.from, range.to) : null,
    warningCount: rowsSkipped + extraWarnings,
  };
}

export function deriveValidationStatus(args: {
  schemaOk: boolean;
  rowsAccepted: number;
  rowsRead: number;
  rowsSkipped: number;
  extraWarnings: number;
  partialOptional: boolean;
}): ImportValidationStatus {
  if (!args.schemaOk || (args.rowsRead > 0 && args.rowsAccepted === 0)) return "rejected";
  if (args.rowsSkipped > 0 || args.extraWarnings > 0) return "accepted_warnings";
  if (args.partialOptional) return "partial";
  return "accepted";
}

export function validationReasonLine(status: ImportValidationStatus, check: ImportCheck, detail?: string): string {
  switch (status) {
    case "accepted":
      return `${check.rowsAccepted} rows processed`;
    case "accepted_warnings":
      if (check.rowsSkipped > 0) {
        return `${check.rowsSkipped} rows skipped${detail ? ` - ${detail}` : ""}`;
      }
      return detail ? `Warnings - ${detail}` : "Warnings";
    case "partial":
      return "Optional columns missing - defaults applied";
    case "rejected":
      return detail ?? "Rejected";
    default:
      return detail ?? "";
  }
}

/** Chunks that contribute rows to the merged workspace. */
export function isContributingChunk(c: ImportChunk): boolean {
  return importChunkContributesToMergedWorkspace(c);
}

/** Order vs Sales Summary upload labels disagree (single distinct label per side). */
export type ImportLabelMismatch = { orderLabel: string; summaryLabel: string };

export function detectImportLabelMismatchBetweenSlots(
  orderContributing: ImportChunk[],
  summaryContributing: ImportChunk[],
): ImportLabelMismatch | null {
  const oLabs = orderContributing.map((c) => c.gameLabel?.trim()).filter((x): x is string => Boolean(x));
  const sLabs = summaryContributing.map((c) => c.gameLabel?.trim()).filter((x): x is string => Boolean(x));
  if (oLabs.length === 0 || sLabs.length === 0) return null;
  const oSet = new Set(oLabs);
  const sSet = new Set(sLabs);
  if (oSet.size !== 1 || sSet.size !== 1) return null;
  const orderLabel = [...oSet][0]!;
  const summaryLabel = [...sSet][0]!;
  if (orderLabel === summaryLabel) return null;
  return { orderLabel, summaryLabel };
}

export type WorkspaceGateResult = {
  ready: boolean;
  reasons: string[];
  labelMismatch: ImportLabelMismatch | null;
  timeAlignment: ImportTimeAlignment | null;
};

export function computeWorkspaceGate(input: {
  orderContributing: ImportChunk[];
  summaryContributing: ImportChunk[];
  /** All files in the Order List slot (including rejected). */
  orderSlotFileCount: number;
  /** All files in the Sales Summary slot (including rejected). */
  summarySlotFileCount: number;
  orderListCalculationReady: boolean;
  summaryCalculationReady: boolean;
  orderMetricsOrders: number;
  summaryMetricsOrders: number;
}): WorkspaceGateResult {
  const reasons: string[] = [];
  if (input.orderContributing.length === 0) {
    if (input.orderSlotFileCount > 0) {
      reasons.push(
        input.orderSlotFileCount === 1
          ? "Order List file was rejected"
          : "Order List files were rejected",
      );
    } else {
      reasons.push("No Order List file uploaded");
    }
  }
  if (input.summaryContributing.length === 0) {
    if (input.summarySlotFileCount > 0) {
      reasons.push(
        input.summarySlotFileCount === 1
          ? "Sales Summary file was rejected"
          : "Sales Summary files were rejected",
      );
    } else {
      reasons.push("No Sales Summary file uploaded");
    }
  }
  if (!input.orderListCalculationReady && input.orderContributing.length > 0) {
    reasons.push("Order List is invalid — check each file below");
  }
  if (!input.summaryCalculationReady && input.summaryContributing.length > 0) {
    reasons.push("Sales Summary is invalid — check each file below");
  }
  if (reasons.length > 0) return { ready: false, reasons, labelMismatch: null, timeAlignment: null };

  const labelMismatch = detectImportLabelMismatchBetweenSlots(
    input.orderContributing,
    input.summaryContributing,
  );

  const o = input.orderMetricsOrders;
  const s = input.summaryMetricsOrders;
  if (o > 0 && s > 0 && o !== s) {
    reasons.push(
      `Files do not match:\n• Order List: ${o} orders\n• Sales Summary: ${s} orders\nThis usually means different exports, time ranges, or filters.`,
    );
  }

  const timeAlignment = computeImportTimeAlignment(input.orderContributing, input.summaryContributing);

  const ready =
    reasons.length === 0 && labelMismatch === null && !timeAlignment.blocksWorkspace;
  return { ready, reasons, labelMismatch, timeAlignment };
}

export function hasDuplicateContentHash(chunks: ImportChunk[], hash: string): boolean {
  return chunks.some((c) => c.contentFingerprint && c.contentFingerprint === hash);
}

export type SlotTarget = "order" | "summary";

export function validateSlotAgainstDetection(
  target: SlotTarget,
  data: CsvData
): { ok: true } | { ok: false; message: string } {
  const detected = detectCsvImportKind(data);
  if (detected === "unknown") {
    return { ok: false, message: "Unrecognized headers - use a TCGplayer Order List or Sales Summary export." };
  }
  if (target === "order" && detected === "summary") {
    return {
      ok: false,
      message: "Wrong slot - file is a Sales Summary. Use Sales Summary upload.",
    };
  }
  if (target === "summary" && detected === "order") {
    return {
      ok: false,
      message: "Wrong slot - file is an Order List. Use Order List upload.",
    };
  }
  return { ok: true };
}

export const INTEGRITY_DUP_WARN = "Possible duplicate data";

export function shortRejectedReasonOrder(map: OrderListColumnMap): string {
  if (!map.orderDateKey) return "Missing required column: Order Date";
  const hasTotal = Boolean(map.orderTotalKey) || (Boolean(map.productKey) && Boolean(map.shippingKey));
  if (!hasTotal) return "Missing required column: Order Total (or Product Amt and Shipping Amt)";
  return map.missingRequired[0] ? `Missing required column: ${map.missingRequired[0]}` : "Missing required columns";
}

export function shortRejectedReasonSummary(map: SalesSummaryColumnMap): string {
  if (!map.orderCountKey) return "Missing required column: Order Count";
  if (!map.grossSalesKey) return "Missing required column: Gross Sales";
  if (!map.feesKey) return "Missing required column: Total Fees";
  if (!map.netKey) return "Missing required column: Net Sales";
  return map.missingRequired[0] ? `Missing required column: ${map.missingRequired[0]}` : "Missing required columns";
}

export function buildImportCheckRejected(args: {
  detected: ReturnType<typeof detectCsvImportKind>;
  data: CsvData;
  target: SlotTarget;
}): ImportCheck {
  const detectedType = detectedLabel(args.detected);
  const requiredTotal = args.target === "order" ? 2 : 4;
  return {
    detectedType,
    rowsRead: args.data.rows.length,
    rowsAccepted: 0,
    rowsSkipped: 0,
    requiredFound: 0,
    requiredTotal,
    dateRangeLabel: null,
    warningCount: 0,
  };
}

export function buildImportCheckFromOrderMap(data: CsvData, map: OrderListColumnMap): ImportCheck {
  const { found, total } = orderRequiredScore(map);
  return {
    detectedType: "order_list",
    rowsRead: data.rows.length,
    rowsAccepted: 0,
    rowsSkipped: 0,
    requiredFound: found,
    requiredTotal: total,
    dateRangeLabel: null,
    warningCount: 0,
  };
}

export function buildImportCheckFromSummaryMap(data: CsvData, map: SalesSummaryColumnMap): ImportCheck {
  const { found, total } = summaryRequiredScore(map);
  return {
    detectedType: "sales_summary",
    rowsRead: data.rows.length,
    rowsAccepted: 0,
    rowsSkipped: 0,
    requiredFound: found,
    requiredTotal: total,
    dateRangeLabel: null,
    warningCount: 0,
  };
}

export function formatIntegrityWarnings(args: {
  duplicateFilename: boolean;
  duplicateContent: boolean;
  overlapNote?: string;
}): string | undefined {
  const parts: string[] = [];
  if (args.duplicateFilename) parts.push("Duplicate filename (already imported)");
  if (args.duplicateContent) parts.push("Identical file contents as another upload");
  if (args.overlapNote) parts.push(args.overlapNote);
  if (parts.length === 0) return undefined;
  return `${INTEGRITY_DUP_WARN}: ${parts.join(" · ")}`;
}
