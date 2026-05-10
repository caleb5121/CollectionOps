"use client";

type StatusPillVariant = "success" | "warning" | "neutral" | "info";

const variantStyles: Record<StatusPillVariant, string> = {
  success:
    "border-emerald-200/95 bg-gradient-to-b from-emerald-50 to-emerald-50/90 text-emerald-900 shadow-[0_1px_0_rgba(255,255,255,0.75)_inset,0_2px_6px_-2px_rgba(16,185,129,0.2)] ring-emerald-900/[0.04] dark:border-emerald-800/55 dark:from-emerald-950/45 dark:to-emerald-950/30 dark:text-emerald-100 dark:shadow-[0_1px_0_rgba(255,255,255,0.06)_inset] dark:ring-emerald-400/10",
  warning:
    "border-amber-200/95 bg-gradient-to-b from-amber-50 to-amber-50/88 text-amber-950 shadow-[0_1px_0_rgba(255,255,255,0.75)_inset,0_2px_6px_-2px_rgba(245,158,11,0.18)] ring-amber-900/[0.05] dark:border-amber-800/50 dark:from-amber-950/40 dark:to-amber-950/25 dark:text-amber-100 dark:ring-amber-400/10",
  neutral:
    "border-zinc-200/95 bg-gradient-to-b from-zinc-50 to-zinc-50/90 text-zinc-800 shadow-[0_1px_0_rgba(255,255,255,0.8)_inset,0_2px_6px_-2px_rgba(24,24,27,0.06)] ring-zinc-900/[0.04] dark:border-zinc-700/75 dark:from-zinc-900/70 dark:to-zinc-900/50 dark:text-zinc-100 dark:ring-white/[0.04]",
  info:
    "border-sky-200/90 bg-gradient-to-b from-sky-50 to-sky-50/88 text-sky-950 shadow-[0_1px_0_rgba(255,255,255,0.75)_inset,0_2px_6px_-2px_rgba(14,165,233,0.14)] ring-sky-900/[0.04] dark:border-sky-800/50 dark:from-sky-950/40 dark:to-sky-950/25 dark:text-sky-100 dark:ring-sky-400/10",
};

export default function StatusPill({
  variant,
  children,
}: {
  variant: StatusPillVariant;
  children: React.ReactNode;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold tracking-wide ring-1 ${variantStyles[variant]}`}
    >
      {children}
    </span>
  );
}
