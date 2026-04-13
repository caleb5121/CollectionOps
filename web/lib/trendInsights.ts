import type { TrendPoint } from "./trendPoint";
import type { TrendChartGranularity } from "./trendChartAggregation";

export type TrendInsightDirection = "up" | "down" | "flat";

export type TrendInsights = {
  best: { label: string; revenue: number };
  worst: { label: string; revenue: number };
  direction: TrendInsightDirection;
};

export type TrendInsightsPanel = {
  bestLine: string;
  weakestLine: string;
  trendLine: string;
};

export type TrendInsightBlock = {
  label: string;
  period: string;
  value: string;
};

export type TrendInsightsStructuredPanel = {
  best: TrendInsightBlock;
  weakest: TrendInsightBlock;
  trend: TrendInsightBlock;
};

function directionFromEndpoints(sorted: TrendPoint[]): TrendInsightDirection {
  if (sorted.length < 2) return "flat";
  const first = sorted[0]!.revenue;
  const last = sorted[sorted.length - 1]!.revenue;
  if (first <= 0 && last <= 0) return "flat";
  if (last > first * 1.02) return "up";
  if (last < first * 0.98) return "down";
  return "flat";
}

function formatMoney(n: number) {
  return n.toLocaleString(undefined, { style: "currency", currency: "USD" });
}

function directionPhrase(d: TrendInsightDirection, monthly = false): string {
  if (d === "up") return monthly ? "Long-term revenue is trending up." : "Overall trend is up in this view.";
  if (d === "down") return monthly ? "Long-term revenue is trending down." : "Overall trend is down in this view.";
  return monthly ? "Long-term pattern is roughly flat." : "Overall trend is fairly flat in this view.";
}

/** Best / worst buckets by revenue and coarse trend from first→last bucket (display series). */
export function analyzeTrendSeries(points: TrendPoint[]): TrendInsights | null {
  if (points.length === 0) return null;
  const sorted = [...points].sort((a, b) => a.dateMs - b.dateMs);
  let best = sorted[0]!;
  let worst = sorted[0]!;
  for (const p of sorted) {
    if (p.revenue > best.revenue) best = p;
    if (p.revenue < worst.revenue) worst = p;
  }
  return {
    best: { label: best.day, revenue: best.revenue },
    worst: { label: worst.day, revenue: worst.revenue },
    direction: directionFromEndpoints(sorted),
  };
}

function largestDayOverDay(sorted: TrendPoint[]): { delta: number; fromLabel: string; toLabel: string } | null {
  if (sorted.length < 2) return null;
  let bestI = 1;
  let bestAbs = 0;
  for (let i = 1; i < sorted.length; i++) {
    const delta = sorted[i]!.revenue - sorted[i - 1]!.revenue;
    const a = Math.abs(delta);
    if (a > bestAbs) {
      bestAbs = a;
      bestI = i;
    }
  }
  if (bestAbs === 0) return null;
  const i = bestI;
  return {
    delta: sorted[i]!.revenue - sorted[i - 1]!.revenue,
    fromLabel: sorted[i - 1]!.day,
    toLabel: sorted[i]!.day,
  };
}

function bucketLabel(granularity: TrendChartGranularity, kind: "best" | "weak"): string {
  if (granularity === "daily") return kind === "best" ? "Best day" : "Weakest day";
  if (granularity === "weekly") return kind === "best" ? "Best week" : "Weakest week";
  return kind === "best" ? "Best month" : "Weakest month";
}

/** Structured insights for scan-friendly UI (label → period → value). */
export function buildTrendInsightsStructuredPanel(
  points: TrendPoint[],
  granularity: TrendChartGranularity,
): TrendInsightsStructuredPanel | null {
  const base = analyzeTrendSeries(points);
  if (!base) return null;
  const sorted = [...points].sort((a, b) => a.dateMs - b.dateMs);

  const best: TrendInsightBlock = {
    label: bucketLabel(granularity, "best"),
    period: base.best.label,
    value: formatMoney(base.best.revenue),
  };
  const weakest: TrendInsightBlock = {
    label: bucketLabel(granularity, "weak"),
    period: base.worst.label,
    value: formatMoney(base.worst.revenue),
  };

  let trend: TrendInsightBlock;
  if (granularity === "daily") {
    const jump = largestDayOverDay(sorted);
    trend = jump
      ? {
          label: "Trend",
          period: `${jump.fromLabel} → ${jump.toLabel}`,
          value: `${jump.delta >= 0 ? "+" : ""}${formatMoney(jump.delta)} day over day`,
        }
      : {
          label: "Trend",
          period: "Overall",
          value: directionPhrase(base.direction).replace(/\.$/, ""),
        };
  } else if (granularity === "weekly") {
    if (sorted.length >= 2) {
      const prev = sorted[sorted.length - 2]!;
      const last = sorted[sorted.length - 1]!;
      if (prev.revenue > 0) {
        const pct = ((last.revenue - prev.revenue) / prev.revenue) * 100;
        trend = {
          label: "Trend",
          period: `${prev.day} → ${last.day}`,
          value: `${pct >= 0 ? "+" : ""}${pct.toFixed(1)}% vs prior week`,
        };
      } else {
        trend = { label: "Trend", period: "Overall", value: directionPhrase(base.direction).replace(/\.$/, "") };
      }
    } else {
      trend = { label: "Trend", period: "Overall", value: directionPhrase(base.direction).replace(/\.$/, "") };
    }
  } else {
    trend = {
      label: "Trend",
      period: "Overall",
      value: directionPhrase(base.direction, true).replace(/\.$/, ""),
    };
  }

  return { best, weakest, trend };
}

/** Copy for the Insights panel, aligned to chart granularity. */
export function buildTrendInsightsPanel(
  points: TrendPoint[],
  granularity: TrendChartGranularity,
): TrendInsightsPanel | null {
  const base = analyzeTrendSeries(points);
  if (!base) return null;
  const sorted = [...points].sort((a, b) => a.dateMs - b.dateMs);

  if (granularity === "daily") {
    const jump = largestDayOverDay(sorted);
    const trendLine = jump
      ? `Biggest day-over-day change: ${jump.delta >= 0 ? "+" : ""}${formatMoney(jump.delta)} (${jump.fromLabel} → ${jump.toLabel}).`
      : directionPhrase(base.direction);
    return {
      bestLine: `Best day: ${base.best.label} (${formatMoney(base.best.revenue)}).`,
      weakestLine: `Weakest day: ${base.worst.label} (${formatMoney(base.worst.revenue)}).`,
      trendLine,
    };
  }

  if (granularity === "weekly") {
    let trendLine = directionPhrase(base.direction);
    if (sorted.length >= 2) {
      const prev = sorted[sorted.length - 2]!;
      const last = sorted[sorted.length - 1]!;
      if (prev.revenue > 0) {
        const pct = ((last.revenue - prev.revenue) / prev.revenue) * 100;
        trendLine = `Latest week vs prior: ${pct >= 0 ? "+" : ""}${pct.toFixed(1)}% revenue.`;
      }
    }
    return {
      bestLine: `Best week: ${base.best.label} (${formatMoney(base.best.revenue)}).`,
      weakestLine: `Weakest week: ${base.worst.label} (${formatMoney(base.worst.revenue)}).`,
      trendLine,
    };
  }

  return {
    bestLine: `Best month: ${base.best.label} (${formatMoney(base.best.revenue)}).`,
    weakestLine: `Weakest month: ${base.worst.label} (${formatMoney(base.worst.revenue)}).`,
    trendLine: directionPhrase(base.direction, true),
  };
}
