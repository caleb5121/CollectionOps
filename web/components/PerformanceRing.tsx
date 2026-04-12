"use client";

import InfoTooltip from "./InfoTooltip";

type Props = {
  title: string;
  score: number;
  label: string;
  tooltip?: string;
};

function getStrokeColor(score: number): string {
  if (score >= 80) return "#22c55e"; // green
  if (score >= 60) return "#eab308"; // yellow
  return "#ef4444"; // red
}

export default function PerformanceRing({ title, score, label, tooltip }: Props) {
  const radius = 42;
  const stroke = 8;
  const normalizedRadius = radius - stroke * 0.5;
  const circumference = normalizedRadius * 2 * Math.PI;

  const progress = Math.min(Math.max(score / 100, 0), 1);
  const strokeDashoffset = circumference - progress * circumference;
  const strokeColor = getStrokeColor(score);

  return (
    <div className="app-card-3d flex flex-col items-center gap-2 rounded-xl border border-slate-200/85 bg-white/95 p-5 dark:border-slate-700/80 dark:bg-slate-900/80">
      <div className="flex items-center gap-1.5">
        <span className="text-[13px] font-medium text-gray-500 opacity-70">{title}</span>
        {tooltip ? <InfoTooltip text={tooltip} /> : null}
      </div>
      <svg height={radius * 2} width={radius * 2} className="flex-shrink-0">
        <circle
          stroke="#e5e7eb"
          fill="transparent"
          strokeWidth={stroke}
          r={normalizedRadius}
          cx={radius}
          cy={radius}
        />
        <circle
          stroke={strokeColor}
          fill="transparent"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${circumference} ${circumference}`}
          style={{ strokeDashoffset }}
          r={normalizedRadius}
          cx={radius}
          cy={radius}
          transform={`rotate(-90 ${radius} ${radius})`}
        />
      </svg>
      <div className="text-lg font-bold tracking-tight text-gray-900">{Math.round(score)}</div>
      <div className="text-xs font-medium text-gray-600">{label}</div>
    </div>
  );
}
