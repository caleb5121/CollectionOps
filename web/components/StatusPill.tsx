"use client";

type StatusPillVariant = "success" | "warning" | "neutral" | "info";

const variantStyles: Record<StatusPillVariant, string> = {
  success: "bg-emerald-50 text-emerald-700 border-emerald-200/80",
  warning: "bg-amber-50 text-amber-800 border-amber-200/80",
  neutral: "bg-slate-50 text-slate-700 border-slate-200/80",
  info: "bg-sky-50 text-sky-700 border-sky-200/80",
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
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium shadow-[0_1px_0_rgba(255,255,255,0.75)_inset,0_1px_2px_rgba(15,23,42,0.06)] dark:shadow-[0_1px_0_rgba(255,255,255,0.08)_inset,0_2px_4px_rgba(0,0,0,0.35)] ${variantStyles[variant]}`}
    >
      {children}
    </span>
  );
}
