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

export default function DashboardRevenueChart({ points }: { points: TrendPoint[] }) {
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
      className="app-panel-3d mt-2 rounded-lg border border-slate-200/90 bg-white/98 p-3.5 dark:border-slate-700/70 dark:bg-slate-900/88 sm:mt-2.5 sm:p-4"
      data-testid="dashboard-revenue-chart"
    >
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
        Revenue by day
      </p>
      <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">Current import period</p>
      <div className="mt-3 h-[168px] w-full sm:h-[188px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 6, right: 6, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
            <XAxis
              dataKey="day"
              ticks={xAxisTicks}
              tick={{ fontSize: 10, fill: "currentColor" }}
              className="text-slate-500 dark:text-slate-400"
              tickMargin={8}
              interval={0}
              angle={dense ? -32 : 0}
              textAnchor={dense ? "end" : "middle"}
              height={xBottom}
            />
            <YAxis
              tickFormatter={(v) => formatMoney(Number(v))}
              width={52}
              tick={{ fontSize: 10, fill: "currentColor" }}
              className="text-slate-500 dark:text-slate-400"
            />
            <Tooltip
              formatter={(value) => [formatMoney(Number(value ?? 0)), "Revenue"]}
              labelFormatter={(label) => String(label)}
              contentStyle={{
                borderRadius: 10,
                border: "1px solid rgba(148, 163, 184, 0.35)",
                fontSize: 12,
              }}
            />
            <Line
              type="monotone"
              dataKey="revenue"
              stroke="var(--accent)"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, fill: "var(--accent)" }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
