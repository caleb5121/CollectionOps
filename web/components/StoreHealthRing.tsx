"use client";

import { useId } from "react";
import InfoTooltip from "./InfoTooltip";

/** Traffic-light: green = good, yellow = mid, red = needs attention */
function healthRingColor(score: number): string {
  if (score >= 70) return "#22c55e";
  if (score >= 45) return "#eab308";
  return "#ef4444";
}

export type StoreHealthRingProps = {
  title: string;
  score: number;
  statusLabel: string;
  caption: string;
  tooltip?: string;
  empty?: boolean;
};

/**
 * Store Health rings - score 0–100 with load animation and subtle hover lift.
 */
export function StoreHealthRing({ title, score, statusLabel, caption, tooltip, empty }: StoreHealthRingProps) {
  const uid = useId().replace(/:/g, "");
  const trackId = `ring-track-${uid}`;
  const size = 96;
  const stroke = 5;
  const radius = (size - stroke) / 2 - 2;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.min(Math.max(score, 0), 100);
  const progress = empty ? 0 : clamped / 100;
  const offset = circumference - progress * circumference;
  const strokeColor = empty ? "#cbd5e1" : healthRingColor(clamped);

  const displayScore = empty ? "-" : String(Math.round(clamped));
  const displayStatus = empty || statusLabel === "-" ? "-" : statusLabel;

  const progressStyle = {
    "--ring-circ": circumference,
    "--ring-offset": offset,
  } as React.CSSProperties;

  return (
    <div
      className="group transition-app app-panel-3d flex w-full max-w-[180px] flex-col items-center rounded-2xl border border-white/70 bg-gradient-to-b from-white to-slate-50/95 px-4 pb-5 pt-5 ring-1 ring-slate-900/[0.04] hover:scale-[1.03] hover:ring-[color:var(--accent)]/25 hover:shadow-[0_12px_40px_-12px_rgba(13,148,136,0.22),0_8px_24px_-8px_rgba(15,23,42,0.12)] active:scale-[0.99] dark:border-slate-700/60 dark:from-slate-900/80 dark:to-slate-950/90 dark:hover:ring-[color:var(--accent)]/30 dark:hover:shadow-[0_12px_40px_-12px_rgba(45,212,191,0.15),0_8px_24px_-8px_rgba(0,0,0,0.45)]"
    >
      <div className="flex min-h-[1.25rem] items-center justify-center gap-1">
        <p className="text-center text-[11px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          {title}
        </p>
        {tooltip ? <InfoTooltip text={tooltip} /> : null}
      </div>
      <svg
        width={size}
        height={size}
        className="mt-2 shrink-0 drop-shadow-sm transition-transform duration-300 ease-out group-hover:drop-shadow-md"
        viewBox={`0 0 ${size} ${size}`}
        aria-hidden
      >
        <defs>
          <linearGradient id={trackId} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#e2e8f0" />
            <stop offset="100%" stopColor="#f1f5f9" />
          </linearGradient>
        </defs>
        <circle stroke={`url(#${trackId})`} fill="none" strokeWidth={stroke} r={radius} cx={cx} cy={cy} />
        <circle
          key={`${clamped}-${empty}`}
          stroke={strokeColor}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={empty ? circumference : undefined}
          r={radius}
          cx={cx}
          cy={cy}
          transform={`rotate(-90 ${cx} ${cy})`}
          style={empty ? undefined : progressStyle}
          className={empty ? "transition-[stroke-dashoffset] duration-500 ease-out" : "health-ring-progress"}
        />
        <text
          x={cx}
          y={cy + 2}
          textAnchor="middle"
          dominantBaseline="middle"
          fill={empty ? "#cbd5e1" : "#1e293b"}
          className="dark:fill-slate-100"
          style={{ fontSize: empty ? 16 : 18, fontWeight: 700 }}
        >
          {displayScore}
        </text>
      </svg>
      <p className="mt-2 text-center text-xs font-semibold text-slate-800 dark:text-slate-100">{displayStatus}</p>
      <p className="mt-1.5 text-center text-[11px] leading-snug text-slate-500 dark:text-slate-400">{caption}</p>
    </div>
  );
}
