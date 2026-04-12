/**
 * Dev-only timings for import pipeline.
 * Enable any of:
 * - `NEXT_PUBLIC_CARDOPS_IMPORT_PERF=1` (Next env)
 * - `localStorage.setItem("cardops-import-perf","1")` then reload
 *
 * Logs: `[CardOps import perf]` parse (sync/worker), filter_order_rows, filter_summary_rows, evaluate_import_batch, per-file batch times.
 */
export function importPerfEnabled(): boolean {
  if (typeof window === "undefined") return false;
  try {
    if (process.env.NEXT_PUBLIC_CARDOPS_IMPORT_PERF === "1") return true;
    return localStorage.getItem("cardops-import-perf") === "1";
  } catch {
    return process.env.NEXT_PUBLIC_CARDOPS_IMPORT_PERF === "1";
  }
}

export function logImportPerf(stage: string, ms: number, extra?: Record<string, unknown>): void {
  if (!importPerfEnabled()) return;
  const payload = { stage, ms: Math.round(ms * 10) / 10, ...extra };
  console.info("[CardOps import perf]", payload);
}
