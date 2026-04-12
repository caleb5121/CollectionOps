"use client";

export default function MiniSparkline({
  values,
  className = "",
  empty = false,
  stroke = "#5eead4",
}: {
  values: number[];
  className?: string;
  empty?: boolean;
  /** Stroke for light-on-dark hero (default teal). */
  stroke?: string;
}) {
  if (empty || values.length === 0) {
    return <div className={`h-8 w-full rounded bg-white/10 ${className}`} aria-hidden />;
  }
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const w = 100;
  const h = 28;
  const pad = 2;
  const pts = values.map((v, i) => {
    const x = pad + (i / Math.max(values.length - 1, 1)) * (w - pad * 2);
    const y = h - pad - ((v - min) / range) * (h - pad * 2);
    return `${x},${y}`;
  });
  const d = `M ${pts.join(" L ")}`;
  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      className={`h-10 w-full max-w-md ${className}`}
      preserveAspectRatio="none"
      aria-hidden
    >
      <path
        d={d}
        fill="none"
        stroke={stroke}
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
