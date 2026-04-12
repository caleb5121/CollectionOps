import type { TrendPoint } from "./trendPoint";

const DAY_MS = 86400000;
const WEEK_MS = 7 * DAY_MS;

/** Inclusive calendar-day span from first to last point. */
export function inclusiveRangeDayCount(points: TrendPoint[]): number {
  if (points.length === 0) return 0;
  const mins = points.map((p) => p.dateMs);
  const min = Math.min(...mins);
  const max = Math.max(...mins);
  return Math.floor((max - min) / DAY_MS) + 1;
}

export type ChartGranularity = "daily" | "weekly";

/** Trends analysis chart: includes monthly for long spans. */
export type TrendChartGranularity = "daily" | "weekly" | "monthly";

export function inferTrendChartGranularity(dailyPoints: TrendPoint[]): TrendChartGranularity {
  if (dailyPoints.length === 0) return "daily";
  const rangeDays = inclusiveRangeDayCount(dailyPoints);
  if (rangeDays <= 14) return "daily";
  if (rangeDays <= 120) return "weekly";
  return "monthly";
}

function startOfMonthLocal(dateMs: number): number {
  const d = new Date(dateMs);
  return new Date(d.getFullYear(), d.getMonth(), 1).getTime();
}

function formatMonthLabel(dateMs: number): string {
  return new Date(dateMs).toLocaleString("en-US", { month: "short", year: "numeric" });
}

/** Short axis labels: Jan, Feb, … when the series stays in one calendar year; otherwise Jan ’25. */
function formatMonthChartAxisLabel(dateMs: number, singleCalendarYear: boolean): string {
  const d = new Date(dateMs);
  if (singleCalendarYear) {
    return d.toLocaleString("en-US", { month: "short" });
  }
  return d.toLocaleString("en-US", { month: "short", year: "2-digit" });
}

/** Calendar months (local), zero-filled from first to last month in the series. */
export function aggregateTrendPointsToCalendarMonths(daily: TrendPoint[]): TrendPoint[] {
  if (daily.length === 0) return [];
  type Pt = TrendPoint;
  const bucketMap = new Map<number, { revenue: number; orders: number; shipping: number }>();
  for (const p of daily) {
    const mk = startOfMonthLocal(p.dateMs);
    const b = bucketMap.get(mk) ?? { revenue: 0, orders: 0, shipping: 0 };
    b.revenue += p.revenue;
    b.orders += p.orders;
    b.shipping += p.shipping;
    bucketMap.set(mk, b);
  }
  const sortedKeys = [...bucketMap.keys()].sort((a, b) => a - b);
  const minM = sortedKeys[0]!;
  const maxM = sortedKeys[sortedKeys.length - 1]!;
  const y0 = new Date(minM).getFullYear();
  const y1 = new Date(maxM).getFullYear();
  const singleCalendarYear = y0 === y1;
  const out: Pt[] = [];
  for (let t = minM; t <= maxM; ) {
    const b = bucketMap.get(t) ?? { revenue: 0, orders: 0, shipping: 0 };
    out.push({
      day: formatMonthChartAxisLabel(t, singleCalendarYear),
      dateMs: t,
      revenue: b.revenue,
      orders: b.orders,
      shipping: b.shipping,
    });
    const d = new Date(t);
    t = new Date(d.getFullYear(), d.getMonth() + 1, 1).getTime();
  }
  return out;
}

/** Build display series from daily trend points. */
export function groupTrendPointsForChart(daily: TrendPoint[], mode: TrendChartGranularity): TrendPoint[] {
  if (daily.length === 0) return [];
  const sorted = [...daily].sort((a, b) => a.dateMs - b.dateMs);
  if (mode === "daily") return normalizeDailyChartPoints(sorted);
  if (mode === "weekly") return aggregateTrendPointsToCalendarWeeks(sorted);
  return aggregateTrendPointsToCalendarMonths(sorted);
}

export function showChartGranularityToggle(rangeDays: number): boolean {
  return rangeDays > 10;
}

export function defaultChartGranularity(rangeDays: number): ChartGranularity {
  if (rangeDays <= 10) return "daily";
  if (rangeDays <= 45) return "daily";
  return "weekly";
}

function formatDailyTick(dateMs: number): string {
  const d = new Date(dateMs);
  const month = d.toLocaleString("en-US", { month: "short" });
  const day = String(d.getDate()).padStart(2, "0");
  return `${month} ${day}`;
}

function formatWeekRangeLabel(weekStartMs: number, weekEndMs: number): string {
  const opt: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
  const a = new Date(weekStartMs).toLocaleDateString("en-US", opt);
  const b = new Date(weekEndMs).toLocaleDateString("en-US", opt);
  return `${a}–${b}`;
}

/** Local Monday 00:00 for the ISO-style week containing `dateMs` (Monday–Sunday). */
export function startOfWeekMondayLocal(dateMs: number): number {
  const d = new Date(dateMs);
  const dow = d.getDay();
  const offset = dow === 0 ? -6 : 1 - dow;
  const monday = new Date(d.getFullYear(), d.getMonth(), d.getDate() + offset);
  return new Date(monday.getFullYear(), monday.getMonth(), monday.getDate()).getTime();
}

/**
 * Group daily trend buckets into Monday-start calendar weeks. Fills empty weeks between
 * first and last week with zeros so upload span does not change bucket alignment.
 */
export function aggregateTrendPointsToCalendarWeeks(daily: TrendPoint[]): TrendPoint[] {
  if (daily.length === 0) return [];
  const bucketMap = new Map<number, { revenue: number; orders: number; shipping: number }>();
  for (const p of daily) {
    const wk = startOfWeekMondayLocal(p.dateMs);
    const b = bucketMap.get(wk) ?? { revenue: 0, orders: 0, shipping: 0 };
    b.revenue += p.revenue;
    b.orders += p.orders;
    b.shipping += p.shipping;
    bucketMap.set(wk, b);
  }
  const sortedKeys = [...bucketMap.keys()].sort((a, b) => a - b);
  const minW = sortedKeys[0]!;
  const maxW = sortedKeys[sortedKeys.length - 1]!;
  const out: TrendPoint[] = [];
  for (let w = minW; w <= maxW; w += WEEK_MS) {
    const b = bucketMap.get(w) ?? { revenue: 0, orders: 0, shipping: 0 };
    const weekEnd = w + 6 * DAY_MS;
    out.push({
      day: formatWeekRangeLabel(w, weekEnd),
      dateMs: w,
      revenue: b.revenue,
      orders: b.orders,
      shipping: b.shipping,
    });
  }
  return out;
}

/**
 * Seven-day buckets from the earliest day in the series. Fills empty weeks with zeros
 * so the axis stays continuous.
 */
export function aggregateTrendWeekly(daily: TrendPoint[]): TrendPoint[] {
  if (daily.length === 0) return [];
  const sorted = [...daily].sort((a, b) => a.dateMs - b.dateMs);
  const anchor = sorted[0]!.dateMs;
  const lastMs = sorted[sorted.length - 1]!.dateMs;
  const maxWeekIndex = Math.floor((lastMs - anchor) / WEEK_MS);

  type Bucket = { revenue: number; orders: number; shipping: number };
  const buckets = new Map<number, Bucket>();
  for (let w = 0; w <= maxWeekIndex; w++) {
    buckets.set(w, { revenue: 0, orders: 0, shipping: 0 });
  }

  for (const p of sorted) {
    const w = Math.floor((p.dateMs - anchor) / WEEK_MS);
    const b = buckets.get(w);
    if (!b) continue;
    b.revenue += p.revenue;
    b.orders += p.orders;
    b.shipping += p.shipping;
  }

  const out: TrendPoint[] = [];
  for (let w = 0; w <= maxWeekIndex; w++) {
    const b = buckets.get(w)!;
    const weekStart = anchor + w * WEEK_MS;
    const weekEnd = anchor + w * WEEK_MS + 6 * DAY_MS;
    out.push({
      day: formatWeekRangeLabel(weekStart, weekEnd),
      revenue: b.revenue,
      orders: b.orders,
      shipping: b.shipping,
      dateMs: weekStart,
    });
  }
  return out;
}

/** Normalize daily points so X-axis uses padded day labels (Jun 01). */
export function normalizeDailyChartPoints(daily: TrendPoint[]): TrendPoint[] {
  return [...daily]
    .sort((a, b) => a.dateMs - b.dateMs)
    .map((p) => ({
      ...p,
      day: formatDailyTick(p.dateMs),
    }));
}
