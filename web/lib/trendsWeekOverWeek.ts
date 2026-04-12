import type { TrendPoint } from "./trendPoint";

export type TrendsKpiComparisonLabel = "vs previous week" | "vs previous period" | "vs last period";

export type TrendsKpiComparison = {
  comparisonLabel: TrendsKpiComparisonLabel;
  revenuePct: number | null;
  ordersPct: number | null;
  aovPct: number | null;
};

/** @deprecated Use TrendsKpiComparison */
export type TrendsWeekOverWeekResult = TrendsKpiComparison;

function percentDelta(current: number, previous: number): number | null {
  if (!Number.isFinite(current) || !Number.isFinite(previous)) return null;
  if (previous === 0) return null;
  return ((current - previous) / previous) * 100;
}

function aovFromBucket(p: TrendPoint): number | null {
  if (p.orders === 0) return null;
  return p.revenue / p.orders;
}

/** Compare the last two time buckets (sorted by `dateMs`), any granularity. */
export function computeLastPeriodChange(periodPoints: TrendPoint[]): {
  revenuePct: number | null;
  ordersPct: number | null;
  aovPct: number | null;
} | null {
  const sorted = [...periodPoints].sort((a, b) => a.dateMs - b.dateMs);
  if (sorted.length < 2) return null;

  const previous = sorted[sorted.length - 2]!;
  const current = sorted[sorted.length - 1]!;

  const revenuePct = percentDelta(current.revenue, previous.revenue);
  const ordersPct = percentDelta(current.orders, previous.orders);
  const aovC = aovFromBucket(current);
  const aovP = aovFromBucket(previous);
  const aovPct = aovC != null && aovP != null ? percentDelta(aovC, aovP) : null;

  return { revenuePct, ordersPct, aovPct };
}

export function computeTrendsWeekOverWeek(weeklyPoints: TrendPoint[]): TrendsKpiComparison | null {
  const c = computeLastPeriodChange(weeklyPoints);
  if (!c) return null;
  return { comparisonLabel: "vs previous week", ...c };
}

export function computeTrendsPeriodOverPeriod(periodPoints: TrendPoint[]): TrendsKpiComparison | null {
  const c = computeLastPeriodChange(periodPoints);
  if (!c) return null;
  return { comparisonLabel: "vs previous period", ...c };
}
