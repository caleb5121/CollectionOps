"use client";

import { useId } from "react";

/** Lightweight in-card trend line — no Recharts (keeps bundle small for many mounts). */
export function MiniSparkline({
  values,
  color = "var(--accent)",
  className = "",
}: {
  values: number[];
  color?: string;
  className?: string;
}) {
  const uid = useId().replace(/:/g, "");
  if (values.length < 2) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const padX = 2;
  const padY = 3;
  const w = 112;
  const h = 32;
  const range = max - min || 1;
  const coords = values.map((v, i) => {
    const x = padX + (i / (values.length - 1)) * (w - 2 * padX);
    const y = padY + (1 - (v - min) / range) * (h - 2 * padY);
    return [x, y] as const;
  });
  const d = coords
    .map(([x, y], i) => `${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`)
    .join(" ");
  const last = coords[coords.length - 1]!;
  const first = coords[0]!;

  return (
    <svg
      width={w}
      height={h}
      viewBox={`0 0 ${w} ${h}`}
      className={`shrink-0 overflow-visible ${className}`}
      aria-hidden
    >
      <defs>
        <linearGradient id={`spark-fill-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.22" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path
        d={`${d} L ${last[0].toFixed(1)} ${h} L ${first[0].toFixed(1)} ${h} Z`}
        fill={`url(#spark-fill-${uid})`}
        className="transition-opacity duration-300"
      />
      <path
        d={d}
        fill="none"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
