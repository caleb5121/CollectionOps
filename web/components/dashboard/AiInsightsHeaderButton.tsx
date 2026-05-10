"use client";

import { useState } from "react";
import { useData } from "../DataProvider";
import { canRequestAiInsights } from "../../lib/aiInsightsSummary";
import AiInsightsModal from "./AiInsightsModal";

const toolbarBtn =
  "inline-flex items-center justify-center rounded-lg border text-xs font-semibold shadow-sm transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent)]/40 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-slate-900";

const heroBtn =
  "inline-flex shrink-0 items-center justify-center rounded-lg border border-[color:color-mix(in_oklab,var(--cta-orange)_55%,transparent)] bg-[color:var(--cta-orange)] px-3 py-1.5 text-xs font-semibold text-white shadow-[0_2px_8px_-2px_rgba(234,88,12,0.45)] transition-[transform,background-color,box-shadow] duration-200 hover:bg-[color:var(--cta-orange-hover)] hover:shadow-[0_4px_14px_-4px_rgba(234,88,12,0.4)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--cta-orange)]/35 active:scale-[0.97]";

type Props = {
  /** `hero` = light button on dark dashboard card; `toolbar` = previous shell placement. */
  variant?: "toolbar" | "hero";
  className?: string;
  /** `inline` expands content in the page (no blur). `modal` = overlay. */
  presentation?: "modal" | "inline";
};

export default function AiInsightsHeaderButton({
  variant = "toolbar",
  className = "",
  presentation = "modal",
}: Props) {
  const [open, setOpen] = useState(false);
  const { hasDashboardImport, hasOrderImport, derived } = useData();

  const hasAnyImport = hasOrderImport || hasDashboardImport;
  const eligible = canRequestAiInsights({ hasOrderImport, hasDashboardImport, derived });

  if (!hasAnyImport) {
    return null;
  }

  if (!eligible) {
    if (variant === "hero") {
      return (
        <button
          type="button"
          disabled
          aria-disabled="true"
          title="Import data to use insights"
          className={`${heroBtn} cursor-not-allowed opacity-45 ${className}`}
        >
          View insights
        </button>
      );
    }
    return (
      <div className="flex max-w-[14rem] flex-col items-end gap-1 text-right sm:max-w-none">
        <button
          type="button"
          disabled
          aria-disabled="true"
          title="Import data to use insights"
          className={`${toolbarBtn} cursor-not-allowed border-slate-200/90 bg-slate-50 px-3 py-1.5 text-slate-400 dark:border-slate-600/80 dark:bg-slate-900/60 dark:text-slate-500`}
        >
          View insights
        </button>
        <p className="text-[10px] font-medium leading-snug text-slate-500 dark:text-slate-400">
          Import data for coaching notes
        </p>
      </div>
    );
  }

  const btnClass = variant === "hero" ? `${heroBtn} ${className}` : `${toolbarBtn} ${className} border-slate-200/90 bg-white px-3 py-1.5 text-slate-700 hover:border-[color:color-mix(in_oklab,var(--accent)_30%,transparent)] hover:bg-slate-50 dark:border-slate-600/80 dark:bg-slate-900/90 dark:text-slate-200 dark:hover:border-[color:color-mix(in_oklab,var(--accent)_35%,transparent)] dark:hover:bg-slate-800/90`;

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={btnClass}>
        View insights
      </button>
      <AiInsightsModal open={open} onClose={() => setOpen(false)} presentation={presentation} />
    </>
  );
}
