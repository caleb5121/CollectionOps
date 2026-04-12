import type { ImportBatchStatus, ImportSessionBatch } from "./importSessionBatch";
import { evaluateImportBatch } from "./importSessionBatch";

/**
 * Live batch evaluation status for Trends (does not use persisted summaryCache).
 */
export function importBatchTrendsStatus(batch: ImportSessionBatch): ImportBatchStatus {
  return evaluateImportBatch(batch.orderImports, batch.summaryImports).status;
}

/**
 * Statuses that may feed Trends: `ready` (accepted / fully validated) and `review`
 * (usable with caution). Excludes only `blocked` (fix / error / workspace not ready).
 */
export function isImportBatchTrendsEligibleStatus(status: ImportBatchStatus): boolean {
  return status === "ready" || status === "review";
}

/** True when this batch’s order list may be merged into Trends charts/KPIs. */
export function isImportBatchTrendsEligible(batch: ImportSessionBatch): boolean {
  return isImportBatchTrendsEligibleStatus(importBatchTrendsStatus(batch));
}

/** Saved batches that may feed Trends (accepted + review). */
export function filterImportBatchesForTrends(batches: ImportSessionBatch[]): ImportSessionBatch[] {
  return batches.filter(isImportBatchTrendsEligible);
}
