"use client";

import Link from "next/link";
import { useCallback, useEffect, useId, useState } from "react";
import {
  buildAiInsightsSummary,
  buildFallbackInsights,
  canRequestAiInsights,
  dedupeInsightLines,
  parseInsightsResponseBody,
} from "../../lib/aiInsightsSummary";
import { splitInsightLine } from "../../lib/insightDisplay";
import { useData } from "../DataProvider";

const isDev = process.env.NODE_ENV === "development";

type Props = {
  open: boolean;
  onClose: () => void;
};

export default function AiInsightsModal({ open, onClose }: Props) {
  const titleId = useId();
  const {
    hasDashboardImport,
    hasOrderImport,
    derived,
    estimatedNet,
    feeRate,
    shippingEstimatedCost,
    costsForNetDisplay,
    effectiveOrderImports,
    effectiveSummaryImports,
    orderData,
    orderColumnMap,
    workspaceStoreLabel,
  } = useData();

  const [phase, setPhase] = useState<"idle" | "loading" | "done" | "no_data" | "error">("idle");
  const [insights, setInsights] = useState<string[]>([]);
  const [degraded, setDegraded] = useState(false);
  const [attempt, setAttempt] = useState(0);

  const resetForClose = useCallback(() => {
    setPhase("idle");
    setInsights([]);
    setDegraded(false);
    setAttempt(0);
  }, []);

  useEffect(() => {
    if (!open) {
      resetForClose();
      return;
    }

    const eligible = canRequestAiInsights({
      hasOrderImport,
      hasDashboardImport,
      derived,
    });

    if (!eligible) {
      setPhase("no_data");
      return;
    }

    const summary = buildAiInsightsSummary({
      workspaceStoreLabel,
      effectiveOrderImports,
      effectiveSummaryImports,
      derived,
      estimatedNet,
      shippingEstimatedCost,
      feeRate,
      costsForNetDisplay,
      orderData,
      orderColumnMap,
    });

    const fallback = buildFallbackInsights(summary);
    let cancelled = false;
    setPhase("loading");
    setInsights([]);
    setDegraded(false);

    (async () => {
      let list: string[] = fallback;
      let useDegraded = true;

      try {
        const res = await fetch("/api/ai-insights", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ summary }),
        });

        let raw: unknown = null;
        try {
          raw = await res.json();
        } catch (e) {
          if (isDev) console.warn("[AI Insights] Response body is not JSON", e);
        }

        const fromApi = parseInsightsResponseBody(raw);
        if (res.ok && fromApi.length > 0) {
          let merged = fromApi.slice(0, 4);
          if (merged.length < 2) {
            merged = dedupeInsightLines([...merged, ...buildFallbackInsights(summary)]).slice(0, 4);
          }
          if (merged.length >= 2) {
            list = merged;
            useDegraded = false;
          } else {
            list = fallback;
            useDegraded = true;
          }
        } else {
          if (isDev) {
            console.warn("[AI Insights] Using local fallback", {
              status: res.status,
              ok: res.ok,
              parsedCount: fromApi.length,
            });
          }
          list = fallback;
          useDegraded = true;
        }
      } catch (e) {
        if (isDev) console.warn("[AI Insights] Request failed", e);
        list = fallback;
        useDegraded = true;
      }

      if (cancelled) return;

      if (list.length === 0) {
        setPhase("error");
        return;
      }

      setInsights(list);
      setDegraded(useDegraded);
      setPhase("done");
    })();

    return () => {
      cancelled = true;
    };
  }, [
    open,
    hasOrderImport,
    hasDashboardImport,
    derived,
    estimatedNet,
    feeRate,
    shippingEstimatedCost,
    costsForNetDisplay,
    effectiveOrderImports,
    effectiveSummaryImports,
    orderData,
    orderColumnMap,
    workspaceStoreLabel,
    attempt,
    resetForClose,
  ]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="max-h-[min(90vh,540px)] w-full max-w-md overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-xl dark:border-slate-700/80 dark:bg-slate-900/95">
        <div className="flex items-center justify-between gap-3 border-b border-slate-200/80 px-5 py-3.5 dark:border-slate-700/60">
          <h2 id={titleId} className="text-base font-semibold text-slate-900 dark:text-slate-50">
            Insights
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-2 py-1 text-sm font-medium text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="max-h-[min(68vh,460px)] overflow-y-auto px-5 py-4">
          {phase === "no_data" ? (
            <p className="text-sm text-slate-600 dark:text-slate-300">Import data to open insights.</p>
          ) : null}

          {phase === "loading" ? (
            <div className="flex flex-col items-center justify-center gap-3 py-10">
              <div
                className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-[color:var(--accent)] dark:border-slate-600"
                aria-hidden
              />
              <p className="text-sm font-medium text-slate-600 dark:text-slate-300">Reviewing your metrics…</p>
            </div>
          ) : null}

          {phase === "error" ? (
            <div className="space-y-4">
              <p className="text-sm text-slate-700 dark:text-slate-200">Insights couldn&apos;t load just now.</p>
              <button
                type="button"
                onClick={() => setAttempt((a) => a + 1)}
                className="rounded-lg border border-slate-200/90 bg-slate-50 px-4 py-2 text-sm font-medium text-slate-800 transition hover:bg-slate-100 dark:border-slate-600/80 dark:bg-slate-800/80 dark:text-slate-100 dark:hover:bg-slate-800"
              >
                Try enhanced insights
              </button>
            </div>
          ) : null}

          {phase === "done" && insights.length > 0 ? (
            <>
              {degraded ? (
                <div role="status" className="mb-5 rounded-lg border border-slate-200/80 bg-slate-50 px-3 py-2.5 dark:border-slate-600/50 dark:bg-slate-800/50">
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">Quick insights (local)</p>
                  <p className="mt-1 text-xs leading-snug text-slate-600 dark:text-slate-400">
                    From your dashboard numbers on this device. Enhanced insights use the cloud when available.
                  </p>
                  <button
                    type="button"
                    onClick={() => setAttempt((a) => a + 1)}
                    className="mt-2 text-xs font-semibold text-[color:var(--accent)] underline-offset-2 hover:underline"
                  >
                    Try enhanced insights
                  </button>
                </div>
              ) : null}
              <ul className="space-y-5">
                {insights.map((text, i) => {
                  const { takeaway, detail } = splitInsightLine(text);
                  return (
                    <li key={`${i}-${text.slice(0, 24)}`} className="border-b border-slate-100 pb-5 last:border-0 last:pb-0 dark:border-slate-800/80">
                      <p className="text-sm font-bold leading-snug text-slate-900 dark:text-slate-50">{takeaway}</p>
                      {detail ? (
                        <p className="mt-1.5 text-sm leading-relaxed text-slate-600 dark:text-slate-400">{detail}</p>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
              <div className="mt-6 border-t border-slate-200/80 pt-4 dark:border-slate-700/60">
                <Link
                  href="/dashboard"
                  onClick={onClose}
                  className="flex w-full items-center justify-center rounded-lg border border-slate-200/90 bg-transparent px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800/80"
                >
                  Back to Dashboard
                </Link>
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
