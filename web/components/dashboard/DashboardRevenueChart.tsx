"use client";

import { useMemo } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { TrendPoint } from "../../lib/trendPoint";

function formatMoney(n: number) {
  return n.toLocaleString(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

export default function DashboardRevenueChart({
  points,
  lineStroke = "var(--accent)",
}: {
  points: TrendPoint[];
  /** Defaults to brand teal; dashboard often uses `var(--metric-positive)`. */
  lineStroke?: string;
}) {
  const data = useMemo(() => [...points].sort((a, b) => a.dateMs - b.dateMs), [points]);

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
      className="app-premium-card p-6 sm:p-7 dark:border-stone-700/65 dark:bg-stone-900/50"
      data-testid="dashboard-revenue-chart"
    >
      <p className="text-xs font-medium uppercase tracking-[0.12em] text-[color:var(--foreground-muted)]">
        Revenue by day
      </p>
      <p className="mt-1 text-sm text-[color:var(--foreground-muted)]">Current import period</p>
      <div className="mt-5 h-[188px] w-full sm:h-[220px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 10, right: 6, left: 0, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 6" stroke="#e3ddd4" vertical={false} strokeOpacity={0.95} />
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
              width={56}
              tick={{ fontSize: 11, fill: "var(--foreground-muted)" }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              animationDuration={200}
              formatter={(value) => [formatMoney(Number(value ?? 0)), "Revenue"]}
              labelFormatter={(label) => String(label)}
              contentStyle={{
                borderRadius: "var(--radius-button)",
                border: "1px solid color-mix(in oklab, var(--border-warm) 80%, transparent)",
                fontSize: 12,
                boxShadow: "var(--shadow-card-hover)",
                background: "var(--surface-raised)",
              }}
              labelStyle={{ color: "var(--foreground-muted)", fontWeight: 600 }}
            />
            <Line
              type="natural"
              dataKey="revenue"
              stroke={lineStroke}
              strokeWidth={2.5}
              dot={false}
              activeDot={{ r: 5, fill: lineStroke, stroke: "#fff", strokeWidth: 2 }}
              isAnimationActive
              animationDuration={900}
              animationEasing="ease-out"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
