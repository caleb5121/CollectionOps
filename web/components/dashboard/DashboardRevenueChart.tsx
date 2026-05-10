"use client";

import { useId, useMemo } from "react";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { TrendPoint } from "../../lib/trendPoint";

function formatMoney(n: number) {
  return n.toLocaleString(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value?: number }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  const v = Number(payload[0]?.value ?? 0);
  return (
    <div className="rounded-full border border-[color:color-mix(in_oklab,var(--border-warm)_58%,transparent)] bg-[color:color-mix(in_oklab,var(--surface-raised)_94%,transparent)] px-4 py-2.5 shadow-[0_2px_10px_rgba(0,0,0,0.06),0_12px_32px_-12px_rgba(26,155,127,0.18),0_0_0_1px_rgba(255,255,255,0.5)_inset] backdrop-blur-md dark:border-stone-600/50 dark:bg-stone-900/94 dark:shadow-[0_4px_24px_-8px_rgba(0,0,0,0.55),0_0_28px_-12px_var(--accent-glow)]">
      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[color:var(--foreground-muted)]">
        {String(label)}
      </p>
      <p className="mt-0.5 text-base font-bold tabular-nums tracking-[-0.02em] text-[color:var(--foreground)]">
        {formatMoney(v)}
      </p>
      <p className="mt-0.5 text-[10px] font-medium text-[color:var(--foreground-muted)]">Revenue</p>
    </div>
  );
}

export default function DashboardRevenueChart({
  points,
  lineStroke = "var(--accent)",
  periodDeltaPct = null,
}: {
  points: TrendPoint[];
  /** Defaults to brand teal; dashboard often uses `var(--metric-positive)`. */
  lineStroke?: string;
  /** Optional subtitle: in-range half-to-half revenue change. */
  periodDeltaPct?: { pct: number; up: boolean } | null;
}) {
  const data = useMemo(() => [...points].sort((a, b) => a.dateMs - b.dateMs), [points]);
  const gid = useId().replace(/:/g, "");

  const xAxisTicks = useMemo(() => {
    const n = data.length;
    if (n === 0) return undefined;
    if (n <= 10) return undefined;
    const maxTicks = 8;
    const step = Math.max(1, Math.ceil((n - 1) / (maxTicks - 1)));
    const ticks: string[] = [];
    for (let i = 0; i < n; i += step) {
      ticks.push(data[i]!.day);
    }
    const last = data[n - 1]!.day;
    if (ticks[ticks.length - 1] !== last) ticks.push(last);
    return ticks;
  }, [data]);

  if (data.length === 0) return null;

  const dense = data.length > 12;
  const xBottom = dense ? 52 : 28;

  return (
    <div
      className="app-premium-card relative z-0 overflow-hidden p-6 sm:p-7 dark:border-stone-700/65 dark:bg-stone-900/50"
      data-testid="dashboard-revenue-chart"
    >
      <div
        className="pointer-events-none absolute inset-0 z-0 opacity-[0.4] dark:opacity-[0.28]"
        aria-hidden
        style={{
          background:
            "radial-gradient(ellipse 78% 65% at 50% -5%, color-mix(in oklab, var(--accent) 14%, transparent), transparent 62%)",
        }}
      />
      <div className="relative z-[1] flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[color:var(--foreground-muted)]">
            Revenue by day
          </p>
          <p className="mt-1 text-sm font-medium leading-snug text-[color:var(--foreground-muted)]">
            Current import period
          </p>
        </div>
        {periodDeltaPct ? (
          <span
            className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-semibold tabular-nums shadow-sm ${
              periodDeltaPct.up
                ? "border-emerald-200/90 bg-emerald-50/90 text-emerald-800 dark:border-emerald-800/45 dark:bg-emerald-950/40 dark:text-emerald-200"
                : "border-amber-200/90 bg-amber-50/90 text-amber-900 dark:border-amber-800/45 dark:bg-amber-950/35 dark:text-amber-100"
            }`}
          >
            <span aria-hidden>{periodDeltaPct.up ? "↑" : "↓"}</span>
            {periodDeltaPct.up ? "+" : ""}
            {periodDeltaPct.pct}% <span className="font-normal opacity-90">later vs earlier</span>
          </span>
        ) : null}
      </div>
      <div className="relative z-[1] mt-5 h-[200px] w-full sm:h-[236px]">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 12, right: 8, left: 0, bottom: 4 }}>
            <defs>
              <linearGradient id={`area-${gid}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={lineStroke} stopOpacity={0.48} />
                <stop offset="45%" stopColor={lineStroke} stopOpacity={0.12} />
                <stop offset="100%" stopColor={lineStroke} stopOpacity={0} />
              </linearGradient>
              <filter id={`glow-${gid}`} x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="3.25" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>
            <CartesianGrid
              strokeDasharray="3 6"
              stroke="var(--border-warm)"
              vertical={false}
              strokeOpacity={0.65}
            />
            <XAxis
              dataKey="day"
              ticks={xAxisTicks}
              tick={{ fontSize: 11, fill: "var(--foreground-muted)" }}
              tickMargin={8}
              interval={0}
              angle={dense ? -32 : 0}
              textAnchor={dense ? "end" : "middle"}
              height={xBottom}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tickFormatter={(v) => formatMoney(Number(v))}
              width={58}
              tick={{ fontSize: 11, fill: "var(--foreground-muted)" }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              content={<ChartTooltip />}
              animationDuration={200}
              cursor={{
                stroke: "color-mix(in oklab, var(--accent) 35%, var(--border-warm))",
                strokeWidth: 1,
                strokeDasharray: "4 4",
              }}
            />
            <Area
              type="monotone"
              dataKey="revenue"
              stroke="none"
              fill={`url(#area-${gid})`}
              isAnimationActive
              animationDuration={1000}
              animationEasing="ease-out"
            />
            <Line
              type="monotone"
              dataKey="revenue"
              stroke={lineStroke}
              strokeWidth={3}
              dot={false}
              activeDot={{
                r: 7,
                fill: lineStroke,
                stroke: "var(--surface-raised)",
                strokeWidth: 2.5,
                style: { filter: `url(#glow-${gid})` },
              }}
              isAnimationActive
              animationDuration={1000}
              animationEasing="ease-out"
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
