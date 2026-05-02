"use client";

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
  /** `inline` = expand in page flow below the trigger (no dim/blur overlay). `modal` = centered overlay. */
  presentation?: "modal" | "inline";
};

export default function AiInsightsModal({ open, onClose, presentation = "modal" }: Props) {
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
  const [showFullAnalysis, setShowFullAnalysis] = useState(false);

  const resetForClose = useCallback(() => {
    setPhase("idle");
    setInsights([]);
    setDegraded(false);
    setAttempt(0);
    setShowFullAnalysis(false);
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
          let merged = fromApi.slice(0, 3);
          if (merged.length < 2) {
            merged = dedupeInsightLines([...merged, ...buildFallbackInsights(summary)]).slice(0, 3);
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

  const gross = derived.grossSales;
  const net = estimatedNet ?? 0;
  const fees = costsForNetDisplay ?? 0;
  const keepPct = gross > 0 ? Math.max(0, Math.min(100, (net / gross) * 100)) : 0;
  const feePct = gross > 0 ? Math.max(0, Math.min(100, (fees / gross) * 100)) : 0;
  const revenuePct = gross > 0 ? 100 : 0;
  const netPctForBar = gross > 0 ? Math.max(0, Math.min(100, (Math.max(0, net) / gross) * 100)) : 0;
  const orderCount = derived.orders;
  const aov = derived.aov ?? 0;

  const totalEarned = net.toLocaleString(undefined, { style: "currency", currency: "USD" });
  const aovLabel = aov.toLocaleString(undefined, { style: "currency", currency: "USD" });
  const takeaways = insights.map((line) => splitInsightLine(line).takeaway.trim()).filter(Boolean).slice(0, 3);
  const compactTakeaways = takeaways.length > 0 ? takeaways : ["Import another date range to unlock smart takeaways."];
  const feesWarning = feePct >= 40;

  const bodyScrollClass =
    presentation === "inline"
      ? "overflow-visible px-4 py-3 sm:px-5 sm:py-3.5"
      : "min-h-0 flex-1 overflow-y-auto px-4 py-3 sm:px-5 sm:py-3.5";

  const panelHeader = (
    <div className="flex items-center justify-between gap-3 border-b border-slate-200/80 px-4 py-3 sm:px-5 dark:border-slate-700/60">
      <h2 id={titleId} className="text-sm font-semibold text-slate-900 dark:text-slate-50">
        Insights
      </h2>
      <button
        type="button"
        onClick={onClose}
        className="rounded-lg px-2 py-1 text-sm font-medium text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
        aria-label="Close"
      >
        Hide Insights
      </button>
    </div>
  );

  const panelBody = (
    <div className={bodyScrollClass}>
          {phase === "no_data" ? (
            <p className="text-sm text-slate-600 dark:text-slate-300">Import data to open insights.</p>
          ) : null}

          {phase === "loading" ? (
            <div className="flex flex-col items-center justify-center gap-2 py-7">
              <div
                className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-[color:var(--accent)] dark:border-slate-600"
                aria-hidden
              />
              <p className="text-xs font-medium text-slate-600 dark:text-slate-300">Reviewing your metrics…</p>
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
            <div className="space-y-3.5">
              <section className="rounded-xl border border-slate-200/85 bg-white px-3.5 py-3 dark:border-slate-700/70 dark:bg-slate-900/70">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Total Earned</p>
                <p className="mt-1 text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50">{totalEarned}</p>
                <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
                  {orderCount.toLocaleString()} orders • AOV {aovLabel}
                </p>
                {feesWarning ? (
                  <p className="mt-2 rounded-md border border-amber-300/80 bg-amber-50/85 px-2.5 py-1.5 text-[11px] font-medium text-amber-900 dark:border-amber-700/50 dark:bg-amber-950/30 dark:text-amber-200">
                    Fees and shipping are taking {feePct.toFixed(0)}% of revenue.
                  </p>
                ) : null}
              </section>

              <section className="rounded-xl border border-slate-200/85 bg-slate-50/70 px-3.5 py-3 dark:border-slate-700/70 dark:bg-slate-800/45">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Smart Takeaways</h3>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">Top 3</span>
                </div>
                <ul className="mt-2.5 space-y-2">
                  {compactTakeaways.map((tip, i) => (
                    <li key={`${i}-${tip}`} className="text-sm font-medium leading-snug text-slate-800 dark:text-slate-100">
                      {tip}
                    </li>
                  ))}
                </ul>
                {degraded ? (
                  <p className="mt-2.5 text-[10px] leading-snug text-slate-500 dark:text-slate-400">
                    Based on your dashboard numbers on this device. Enhanced insights use the cloud when available.{" "}
                    <button
                      type="button"
                      onClick={() => setAttempt((a) => a + 1)}
                      className="font-semibold text-[color:var(--accent)] underline-offset-2 hover:underline"
                    >
                      Try enhanced insights
                    </button>
                  </p>
                ) : null}
              </section>

              <div className="flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => setShowFullAnalysis((prev) => !prev)}
                  className="rounded-lg border border-slate-300/90 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  {showFullAnalysis ? "Hide Full Analysis" : "Expand Full Analysis"}
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-lg border border-slate-300/90 bg-transparent px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800/80"
                >
                  Hide Insights
                </button>
              </div>

              {showFullAnalysis ? (
                <section className="rounded-xl border border-slate-200/85 bg-white/80 px-3.5 py-3 dark:border-slate-700/70 dark:bg-slate-900/55">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Full Analysis</h3>
                  <div className="mt-2.5 grid gap-2.5 sm:grid-cols-3">
                    <div className="rounded-lg border border-slate-200/80 bg-white px-2.5 py-2 dark:border-slate-700/70 dark:bg-slate-900/70">
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">Revenue</p>
                      <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                        {gross.toLocaleString(undefined, { style: "currency", currency: "USD" })}
                      </p>
                    </div>
                    <div className="rounded-lg border border-slate-200/80 bg-white px-2.5 py-2 dark:border-slate-700/70 dark:bg-slate-900/70">
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">Fees + Shipping</p>
                      <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                        {fees.toLocaleString(undefined, { style: "currency", currency: "USD" })}
                      </p>
                    </div>
                    <div className="rounded-lg border border-slate-200/80 bg-white px-2.5 py-2 dark:border-slate-700/70 dark:bg-slate-900/70">
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">Net Keep Rate</p>
                      <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{keepPct.toFixed(0)}%</p>
                    </div>
                  </div>
                </section>
              ) : null}
            </div>
          ) : null}
    </div>
  );

  if (presentation === "inline") {
    return (
      <div
        className="w-full max-w-none overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-lg dark:border-slate-700/80 dark:bg-slate-900/95"
        role="region"
        aria-labelledby={titleId}
      >
        {panelHeader}
        {panelBody}
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto bg-slate-900/35 p-4 pt-8 sm:pt-12"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="my-auto flex max-h-[min(92vh,720px)] w-full max-w-[min(100%,92rem)] flex-col overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-xl dark:border-slate-700/80 dark:bg-slate-900/95">
        {panelHeader}
        {panelBody}
      </div>
    </div>
  );
}
