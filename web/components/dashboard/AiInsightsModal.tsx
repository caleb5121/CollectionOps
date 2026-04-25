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
  /** `inline` = expand in page flow below the trigger (no dim/blur overlay). `modal` = centered overlay. */
  presentation?: "modal" | "inline";
};

type StatusTone = "good" | "warn" | "risk";

function toneClasses(tone: StatusTone): string {
  if (tone === "good") {
    return "border-emerald-200/90 bg-emerald-50 text-emerald-800 dark:border-emerald-700/70 dark:bg-emerald-950/30 dark:text-emerald-300";
  }
  if (tone === "warn") {
    return "border-amber-200/90 bg-amber-50 text-amber-800 dark:border-amber-700/70 dark:bg-amber-950/30 dark:text-amber-300";
  }
  return "border-rose-200/90 bg-rose-50 text-rose-800 dark:border-rose-700/70 dark:bg-rose-950/30 dark:text-rose-300";
}

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

  const profitHealth: { label: string; tone: StatusTone; detail: string } =
    keepPct >= 70
      ? { label: "Healthy", tone: "good", detail: `You're keeping about ${keepPct.toFixed(0)}% after costs.` }
      : keepPct >= 50
        ? { label: "Watch", tone: "warn", detail: `You keep about ${keepPct.toFixed(0)}% after costs in this range.` }
        : { label: "Risk", tone: "risk", detail: `You keep about ${keepPct.toFixed(0)}% after costs right now.` };

  const feesImpact: { label: string; tone: StatusTone; detail: string } =
    feePct < 30
      ? { label: "Low", tone: "good", detail: `Fees and shipping are about ${feePct.toFixed(0)}% of revenue.` }
      : feePct < 40
        ? { label: "Moderate", tone: "warn", detail: `Fees and shipping are about ${feePct.toFixed(0)}% of revenue.` }
        : { label: "High", tone: "risk", detail: `Fees and shipping are about ${feePct.toFixed(0)}% of revenue.` };

  const aovLabel = aov.toLocaleString(undefined, { style: "currency", currency: "USD" });
  const orderSize: { label: string; tone: StatusTone; detail: string } =
    aov >= 28
      ? {
          label: "Strong",
          tone: "good",
          detail: `Average order is ${aovLabel}. Basket size looks healthy here — often multi-item checkouts in this window.`,
        }
      : aov >= 16
        ? {
            label: "Mixed",
            tone: "warn",
            detail: `Average order is ${aovLabel}. On TCGplayer you can't control cart size directly — you can still influence baskets through how you price and position listings, plus inventory depth.`,
          }
        : {
            label: "Small",
            tone: "risk",
            detail: `Average order is ${aovLabel}. You can't control cart size directly, but you can influence it through pricing and inventory strategy.`,
          };

  const takeawayLine =
    keepPct >= 60 && aov < 18
      ? "⚡ You're profitable, but small order sizes are holding back total profit potential."
      : keepPct < 50
        ? "⚡ Costs are eating too much of revenue in this window."
        : "⚡ Your store is profitable — there's room to influence how buyers build carts.";

  function softenInsightLine(line: string): string {
    const t = line.trim();
    const lower = t.toLowerCase();
    if (
      lower.includes("increase aov") ||
      lower.includes("increase order") ||
      (lower.includes("order size") &&
        (lower.includes("increase") || lower.includes("raise") || lower.includes("grow"))) ||
      lower.includes("cart minimum") ||
      lower.includes("buy more") ||
      lower.includes("make customers") ||
      lower.includes("force buyers") ||
      lower.includes("make them buy")
    ) {
      return "Small order sizes are limiting total profit, even though margins are strong";
    }
    return t;
  }

  const actionableTips = (() => {
    const fromInsights = insights
      .map((line) => softenInsightLine(splitInsightLine(line).takeaway.trim()))
      .filter(Boolean)
      .slice(0, 2)
      .map((line) => line.replace(/^[•💡]\s*/, "").trim())
      .map((line) => `• ${line}`);
    if (fromInsights.length >= 2) return fromInsights;
    const fallback: string[] = [];
    if (aov < 18) {
      fallback.push("• Small order sizes are limiting total profit, even though margins are strong");
    }
    if (feePct >= 35) {
      fallback.push(
        "• Fees take a large share of gross — positioning higher-value listings can help fees matter less per dollar sold.",
      );
    }
    if (orderCount < 12) {
      fallback.push("• Add another date range when you can to confirm trends with more orders.");
    }
    while (fallback.length < 2) {
      fallback.push("• Keep comparing similar windows to see how buyer behavior shifts.");
    }
    return fallback.slice(0, 2);
  })();

  const nextMoveStrategies = [
    "Keep deep inventory in cards buyers commonly need to complete sets.",
    "Watch avg net per order, not just gross sales, before scaling volume.",
    "Use a second date range check to confirm this performance is repeatable.",
  ] as const;

  const bodyScrollClass =
    presentation === "inline"
      ? "overflow-visible px-5 py-4"
      : "min-h-0 flex-1 overflow-y-auto px-5 py-4";

  const panelHeader = (
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
  );

  const panelBody = (
    <div className={bodyScrollClass}>
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
              <div className="rounded-xl border border-cyan-200/80 bg-cyan-50/70 px-3.5 py-3 dark:border-cyan-700/70 dark:bg-cyan-950/30">
                <p className="text-sm font-bold leading-snug text-cyan-900 dark:text-cyan-100">{takeawayLine}</p>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <article className={`rounded-xl border px-3 py-3 ${toneClasses(profitHealth.tone)}`}>
                  <p className="text-[11px] font-semibold uppercase tracking-wide">Profit Health</p>
                  <p className="mt-1 text-sm font-bold">{profitHealth.label}</p>
                  <p className="mt-1 text-xs leading-snug opacity-90">{profitHealth.detail}</p>
                </article>
                <article className={`rounded-xl border px-3 py-3 ${toneClasses(feesImpact.tone)}`}>
                  <p className="text-[11px] font-semibold uppercase tracking-wide">Fees Impact</p>
                  <p className="mt-1 text-sm font-bold">{feesImpact.label}</p>
                  <p className="mt-1 text-xs leading-snug opacity-90">{feesImpact.detail}</p>
                </article>
                <article className={`rounded-xl border px-3 py-3 ${toneClasses(orderSize.tone)}`}>
                  <p className="text-[11px] font-semibold uppercase tracking-wide">Order Size</p>
                  <p className="mt-1 text-sm font-bold">{orderSize.label}</p>
                  <p className="mt-1 text-xs leading-snug opacity-90">{orderSize.detail}</p>
                </article>
              </div>

              <section className="mt-4 rounded-xl border border-slate-200/85 bg-white/70 px-3.5 py-3 dark:border-slate-700/70 dark:bg-slate-800/45">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Visual Breakdown</h3>
                <div className="mt-3 space-y-2.5">
                  <div>
                    <div className="mb-1 flex items-center justify-between text-xs font-medium text-slate-700 dark:text-slate-200">
                      <span>Revenue</span>
                      <span>{gross.toLocaleString(undefined, { style: "currency", currency: "USD" })}</span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-200/80 dark:bg-slate-700/70">
                      <div className="h-full rounded-full bg-cyan-500" style={{ width: `${revenuePct}%` }} />
                    </div>
                  </div>
                  <div>
                    <div className="mb-1 flex items-center justify-between text-xs font-medium text-slate-700 dark:text-slate-200">
                      <span>Fees</span>
                      <span>{fees.toLocaleString(undefined, { style: "currency", currency: "USD" })}</span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-200/80 dark:bg-slate-700/70">
                      <div className="h-full rounded-full bg-amber-500" style={{ width: `${feePct}%` }} />
                    </div>
                  </div>
                  <div>
                    <div className="mb-1 flex items-center justify-between text-xs font-medium text-slate-700 dark:text-slate-200">
                      <span>Net</span>
                      <span>{net.toLocaleString(undefined, { style: "currency", currency: "USD" })}</span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-200/80 dark:bg-slate-700/70">
                      <div className="h-full rounded-full bg-emerald-500" style={{ width: `${netPctForBar}%` }} />
                    </div>
                  </div>
                </div>
              </section>

              <section className="mt-4 rounded-xl border border-slate-200/85 bg-slate-50/70 px-3.5 py-3 dark:border-slate-700/70 dark:bg-slate-800/45">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Actionable insights</h3>
                <ul className="mt-2 space-y-2 pl-0.5">
                  {actionableTips.map((tip, i) => (
                    <li key={`${i}-${tip}`} className="text-sm font-medium leading-snug text-slate-800 dark:text-slate-100">
                      {tip}
                    </li>
                  ))}
                </ul>
              </section>

              <section className="mt-4 rounded-xl border border-slate-200/85 bg-white/70 px-3.5 py-3 dark:border-slate-700/70 dark:bg-slate-800/45">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Next move</h3>
                <ul className="mt-2 list-disc space-y-2 pl-4 text-sm font-medium leading-snug text-slate-800 dark:text-slate-100">
                  {nextMoveStrategies.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
              </section>

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
