"use client";

import React, { useEffect, useMemo, useState } from "react";
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
import type { TrendChartGranularity } from "../lib/trendChartAggregation";

export type { TrendPoint } from "../lib/trendPoint";

function formatMoney(n: number) {
  return n.toLocaleString(undefined, { style: "currency", currency: "USD" });
}

const REVENUE_SCALES = ["Auto", "100", "250", "500", "1000"] as const;
const ORDERS_SCALES = ["Auto", "25", "50", "100", "250", "500"] as const;
const SHIPPING_SCALES = ["Auto", "25", "50", "100", "250", "500"] as const;

const CHART_TITLES: Record<"revenue" | "orders" | "shipping", string> = {
  revenue: "Revenue over time",
  orders: "Orders over time",
  shipping: "Shipping over time",
};

const GRAN_LABEL: Record<TrendChartGranularity, string> = {
  daily: "Daily",
  weekly: "Weekly",
  monthly: "Monthly",
};

/** Curve interpolation: daily sharp, weekly balanced, monthly smooth. */
const CURVE: Record<TrendChartGranularity, "linear" | "monotone" | "natural"> = {
  daily: "linear",
  weekly: "monotone",
  monthly: "natural",
};

const LINE_WIDTH: Record<TrendChartGranularity, number> = {
  daily: 1.35,
  weekly: 2.15,
  monthly: 2.85,
};

const FILL_TOP_OPACITY: Record<TrendChartGranularity, number> = {
  daily: 0.09,
  weekly: 0.2,
  monthly: 0.34,
};

function useChartAnimationMs(granularity: TrendChartGranularity, reduceMotion: boolean | null) {
  if (reduceMotion) return 0;
  switch (granularity) {
    case "daily":
      return 520;
    case "weekly":
      return 680;
    default:
      return 820;
  }
}

type AxisTickPayload = { value?: string };

function XAxisTick(props: { x?: number; y?: number; payload?: AxisTickPayload }) {
  const { x = 0, y = 0, payload } = props;
  const v = payload?.value ?? "";
  return (
    <text
      x={x}
      y={y}
      dy={12}
      fill="#64748b"
      fontSize={10}
      textAnchor="middle"
      className="chart-axis-tick transition-opacity duration-500 ease-out"
    >
      {v}
    </text>
  );
}

function XAxisTickAngled(props: { x?: number; y?: number; payload?: AxisTickPayload }) {
  const { x = 0, y = 0, payload } = props;
  const v = payload?.value ?? "";
  return (
    <text
      x={x}
      y={y}
      dy={8}
      fill="#64748b"
      fontSize={10}
      textAnchor="end"
      transform={`rotate(-32, ${x},${y})`}
      className="chart-axis-tick transition-opacity duration-500 ease-out"
    >
      {v}
    </text>
  );
}

export default function TrendAnalysisChart({
  displayData,
  granularity,
  inferredGranularity,
  onGranularityChange,
  metric,
  onMetricChange,
}: {
  displayData: TrendPoint[];
  granularity: TrendChartGranularity;
  inferredGranularity: TrendChartGranularity;
  onGranularityChange: (g: TrendChartGranularity) => void;
  metric: "revenue" | "orders" | "shipping";
  onMetricChange: (m: "revenue" | "orders" | "shipping") => void;
}) {
  const [scaleRevenue, setScaleRevenue] = useState<string>("Auto");
  const [scaleOrders, setScaleOrders] = useState<string>("Auto");
  const [scaleShipping, setScaleShipping] = useState<string>("Auto");
  const reduceMotion = useReducedMotion();
  const chartAnim = useChartAnimationMs(granularity, reduceMotion);

  const chartSeries = useMemo(() => [...displayData].sort((a, b) => a.dateMs - b.dateMs), [displayData]);

  useEffect(() => {
    setScaleRevenue("Auto");
    setScaleOrders("Auto");
    setScaleShipping("Auto");
  }, [granularity, displayData.length]);

  const scale = metric === "revenue" ? scaleRevenue : metric === "orders" ? scaleOrders : scaleShipping;
  const setScale = metric === "revenue" ? setScaleRevenue : metric === "orders" ? setScaleOrders : setScaleShipping;

  const scales = metric === "revenue" ? REVENUE_SCALES : metric === "orders" ? ORDERS_SCALES : SHIPPING_SCALES;
  const yMax = scale === "Auto" ? undefined : Number(scale);
  const isCurrency = metric === "revenue" || metric === "shipping";

  const domain = yMax != null ? [0, yMax] : undefined;

  const gradientId = `trend-fill-${metric}-${granularity}`;

  const modeSource = granularity === inferredGranularity ? "auto" : "manual";
  const groupingHint = `${GRAN_LABEL[granularity]} · ${modeSource}`;

  const curve = CURVE[granularity];
  const strokeW = LINE_WIDTH[granularity];
  const fillTop = FILL_TOP_OPACITY[granularity];

  const xAxisTicks = useMemo(() => {
    const n = chartSeries.length;
    if (n === 0 || granularity !== "daily") return undefined;
    if (n <= 10) return undefined;
    const maxTicks = 9;
    const step = Math.max(1, Math.ceil((n - 1) / (maxTicks - 1)));
    const ticks: string[] = [];
    for (let i = 0; i < n; i += step) {
      ticks.push(chartSeries[i]!.day);
    }
    const last = chartSeries[n - 1]!.day;
    if (ticks[ticks.length - 1] !== last) ticks.push(last);
    return ticks;
  }, [chartSeries, granularity]);

  const dailyDense = granularity === "daily" && chartSeries.length > 12;
  const xBottom = dailyDense ? 56 : 28;

  return (
    <div className="transition-app app-panel-3d overflow-hidden rounded-2xl border border-slate-200/85 bg-white/97 dark:border-slate-700/75 dark:bg-slate-900/85">
      <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 dark:border-slate-800/80 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <div className="min-w-0 sm:pr-4">
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-50">{CHART_TITLES[metric]}</h2>
          <p className="mt-0.5 text-xs text-slate-500 transition-colors duration-300 dark:text-slate-400">{groupingHint}</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end sm:gap-3">
          <div className="app-inset-well inline-flex self-start rounded-full bg-slate-100/95 p-1 dark:bg-slate-800/80 sm:self-auto">
            {(["daily", "weekly", "monthly"] as const).map((id) => (
              <button
                key={id}
                type="button"
                onClick={() => onGranularityChange(id)}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-[transform,box-shadow,background-color,color] duration-300 ease-out sm:text-sm ${
                  granularity === id
                    ? "scale-[1.02] bg-[color:var(--accent)] text-white shadow-[0_1px_0_rgba(255,255,255,0.25)_inset,0_2px_10px_-2px_var(--accent-glow)]"
                    : "text-slate-600 hover:bg-slate-200/80 dark:text-slate-300 dark:hover:bg-slate-600/50"
                }`}
              >
                {GRAN_LABEL[id]}
              </button>
            ))}
          </div>
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
          <label className="flex items-center gap-1.5 self-end opacity-80 sm:self-auto">
            <span className="whitespace-nowrap text-[10px] font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">
              Scale
            </span>
            <select
              value={scale}
              onChange={(e) => setScale(e.target.value)}
              className="min-w-[4.75rem] rounded-md border border-slate-200/60 bg-white/80 px-2 py-1 text-[11px] font-medium text-slate-500 focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400/25 dark:border-slate-600/60 dark:bg-slate-950/70 dark:text-slate-400"
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

      <div className="relative h-[340px] px-2 pb-4 pt-2 sm:h-[420px] lg:h-[460px]">
        {chartSeries.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center rounded-xl border border-dashed border-slate-200/90 bg-slate-50/90 px-6 text-center dark:border-slate-600/70 dark:bg-slate-900/40">
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">No chart data yet</p>
            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">Add an Order List on Imports.</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartSeries} margin={{ top: 12, right: 12, left: 4, bottom: xBottom }}>
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#2563eb" stopOpacity={fillTop} />
                  <stop offset="100%" stopColor="#2563eb" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
              <XAxis
                key={`xaxis-${granularity}`}
                dataKey="day"
                tick={dailyDense ? <XAxisTickAngled /> : <XAxisTick />}
                ticks={xAxisTicks}
                interval={granularity === "daily" && chartSeries.length <= 10 ? 0 : "preserveEnd"}
                tickMargin={6}
                axisLine={false}
                tickLine={false}
                height={xBottom + 8}
              />
              <YAxis
                tickMargin={8}
                width={56}
                domain={domain}
                tickFormatter={(v: number) => (isCurrency ? formatMoney(v) : String(Math.round(v)))}
                tick={{ fontSize: 11, fill: "#64748b" }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                key={`tooltip-${granularity}-${metric}-${chartSeries.length}`}
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const row = payload[0]?.payload as TrendPoint | undefined;
                  if (!row) return null;
                  const tooltipPeriod =
                    granularity === "monthly"
                      ? new Date(row.dateMs).toLocaleString("en-US", { month: "short", year: "numeric" })
                      : row.day;
                  return (
                    <div className="rounded-lg border border-slate-200/90 bg-white/98 px-3 py-2 text-xs shadow-md dark:border-slate-600/80 dark:bg-slate-900/95">
                      <div className="font-semibold text-slate-900 dark:text-slate-100">{tooltipPeriod}</div>
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
                            {row.orders > 0 ? <div>AOV: {formatMoney(row.revenue / row.orders)}</div> : null}
                          </>
                        )}
                      </div>
                    </div>
                  );
                }}
              />
              <Area
                type={curve}
                dataKey={metric}
                stroke="none"
                fill={`url(#${gradientId})`}
                fillOpacity={1}
                isAnimationActive={!reduceMotion}
                animationDuration={chartAnim}
                animationEasing="ease-in-out"
              />
              <Line
                type={curve}
                dataKey={metric}
                stroke="#2563eb"
                strokeWidth={strokeW}
                dot={false}
                activeDot={{ r: 4, fill: "#2563eb", stroke: "#fff", strokeWidth: 2 }}
                isAnimationActive={!reduceMotion}
                animationDuration={chartAnim}
                animationEasing="ease-in-out"
              />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
