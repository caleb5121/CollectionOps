import type { CsvData } from "./csvData";
import type { ImportChunk, ImportFileStatus } from "./importMerge";
import { resolveOrderListColumnMap } from "./orderListColumnMap";

export function normalizeImportFileName(name: string): string {
  return name.trim().toLowerCase();
}

/** Match Order List date parsing with DataProvider / Trends. */
export function parseOrderRowDate(orderDateRaw: string): Date | null {
  const s = (orderDateRaw ?? "").trim();
  if (!s) return null;
  const parts = s.split(",").map((x) => x.trim());
  const datePart = parts.length > 1 ? parts[1] : parts[0];
  const d = new Date(datePart);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function csvOrderDateRange(data: CsvData): { from: Date; to: Date } | null {
  if (!data.rows.length) return null;
  const map = resolveOrderListColumnMap(data.headers);
  if (!map.orderDateKey) return null;
  const key = map.orderDateKey;
  let min: Date | null = null;
  let max: Date | null = null;
  for (const r of data.rows) {
    const d = parseOrderRowDate(r[key] ?? "");
    if (!d) continue;
    if (!min || d < min) min = d;
    if (!max || d > max) max = d;
  }
  if (!min || !max) return null;
  return { from: min, to: max };
}

/** Sales Summary exports rarely include per-order dates; try common columns. */
export function csvSummaryDateRange(data: CsvData): { from: Date; to: Date } | null {
  if (!data.rows.length) return null;
  const candidates = ["Order Date", "Start Date", "End Date", "Period Start", "Period End", "Date"];
  let key: string | null = null;
  for (const c of candidates) {
    if (data.headers.some((h) => h.trim() === c)) {
      key = c;
      break;
    }
  }
  if (!key) return null;
  let min: Date | null = null;
  let max: Date | null = null;
  for (const r of data.rows) {
    const d = parseOrderRowDate(r[key] ?? "");
    if (!d) continue;
    if (!min || d < min) min = d;
    if (!max || d > max) max = d;
  }
  if (!min || !max) return null;
  return { from: min, to: max };
}

/** Inclusive calendar days between two dates (same calendar day → 1). */
export function calendarDaysInclusive(from: Date, to: Date): number {
  const a = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  const b = new Date(to.getFullYear(), to.getMonth(), to.getDate());
  const ms = b.getTime() - a.getTime();
  return Math.max(1, Math.round(ms / (24 * 60 * 60 * 1000)) + 1);
}

export function formatImportRangeLabel(start: Date, end: Date): string {
  const sameYear = start.getFullYear() === end.getFullYear();
  const base: Intl.DateTimeFormatOptions = { month: "long", day: "numeric" };
  const startStr = new Intl.DateTimeFormat("en-US", {
    ...base,
    ...(sameYear ? {} : { year: "numeric" }),
  }).format(start);
  const endStr = new Intl.DateTimeFormat("en-US", {
    ...base,
    year: sameYear ? undefined : "numeric",
  }).format(end);
  if (startStr === endStr) return startStr;
  return `${startStr} → ${endStr}`;
}

/** Dashboard hero: full sentence for the active imported date span. */
export function formatDashboardViewingDateRangeLabel(from: Date, to: Date): string {
  const sameCalendarMonth =
    from.getFullYear() === to.getFullYear() && from.getMonth() === to.getMonth();
  if (sameCalendarMonth) {
    const monthYear = new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" }).format(from);
    return `Viewing data for ${monthYear}`;
  }
  const opts: Intl.DateTimeFormatOptions = { month: "long", day: "numeric", year: "numeric" };
  const startStr = new Intl.DateTimeFormat("en-US", opts).format(from);
  const endStr = new Intl.DateTimeFormat("en-US", opts).format(to);
  return `Viewing data from ${startStr} to ${endStr}`;
}

export function rangesOverlap(a0: Date, a1: Date, b0: Date, b1: Date): boolean {
  return a0.getTime() <= b1.getTime() && b0.getTime() <= a1.getTime();
}

export function aggregateOrderDateRangeFromChunks(chunks: ImportChunk[]): { from: Date; to: Date } | null {
  let min: Date | null = null;
  let max: Date | null = null;
  for (const c of chunks) {
    const r = csvOrderDateRange(c.data);
    if (!r) continue;
    if (!min || r.from < min) min = r.from;
    if (!max || r.to > max) max = r.to;
  }
  if (!min || !max) return null;
  return { from: min, to: max };
}

/** Widest date span from Sales Summary files (period columns vary by export). */
export function aggregateSummaryDateRangeFromChunks(chunks: ImportChunk[]): { from: Date; to: Date } | null {
  let min: Date | null = null;
  let max: Date | null = null;
  for (const c of chunks) {
    const r = csvSummaryDateRange(c.data);
    if (!r) continue;
    if (!min || r.from < min) min = r.from;
    if (!max || r.to > max) max = r.to;
  }
  if (!min || !max) return null;
  return { from: min, to: max };
}

/** Prefer Order List dates; fall back to Sales Summary period if needed. */
export function aggregateWorkspaceDateRange(orderChunks: ImportChunk[], summaryChunks: ImportChunk[]): {
  from: Date;
  to: Date;
} | null {
  const o = aggregateOrderDateRangeFromChunks(orderChunks);
  if (o) return o;
  return aggregateSummaryDateRangeFromChunks(summaryChunks);
}

/** Broad upload labels where overlapping date ranges are normal - never warn for Order List overlap. */
const ORDER_OVERLAP_WARNING_EXEMPT_LABELS = new Set(["mixed", "all games"]);

function normalizeUploadLabelForOverlap(label: string | undefined): string {
  return (label ?? "").trim().toLowerCase();
}

/**
 * Overlap warnings apply only when two files share the same non-broad label (same dataset).
 * Mixed / All Games, different games, or missing labels → no overlap warning.
 */
export function shouldWarnOrderListOverlapForSameLabel(
  newLabel: string | undefined,
  existingLabel: string | undefined
): boolean {
  const a = normalizeUploadLabelForOverlap(newLabel);
  const b = normalizeUploadLabelForOverlap(existingLabel);
  if (!a || !b) return false;
  if (a !== b) return false;
  if (ORDER_OVERLAP_WARNING_EXEMPT_LABELS.has(a)) return false;
  return true;
}

const ORDER_LIST_OVERLAP_NOTE =
  "This file overlaps with another upload for the same label. This may cause duplicate counting.";

export function resolveImportStatusForOrderChunk(
  data: CsvData,
  existingOrderChunks: ImportChunk[],
  newFileGameLabel?: string
): { status: ImportFileStatus; statusNote?: string } {
  const range = csvOrderDateRange(data);
  if (!range || existingOrderChunks.length === 0) {
    return { status: "loaded" };
  }
  for (const ex of existingOrderChunks) {
    const exRange = csvOrderDateRange(ex.data);
    if (!exRange) continue;
    if (!rangesOverlap(range.from, range.to, exRange.from, exRange.to)) continue;
    if (!shouldWarnOrderListOverlapForSameLabel(newFileGameLabel, ex.gameLabel)) continue;
    return {
      status: "overlap",
      statusNote: ORDER_LIST_OVERLAP_NOTE,
    };
  }
  return { status: "loaded" };
}

export function resolveImportStatusForSummaryChunk(
  data: CsvData,
  existingSummaryChunks: ImportChunk[]
): { status: ImportFileStatus; statusNote?: string } {
  const range = csvSummaryDateRange(data);
  if (!range || existingSummaryChunks.length === 0) {
    return { status: "loaded" };
  }
  for (const ex of existingSummaryChunks) {
    const exRange = csvSummaryDateRange(ex.data);
    if (!exRange) continue;
    if (rangesOverlap(range.from, range.to, exRange.from, exRange.to)) {
      return {
        status: "overlap",
        statusNote: "Date range overlaps another Sales Summary file",
      };
    }
  }
  return { status: "loaded" };
}
