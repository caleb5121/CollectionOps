"use client";

type StatusPillVariant = "success" | "warning" | "neutral" | "info";

const variantStyles: Record<StatusPillVariant, string> = {
  success:
    "border-emerald-200/90 bg-emerald-50 text-emerald-800 dark:border-emerald-800/50 dark:bg-emerald-950/35 dark:text-emerald-200",
  warning:
    "border-amber-200/90 bg-amber-50 text-amber-900 dark:border-amber-800/45 dark:bg-amber-950/30 dark:text-amber-100",
  neutral: "border-zinc-200/90 bg-zinc-50 text-zinc-700 dark:border-zinc-700/70 dark:bg-zinc-900/60 dark:text-zinc-200",
  info: "border-zinc-200/90 bg-zinc-50 text-zinc-700 dark:border-zinc-700/70 dark:bg-zinc-900/60 dark:text-zinc-200",
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
      className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[0.6875rem] font-medium shadow-sm ${variantStyles[variant]}`}
    >
      {children}
    </span>
  );
}
