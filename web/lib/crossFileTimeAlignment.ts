import type { ImportChunk } from "./importMerge";
import {
  aggregateOrderDateRangeFromChunks,
  aggregateSummaryDateRangeFromChunks,
  formatImportRangeLabel,
} from "./importMetadata";

export type ImportTimeAlignment = {
  status: "match" | "mismatch" | "unknown";
  orderListLine: string;
  salesSummaryLine: string;
  blocksWorkspace: boolean;
  showUnknownWarning: boolean;
  /**
   * Sales Summary had no date columns or filename hint (typical TCGplayer export);
   * the Order List range was used for calendar alignment.
   */
  summaryRangeInferredFromOrders?: boolean;
};

const MONTH_ALIASES: Record<string, number> = {
  january: 0,
  jan: 0,
  february: 1,
  feb: 1,
  march: 2,
  mar: 2,
  april: 3,
  apr: 3,
  may: 4,
  june: 5,
  jun: 5,
  july: 6,
  jul: 6,
  august: 7,
  aug: 7,
  september: 8,
  sep: 8,
  sept: 8,
  october: 9,
  oct: 9,
  november: 10,
  nov: 10,
  december: 11,
  dec: 11,
};

/** Calendar months touched by [from, to] inclusive, as "y-m" keys (m = 0–11). */
export function monthKeysInRange(from: Date, to: Date): Set<string> {
  const set = new Set<string>();
  const cur = new Date(from.getFullYear(), from.getMonth(), 1);
  const end = new Date(to.getFullYear(), to.getMonth(), 1);
  while (cur <= end) {
    set.add(`${cur.getFullYear()}-${cur.getMonth()}`);
    cur.setMonth(cur.getMonth() + 1);
  }
  return set;
}

function monthsOverlap(aFrom: Date, aTo: Date, bFrom: Date, bTo: Date): boolean {
  const a = monthKeysInRange(aFrom, aTo);
  const b = monthKeysInRange(bFrom, bTo);
  for (const k of a) {
    if (b.has(k)) return true;
  }
  return false;
}

/** First / last instant of a calendar month. */
function monthBounds(year: number, monthIndex: number): { from: Date; to: Date } {
  const from = new Date(year, monthIndex, 1);
  const to = new Date(year, monthIndex + 1, 0, 23, 59, 59, 999);
  return { from, to };
}

/**
 * Infer a month (or month span) from the upload filename, e.g. may_2026, Sales-May-2025.csv, 2024_06_report.
 */
export function inferDateRangeFromImportFileName(fileName: string): { from: Date; to: Date } | null {
  /** Keep hyphens — collapsing to `_` breaks `\b` before month names (underscore is a word char in JS). */
  const lower = fileName.replace(/\.[^.]+$/i, "").toLowerCase();

  const monthYear = lower.match(
    /\b(january|jan|february|feb|march|mar|april|apr|may|june|jun|july|jul|august|aug|september|sep|sept|october|oct|november|nov|december|dec)[_.\s-]+(\d{4})\b/,
  );
  if (monthYear) {
    const mi = MONTH_ALIASES[monthYear[1]!];
    if (mi === undefined) return null;
    const y = parseInt(monthYear[2]!, 10);
    if (!Number.isFinite(y)) return null;
    return monthBounds(y, mi);
  }

  const ymd = lower.match(/\b(20\d{2})[_.-](\d{1,2})\b/);
  if (ymd) {
    const y = parseInt(ymd[1]!, 10);
    const m = parseInt(ymd[2]!, 10) - 1;
    if (m < 0 || m > 11) return null;
    return monthBounds(y, m);
  }

  const compact = lower.match(/\b(20\d{2})(0[1-9]|1[0-2])\b/);
  if (compact) {
    const y = parseInt(compact[1]!, 10);
    const m = parseInt(compact[2]!, 10) - 1;
    return monthBounds(y, m);
  }

  return null;
}

function aggregateSummaryDateRangeFromFilenames(chunks: ImportChunk[]): { from: Date; to: Date } | null {
  let min: Date | null = null;
  let max: Date | null = null;
  for (const c of chunks) {
    const r = inferDateRangeFromImportFileName(c.fileName);
    if (!r) continue;
    if (!min || r.from < min) min = r.from;
    if (!max || r.to > max) max = r.to;
  }
  if (!min || !max) return null;
  return { from: min, to: max };
}

function formatSummaryHumanLabel(
  fromCsv: boolean,
  range: { from: Date; to: Date },
): string {
  const sameMonth =
    range.from.getFullYear() === range.to.getFullYear() &&
    range.from.getMonth() === range.to.getMonth();
  if (!fromCsv && sameMonth) {
    return new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" }).format(range.from);
  }
  return formatImportRangeLabel(range.from, range.to);
}

/**
 * Compare Order List dates (order date column) to Sales Summary period from CSV columns or filename.
 * When the summary has no dates (common TCGplayer exports) but the Order List has a range,
 * we align using that range — no false "unknown period" / review state.
 * True unknown (e.g. no order dates) → warning. Non-overlapping months → block.
 */
export function computeImportTimeAlignment(
  orderContributing: ImportChunk[],
  summaryContributing: ImportChunk[],
): ImportTimeAlignment {
  const orderRange = aggregateOrderDateRangeFromChunks(orderContributing);
  const summaryFromCsv = aggregateSummaryDateRangeFromChunks(summaryContributing);
  const summaryFromName = aggregateSummaryDateRangeFromFilenames(summaryContributing);

  let summaryRange: { from: Date; to: Date } | null = summaryFromCsv ?? summaryFromName;
  const fromCsv = Boolean(summaryFromCsv);
  const summaryPresent = summaryContributing.length > 0;

  let summaryRangeInferredFromOrders = false;
  if (summaryPresent && orderRange != null && summaryRange == null) {
    summaryRange = { from: orderRange.from, to: orderRange.to };
    summaryRangeInferredFromOrders = true;
  }

  const orderListLine = orderRange
    ? `Order List: ${formatImportRangeLabel(orderRange.from, orderRange.to)}`
    : "Order List: we couldn’t read dates from your orders";

  const salesSummaryLine = summaryRange
    ? summaryRangeInferredFromOrders && orderRange
      ? `Sales Summary: ${formatImportRangeLabel(orderRange.from, orderRange.to)}`
      : `Sales Summary: ${formatSummaryHumanLabel(fromCsv, summaryRange)}`
    : "Sales Summary: unknown period";

  if (!orderRange || summaryRange == null) {
    return {
      status: "unknown",
      orderListLine,
      salesSummaryLine,
      blocksWorkspace: false,
      showUnknownWarning: true,
    };
  }

  if (!monthsOverlap(orderRange.from, orderRange.to, summaryRange.from, summaryRange.to)) {
    return {
      status: "mismatch",
      orderListLine,
      salesSummaryLine,
      blocksWorkspace: true,
      showUnknownWarning: false,
    };
  }

  return {
    status: "match",
    orderListLine,
    salesSummaryLine,
    blocksWorkspace: false,
    showUnknownWarning: false,
    ...(summaryRangeInferredFromOrders ? { summaryRangeInferredFromOrders: true } : {}),
  };
}
