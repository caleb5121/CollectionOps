"use client";

import React, { useMemo, useState } from "react";
import { useReducedMotion } from "framer-motion";
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";
import type { TrendPoint } from "../lib/trendPoint";

export type { TrendPoint } from "../lib/trendPoint";

function formatMoney(n: number) {
  return n.toLocaleString(undefined, { style: "currency", currency: "USD" });
}

const REVENUE_SCALES = ["Auto", "100", "250", "500", "1000"] as const;
const ORDERS_SCALES = ["Auto", "25", "50", "100", "250", "500"] as const;
const SHIPPING_SCALES = ["Auto", "25", "50", "100", "250", "500"] as const;

const CHART_TITLES: Record<"revenue" | "orders" | "shipping", string> = {
  revenue: "Weekly revenue",
  orders: "Weekly orders",
  shipping: "Weekly shipping",
};

export default function DailyTrendChart({
  data,
  metric,
  onMetricChange,
}: {
  data: TrendPoint[];
  metric: "revenue" | "orders" | "shipping";
  onMetricChange: (m: "revenue" | "orders" | "shipping") => void;
}) {
  const [scaleRevenue, setScaleRevenue] = useState<string>("Auto");
  const [scaleOrders, setScaleOrders] = useState<string>("Auto");
  const [scaleShipping, setScaleShipping] = useState<string>("Auto");
  const reduceMotion = useReducedMotion();
  const chartAnim = reduceMotion ? 0 : 850;

  const chartSeries = useMemo(() => [...data].sort((a, b) => a.dateMs - b.dateMs), [data]);
  const displayData = chartSeries;

  const scale = metric === "revenue" ? scaleRevenue : metric === "orders" ? scaleOrders : scaleShipping;
  const setScale = metric === "revenue" ? setScaleRevenue : metric === "orders" ? setScaleOrders : setScaleShipping;

  const scales = metric === "revenue" ? REVENUE_SCALES : metric === "orders" ? ORDERS_SCALES : SHIPPING_SCALES;
  const yMax = scale === "Auto" ? undefined : Number(scale);
  const isCurrency = metric === "revenue" || metric === "shipping";

  const domain = yMax != null ? [0, yMax] : undefined;

  const gradientId = `trend-fill-${metric}`;

  return (
    <div className="transition-app app-panel-3d overflow-hidden rounded-2xl border border-slate-200/85 bg-white/97 dark:border-slate-700/75 dark:bg-slate-900/85">
      <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 dark:border-slate-800/80 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <div className="min-w-0 sm:pr-4">
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-50">{CHART_TITLES[metric]}</h2>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end sm:gap-3">
          <div className="app-inset-well inline-flex self-start rounded-full bg-slate-100/95 p-1 dark:bg-slate-800/80 sm:self-auto">
            {(
              [
                { id: "revenue" as const, label: "Revenue" },
                { id: "orders" as const, label: "Orders" },
                { id: "shipping" as const, label: "Shipping" },
              ] as const
            ).map(({ id, label }) => (
              <button
                key={id}
                type="button"
                onClick={() => onMetricChange(id)}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-[transform,box-shadow,background-color,color] duration-300 ease-out sm:text-sm ${
                  metric === id
                    ? "scale-[1.02] bg-[color:var(--accent)] text-white shadow-[0_1px_0_rgba(255,255,255,0.25)_inset,0_2px_10px_-2px_var(--accent-glow)]"
                    : "text-slate-600 hover:bg-slate-200/80 dark:text-slate-300 dark:hover:bg-slate-600/50"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <label className="flex items-center gap-1.5 self-end sm:self-auto">
            <span className="whitespace-nowrap text-[10px] font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">
              Scale
            </span>
            <select
              value={scale}
              onChange={(e) => setScale(e.target.value)}
              className="min-w-[4.75rem] rounded-md border border-slate-200/70 bg-white/90 px-2 py-1 text-[11px] font-medium text-slate-600 focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400/25 dark:border-slate-600/70 dark:bg-slate-950/70 dark:text-slate-400"
            >
              {scales.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <div className="relative h-[280px] px-2 pb-4 pt-2 sm:h-[320px]">
        {chartSeries.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center rounded-xl border border-dashed border-slate-200/90 bg-slate-50/90 px-6 text-center dark:border-slate-600/70 dark:bg-slate-900/40">
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">No weekly data yet</p>
            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">Add an Order List on Imports.</p>
          </div>
        ) : (
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={displayData} margin={{ top: 12, right: 12, left: 4, bottom: 4 }}>
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#2563eb" stopOpacity={0.25} />
                <stop offset="100%" stopColor="#2563eb" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
            <XAxis dataKey="day" tickMargin={8} tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
            <YAxis
              tickMargin={8}
              width={56}
              domain={domain}
              tickFormatter={(v: number) =>
                isCurrency ? formatMoney(v) : String(Math.round(v))
              }
              tick={{ fontSize: 11, fill: "#64748b" }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const row = payload[0]?.payload as TrendPoint | undefined;
                if (!row) return null;
                return (
                  <div
                    className="rounded-lg border border-slate-200/90 bg-white/98 px-3 py-2 text-xs shadow-md dark:border-slate-600/80 dark:bg-slate-900/95"
                  >
                    <div className="font-semibold text-slate-900 dark:text-slate-100">{row.day}</div>
                    <div className="mt-1.5 space-y-0.5 text-slate-600 dark:text-slate-300">
                      {metric === "shipping" ? (
                        <>
                          <div>Shipping: {formatMoney(row.shipping)}</div>
                          <div>Orders: {Math.round(row.orders)}</div>
                        </>
                      ) : (
                        <>
                          <div>Revenue: {formatMoney(row.revenue)}</div>
                          <div>Orders: {Math.round(row.orders)}</div>
                          {row.orders > 0 ? (
                            <div>AOV: {formatMoney(row.revenue / row.orders)}</div>
                          ) : null}
                        </>
                      )}
                    </div>
                  </div>
                );
              }}
            />
            <Area
              type="monotone"
              dataKey={metric}
              stroke="none"
              fill={`url(#${gradientId})`}
              fillOpacity={1}
              isAnimationActive={!reduceMotion}
              animationDuration={chartAnim}
            />
            <Line
              type="monotone"
              dataKey={metric}
              stroke="#2563eb"
              strokeWidth={2.5}
              dot={false}
              activeDot={{ r: 4, fill: "#2563eb", stroke: "#fff", strokeWidth: 2 }}
              isAnimationActive={!reduceMotion}
              animationDuration={chartAnim}
            />
          </ComposedChart>
        </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
