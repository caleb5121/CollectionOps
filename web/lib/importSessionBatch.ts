import type { ImportChunk } from "./importMerge";
import { mergeImportChunks } from "./importMerge";
import {
  isContributingChunk,
  computeWorkspaceGate,
  type ImportLabelMismatch,
  type WorkspaceGateResult,
} from "./importHardening";
import { resolveOrderListColumnMap, orderRowCheckoutTotal } from "./orderListColumnMap";
import { resolveSalesSummaryColumnMap } from "./salesSummaryColumnMap";
import { computeCrossFileFinancialConsistency, type CrossFileFinancialConsistency } from "./crossFileFinancialCheck";
import type { ImportTimeAlignment } from "./crossFileTimeAlignment";
import { getWorkspaceStoreLabel } from "./sessionLabel";
import { aggregateOrderDateRangeFromChunks, formatImportRangeLabel } from "./importMetadata";
import { importPerfEnabled, logImportPerf } from "./importPerfLog";

export type ImportBatchStatus = "ready" | "review" | "blocked";

/** Serializable evaluation for a saved batch — avoids re-merging tens of thousands of rows each render. */
export type ImportBatchEvaluationSnapshot = {
  v: 1;
  label: string;
  status: ImportBatchStatus;
  workspaceReady: boolean;
  importHasRejected: boolean;
  orderListCalculationReady: boolean;
  summaryCalculationReady: boolean;
  orders: number;
  grossSales: number;
  shipping: number;
  fees: number | null;
  netAfterFees: number | null;
  coverageLabel: string;
  /** First / last order date in contributing order files (ISO), when inferable. */
  orderRangeFromIso?: string | null;
  orderRangeToIso?: string | null;
  workspaceGateReasons: string[];
  importLabelMismatch: ImportLabelMismatch | null;
  importTimeAlignment: ImportTimeAlignment | null;
  importFinancialConsistency: CrossFileFinancialConsistency | null;
};

export type ImportSessionBatch = {
  id: string;
  label: string;
  savedAtIso: string;
  orderImports: ImportChunk[];
  summaryImports: ImportChunk[];
  /** Filled when the batch is saved; drives session list + combined totals without full recompute. */
  summaryCache?: ImportBatchEvaluationSnapshot | null;
};

function toNumberLoose(v: unknown) {
  if (v === null || v === undefined) return 0;
  const s = String(v).trim();
  if (!s) return 0;
  const cleaned = s.replace(/[^0-9.-]/g, "");
  const n = Number(cleaned);
  return Number.isNaN(n) ? 0 : n;
}

/** Lightweight metrics + gate for a batch (draft or saved). */
export function evaluateImportBatch(
  orderImports: ImportChunk[],
  summaryImports: ImportChunk[],
): {
  label: string;
  status: ImportBatchStatus;
  workspaceGate: WorkspaceGateResult;
  workspaceReady: boolean;
  importHasRejected: boolean;
  orderListCalculationReady: boolean;
  summaryCalculationReady: boolean;
  orderContributing: ImportChunk[];
  summaryContributing: ImportChunk[];
  orders: number;
  grossSales: number;
  shipping: number;
  fees: number | null;
  netAfterFees: number | null;
  coverageLabel: string;
  importTimeAlignment: ImportTimeAlignment | null;
  importFinancialConsistency: CrossFileFinancialConsistency | null;
} {
  const t0 = typeof performance !== "undefined" ? performance.now() : 0;
  const orderContributing = orderImports.filter(isContributingChunk);
  const summaryContributing = summaryImports.filter(isContributingChunk);
  const importHasRejected = [...orderImports, ...summaryImports].some((c) => c.validationStatus === "rejected");

  const orderData = mergeImportChunks(orderImports);
  const summaryData = mergeImportChunks(summaryImports);

  const orderColumnMap = orderData?.headers.length ? resolveOrderListColumnMap(orderData.headers) : null;
  const summaryColumnMap = summaryData?.headers.length ? resolveSalesSummaryColumnMap(summaryData.headers) : null;

  const orderListCalculationReady = Boolean(orderColumnMap?.ok && orderData && orderData.rows.length > 0);
  const summaryCalculationReady = Boolean(summaryColumnMap?.ok && summaryData && summaryData.rows.length > 0);

  const orderMetrics =
    orderData && orderColumnMap?.ok
      ? (() => {
          const m = orderColumnMap;
          let productSales = 0,
            shipping = 0,
            total = 0;
          for (const r of orderData.rows) {
            const rowTotal = orderRowCheckoutTotal(r, m);
            total += rowTotal;
            const sh = m.shippingKey ? toNumberLoose(r[m.shippingKey]) : 0;
            shipping += sh;
            if (m.productKey) productSales += toNumberLoose(r[m.productKey]);
            else productSales += Math.max(0, rowTotal - sh);
          }
          return { orders: orderData.rows.length, productSales, shipping, total };
        })()
      : null;

  const orderFinancialRollup =
    orderData && orderColumnMap?.ok
      ? (() => {
          const m = orderColumnMap;
          let gross = 0,
            fees = 0,
            payout = 0,
            shipping = 0;
          for (const r of orderData.rows) {
            gross += orderRowCheckoutTotal(r, m);
            if (m.feesKey) fees += toNumberLoose(r[m.feesKey]);
            if (m.payoutKey) payout += toNumberLoose(r[m.payoutKey]);
            if (m.shippingKey) shipping += toNumberLoose(r[m.shippingKey]);
          }
          return { gross, fees, payout, shipping, orders: orderData.rows.length };
        })()
      : null;

  const summaryMetrics =
    summaryData && summaryColumnMap?.ok
      ? (() => {
          const m = summaryColumnMap;
          const sumKey = (key: string | null) =>
            key ? summaryData.rows.map((r) => toNumberLoose(r[key])).reduce((a, b) => a + b, 0) : 0;
          return {
            orders: sumKey(m.orderCountKey),
            grossSales: sumKey(m.grossSalesKey),
            shipping: m.shippingKey ? sumKey(m.shippingKey) : 0,
            fees: sumKey(m.feesKey),
            netAfterFees: sumKey(m.netKey),
            refunds: m.refundsKey ? sumKey(m.refundsKey) : 0,
          };
        })()
      : null;

  const workspaceGate = computeWorkspaceGate({
    orderContributing,
    summaryContributing,
    orderSlotFileCount: orderImports.length,
    summarySlotFileCount: summaryImports.length,
    orderListCalculationReady,
    summaryCalculationReady,
    orderMetricsOrders: orderMetrics?.orders ?? 0,
    summaryMetricsOrders: summaryMetrics?.orders ?? 0,
  });

  const workspaceReady = workspaceGate.ready && !importHasRejected;

  let importFinancialConsistency: CrossFileFinancialConsistency | null = null;
  if (
    orderListCalculationReady &&
    summaryCalculationReady &&
    orderFinancialRollup &&
    orderColumnMap?.ok &&
    summaryMetrics
  ) {
    const orderNet =
      orderColumnMap.payoutKey != null
        ? orderFinancialRollup.payout
        : orderColumnMap.feesKey != null
          ? orderFinancialRollup.gross - orderFinancialRollup.fees
          : null;
    importFinancialConsistency = computeCrossFileFinancialConsistency({
      orderGross: orderFinancialRollup.gross,
      summaryGross: summaryMetrics.grossSales,
      orderNet,
      summaryNet: summaryMetrics.netAfterFees,
      orderShipping: orderFinancialRollup.shipping,
      summaryShipping: summaryMetrics.shipping,
      compareShipping: Boolean(summaryColumnMap?.shippingKey),
    });
  }

  const ordersFromSummary =
    summaryCalculationReady && summaryMetrics && summaryMetrics.orders > 0 ? summaryMetrics.orders : 0;
  const ordersFromOrders =
    orderListCalculationReady && orderMetrics
      ? orderMetrics.orders
      : orderFinancialRollup
        ? orderFinancialRollup.orders
        : 0;
  const orders = ordersFromSummary > 0 ? ordersFromSummary : ordersFromOrders;

  const grossFromSummary = summaryCalculationReady && summaryMetrics ? summaryMetrics.grossSales : 0;
  const grossFromOrders = orderListCalculationReady && orderMetrics ? orderMetrics.total : 0;
  const grossFromRollup = orderFinancialRollup?.gross ?? 0;
  const grossSales =
    grossFromSummary > 0 ? grossFromSummary : grossFromOrders > 0 ? grossFromOrders : grossFromRollup;

  const shipSummary = summaryCalculationReady && summaryMetrics ? summaryMetrics.shipping : 0;
  const shipOrders = orderListCalculationReady && orderMetrics ? orderMetrics.shipping : 0;
  const shipRollup = orderFinancialRollup?.shipping ?? 0;
  const shipping = shipSummary > 0 ? shipSummary : shipOrders > 0 ? shipOrders : shipRollup;

  let fees: number | null = summaryCalculationReady && summaryMetrics ? summaryMetrics.fees : null;
  if ((fees == null || fees === 0) && orderFinancialRollup && orderFinancialRollup.fees > 0) {
    fees = orderFinancialRollup.fees;
  }

  let netAfterFees: number | null =
    summaryCalculationReady && summaryMetrics && summaryMetrics.netAfterFees > 0 ? summaryMetrics.netAfterFees : null;
  if (
    (netAfterFees == null || netAfterFees === 0) &&
    orderFinancialRollup &&
    orderFinancialRollup.payout > 0
  ) {
    netAfterFees = orderFinancialRollup.payout;
  }
  if (netAfterFees == null && fees != null && grossSales > 0) {
    netAfterFees = grossSales - fees;
  }

  const coverageRange = aggregateOrderDateRangeFromChunks(orderContributing);
  const coverageLabel = coverageRange
    ? formatImportRangeLabel(coverageRange.from, coverageRange.to)
    : "—";

  let status: ImportBatchStatus = "blocked";
  if (workspaceReady) {
    const ta = workspaceGate.timeAlignment;
    const fin = importFinancialConsistency?.level ?? "ok";
    if (
      ta?.status === "unknown" ||
      fin === "warn" ||
      fin === "severe"
    ) {
      status = "review";
    } else {
      status = "ready";
    }
  } else {
    status = "blocked";
  }

  const label = getWorkspaceStoreLabel([...orderImports, ...summaryImports]);

  const result = {
    label,
    status,
    workspaceGate,
    workspaceReady,
    importHasRejected,
    orderListCalculationReady,
    summaryCalculationReady,
    orderContributing,
    summaryContributing,
    orders,
    grossSales,
    shipping,
    fees,
    netAfterFees,
    coverageLabel,
    importTimeAlignment: workspaceGate.timeAlignment,
    importFinancialConsistency,
  };

  if (importPerfEnabled() && typeof performance !== "undefined") {
    logImportPerf("evaluate_import_batch", performance.now() - t0, {
      orderRows: orderData?.rows.length ?? 0,
      summaryRows: summaryData?.rows.length ?? 0,
    });
  }

  return result;
}

export type ImportBatchEvaluation = ReturnType<typeof evaluateImportBatch>;

export function snapshotFromImportBatchEvaluation(ev: ImportBatchEvaluation): ImportBatchEvaluationSnapshot {
  const range = aggregateOrderDateRangeFromChunks(ev.orderContributing);
  return {
    v: 1,
    label: ev.label,
    status: ev.status,
    workspaceReady: ev.workspaceReady,
    importHasRejected: ev.importHasRejected,
    orderListCalculationReady: ev.orderListCalculationReady,
    summaryCalculationReady: ev.summaryCalculationReady,
    orders: ev.orders,
    grossSales: ev.grossSales,
    shipping: ev.shipping,
    fees: ev.fees,
    netAfterFees: ev.netAfterFees,
    coverageLabel: ev.coverageLabel,
    orderRangeFromIso: range ? range.from.toISOString() : null,
    orderRangeToIso: range ? range.to.toISOString() : null,
    workspaceGateReasons: [...ev.workspaceGate.reasons],
    importLabelMismatch: ev.workspaceGate.labelMismatch,
    importTimeAlignment: ev.importTimeAlignment,
    importFinancialConsistency: ev.importFinancialConsistency,
  };
}

export function evaluationFromSnapshot(
  snap: ImportBatchEvaluationSnapshot,
  orderContributing: ImportChunk[],
  summaryContributing: ImportChunk[],
): ImportBatchEvaluation {
  const workspaceGate: WorkspaceGateResult = {
    ready: snap.workspaceReady,
    reasons: [...snap.workspaceGateReasons],
    labelMismatch: snap.importLabelMismatch,
    timeAlignment: snap.importTimeAlignment,
  };
  return {
    label: snap.label,
    status: snap.status,
    workspaceGate,
    workspaceReady: snap.workspaceReady,
    importHasRejected: snap.importHasRejected,
    orderListCalculationReady: snap.orderListCalculationReady,
    summaryCalculationReady: snap.summaryCalculationReady,
    orderContributing,
    summaryContributing,
    orders: snap.orders,
    grossSales: snap.grossSales,
    shipping: snap.shipping,
    fees: snap.fees,
    netAfterFees: snap.netAfterFees,
    coverageLabel: snap.coverageLabel,
    importTimeAlignment: snap.importTimeAlignment,
    importFinancialConsistency: snap.importFinancialConsistency,
  };
}

/** Prefer cached snapshot; avoids merging all order rows when the evaluation is already stored. */
export function getOrEvaluateSavedBatchSummary(batch: ImportSessionBatch): ImportBatchEvaluation {
  const orderContributing = batch.orderImports.filter(isContributingChunk);
  const summaryContributing = batch.summaryImports.filter(isContributingChunk);
  if (batch.summaryCache?.v === 1) {
    return evaluationFromSnapshot(batch.summaryCache, orderContributing, summaryContributing);
  }
  return evaluateImportBatch(batch.orderImports, batch.summaryImports);
}

export function cloneImportChunkDeep(c: ImportChunk): ImportChunk {
  return JSON.parse(JSON.stringify(c)) as ImportChunk;
}
