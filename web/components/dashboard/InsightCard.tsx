import type { InsightTone } from "../../lib/dashboardInsights";

const toneStyles: Record<
  InsightTone,
  { border: string; bg: string; title: string; accent: string }
> = {
  positive: {
    border: "border-emerald-500/35",
    bg: "bg-emerald-50/90 dark:bg-emerald-950/35",
    title: "text-emerald-950 dark:text-emerald-100",
    accent: "bg-emerald-500/90",
  },
  caution: {
    border: "border-amber-500/40",
    bg: "bg-amber-50/90 dark:bg-amber-950/35",
    title: "text-amber-950 dark:text-amber-50",
    accent: "bg-amber-500/90",
  },
  negative: {
    border: "border-red-500/35",
    bg: "bg-red-50/90 dark:bg-red-950/35",
    title: "text-red-950 dark:text-red-100",
    accent: "bg-red-500/90",
  },
  neutral: {
    border: "border-slate-300/90 dark:border-slate-600/80",
    bg: "bg-white/95 dark:bg-slate-900/75",
    title: "text-slate-900 dark:text-slate-50",
    accent: "bg-slate-500/80",
  },
};

export function InsightCard({
  headline,
  supporting,
  tone,
}: {
  headline: string;
  supporting: string;
  tone: InsightTone;
}) {
  const s = toneStyles[tone];
  return (
    <article
      className={`relative overflow-hidden rounded-2xl border ${s.border} ${s.bg} p-6 shadow-[0_1px_0_rgba(255,255,255,0.6)_inset] ring-1 ring-slate-900/[0.04] dark:shadow-none dark:ring-white/5 sm:p-7`}
    >
      <div className={`absolute left-0 top-0 h-full w-1 ${s.accent}`} aria-hidden />
      <h3 className={`pl-3 text-lg font-bold leading-snug tracking-tight ${s.title}`}>{headline}</h3>
      <p className="mt-3 pl-3 text-sm leading-relaxed text-slate-600 dark:text-slate-300">{supporting}</p>
    </article>
  );
}
