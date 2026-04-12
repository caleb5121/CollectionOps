import type { TrendPoint } from "./trendPoint";
import { mergeImportChunks, importChunkContributesToMergedWorkspace, type ImportChunk } from "./importMerge";
import { calendarDaysInclusive } from "./importMetadata";
import { orderRowCheckoutTotal, resolveOrderListColumnMap } from "./orderListColumnMap";
import { aggregateTrendPointsToCalendarWeeks } from "./trendChartAggregation";

export type TrendsImportSegment = {
  orderImports: ImportChunk[];
  summaryImports: ImportChunk[];
};

function toNumberLoose(v: unknown): number {
  if (v === null || v === undefined) return 0;
  const s = String(v).trim();
  if (!s) return 0;
  const cleaned = s.replace(/[^0-9.-]/g, "");
  const n = Number(cleaned);
  return Number.isNaN(n) ? 0 : n;
}

/** Match `DataProvider` order-date parsing for trend bucketing. */
function orderDateToLocalMidnightMs(orderDateRaw: string): number | null {
  const s = (orderDateRaw ?? "").trim();
  if (!s) return null;
  const parts = s.split(",").map((x) => x.trim());
  const datePart = parts.length > 1 ? parts[1] : parts[0];
  let d = new Date(datePart);
  if (Number.isNaN(d.getTime())) {
    d = new Date(datePart.slice(0, 10));
    if (Number.isNaN(d.getTime())) return null;
  }
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

function trendDayLabelFromMs(dateMs: number): string {
  const d = new Date(dateMs);
  const month = d.toLocaleString(undefined, { month: "short" });
  const dom = String(d.getDate()).padStart(2, "0");
  return `${month} ${dom}`;
}

type DayAgg = { revenue: number; orders: number; shipping: number };

/**
 * Daily buckets from **Order List only**: revenue = sum of order checkout per calendar day,
 * orders = row count per day, shipping = sum of shipping column per day when present.
 * Missing days in the overall [min date → max date] span are filled with zeros (continuous series).
 * Sales Summary is not used for time-based trends.
 */
export function buildDailyTrendPointsFromTrendsSegments(segments: TrendsImportSegment[]): TrendPoint[] {
  const accum = new Map<number, DayAgg>();

  for (const seg of segments) {
    const orderChunks = seg.orderImports.filter(importChunkContributesToMergedWorkspace);
    const orderData = mergeImportChunks(orderChunks);
    if (!orderData?.rows.length) continue;

    const orderCol = resolveOrderListColumnMap(orderData.headers);
    if (!orderCol.ok || !orderCol.orderDateKey) continue;

    const dateKey = orderCol.orderDateKey;

    for (const r of orderData.rows) {
      const raw = typeof r[dateKey] === "string" ? r[dateKey] : String(r[dateKey] ?? "");
      const dateMs = orderDateToLocalMidnightMs(raw);
      if (dateMs == null) continue;

      const checkout = orderRowCheckoutTotal(r, orderCol);
      const ship = orderCol.shippingKey ? toNumberLoose(r[orderCol.shippingKey]) : 0;

      const p = accum.get(dateMs) ?? { revenue: 0, orders: 0, shipping: 0 };
      p.revenue += checkout;
      p.orders += 1;
      p.shipping += ship;
      accum.set(dateMs, p);
    }
  }

  if (accum.size === 0) return [];

  const allMs = [...accum.keys()];
  const minMs = Math.min(...allMs);
  const maxMs = Math.max(...allMs);

  const fromD = new Date(minMs);
  const toD = new Date(maxMs);
  const nDays = calendarDaysInclusive(fromD, toD);
  const dayStart = new Date(fromD.getFullYear(), fromD.getMonth(), fromD.getDate());

  const out: TrendPoint[] = [];
  for (let i = 0; i < nDays; i++) {
    const d = new Date(dayStart.getFullYear(), dayStart.getMonth(), dayStart.getDate() + i);
    const dateMs = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    const b = accum.get(dateMs) ?? { revenue: 0, orders: 0, shipping: 0 };
    out.push({
      day: trendDayLabelFromMs(dateMs),
      dateMs,
      revenue: b.revenue,
      orders: b.orders,
      shipping: b.shipping,
    });
  }

  return out.sort((a, b) => a.dateMs - b.dateMs);
}

/**
 * Monday-start weekly buckets (revenue, orders, shipping per week). Chart + KPI rollups use this;
 * built from order-derived daily points.
 */
export function buildTrendPointsFromTrendsSegments(segments: TrendsImportSegment[]): TrendPoint[] {
  const daily = buildDailyTrendPointsFromTrendsSegments(segments);
  return aggregateTrendPointsToCalendarWeeks(daily);
}

/** Period totals — sum of weekly buckets equals full-segment totals. */
export function rollupTrendsSegmentTotals(segment: TrendsImportSegment): {
  revenue: number;
  orders: number;
  shipping: number;
} | null {
  const weeks = buildTrendPointsFromTrendsSegments([segment]);
  if (weeks.length === 0) return null;
  let revenue = 0;
  let orders = 0;
  let shipping = 0;
  for (const p of weeks) {
    revenue += p.revenue;
    orders += p.orders;
    shipping += p.shipping;
  }
  return { revenue, orders, shipping };
}
