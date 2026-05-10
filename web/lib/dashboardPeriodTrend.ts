import type { TrendPoint } from "./trendPoint";

/**
 * Compares revenue in the second half of the imported daily series vs the first half.
 * Single-import dashboards don't have a true "prior period"; this is an honest in-range signal.
 */
export function revenueHalfPeriodDelta(points: TrendPoint[]): { pct: number; up: boolean } | null {
  if (points.length < 8) return null;
  const sorted = [...points].sort((a, b) => a.dateMs - b.dateMs);
  const mid = Math.floor(sorted.length / 2);
  const first = sorted.slice(0, mid).reduce((s, p) => s + p.revenue, 0);
  const second = sorted.slice(mid).reduce((s, p) => s + p.revenue, 0);
  const base = Math.max(first, 1e-6);
  const pct = ((second - first) / base) * 100;
  if (!Number.isFinite(pct)) return null;
  return { pct: Math.round(pct * 10) / 10, up: pct >= 0 };
}
