"use client";

import { useState } from "react";
import { useData } from "../DataProvider";
import { canRequestAiInsights } from "../../lib/aiInsightsSummary";
import AiInsightsModal from "./AiInsightsModal";

const btnBase =
  "inline-flex items-center justify-center rounded-lg border text-xs font-semibold shadow-sm transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent)]/40 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-slate-900";

export default function AiInsightsHeaderButton() {
  const [open, setOpen] = useState(false);
  const { hasDashboardImport, hasOrderImport, derived } = useData();

  const hasAnyImport = hasOrderImport || hasDashboardImport;
  const eligible = canRequestAiInsights({ hasOrderImport, hasDashboardImport, derived });

  if (!hasAnyImport) {
    return null;
  }

  if (!eligible) {
    return (
      <div className="flex max-w-[14rem] flex-col items-end gap-1 text-right sm:max-w-none">
        <button
          type="button"
          disabled
          aria-disabled="true"
          title="Upload data to use AI Insights"
          className={`${btnBase} cursor-not-allowed border-slate-200/90 bg-slate-50 px-3 py-1.5 text-slate-400 dark:border-slate-600/80 dark:bg-slate-900/60 dark:text-slate-500`}
        >
          AI Insights
        </button>
        <p className="text-[10px] font-medium leading-snug text-slate-500 dark:text-slate-400">
          Upload data to use AI Insights
        </p>
      </div>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`${btnBase} border-slate-200/90 bg-white px-3 py-1.5 text-slate-700 hover:border-[color:color-mix(in_oklab,var(--accent)_30%,transparent)] hover:bg-slate-50 dark:border-slate-600/80 dark:bg-slate-900/90 dark:text-slate-200 dark:hover:border-[color:color-mix(in_oklab,var(--accent)_35%,transparent)] dark:hover:bg-slate-800/90`}
      >
        AI Insights
      </button>
      <AiInsightsModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}
