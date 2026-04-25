"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { TrendPoint } from "../lib/trendPoint";
import type { CsvData } from "../lib/csvData";
import type { ImportPreviewPayload } from "../lib/csvPreview";
import { IMPORT_MAX_ISSUES_DISPLAYED } from "../lib/importPerformanceConstants";
import {
  MAX_IMPORT_FILES_PER_TYPE,
  mergeImportChunks,
  newImportId,
  type ImportChunk,
} from "../lib/importMerge";
import { getWorkspaceStoreLabel } from "../lib/sessionLabel";
import { validateOrderListCsv, validateSalesSummaryCsv } from "../lib/csvValidation";
import type { CrossFileFinancialConsistency } from "../lib/crossFileFinancialCheck";
import type { ImportTimeAlignment } from "../lib/crossFileTimeAlignment";
import { type ImportLabelMismatch } from "../lib/importHardening";
import {
  evaluateImportBatch,
  cloneImportChunkDeep,
  getOrEvaluateSavedBatchSummary,
  snapshotFromImportBatchEvaluation,
  type ImportSessionBatch,
  type ImportBatchStatus,
} from "../lib/importSessionBatch";
import {
  appendOrderImportsFromFiles,
  appendSummaryImportsFromFiles,
  type ImportProgressPayload,
} from "../lib/importUploadPipeline";
import {
  orderRowCheckoutTotal,
  resolveOrderListColumnMap,
  toNumberLooseCell,
  type OrderListColumnMap,
} from "../lib/orderListColumnMap";
import { resolveSalesSummaryColumnMap, type SalesSummaryColumnMap } from "../lib/salesSummaryColumnMap";
import {
  filterImportBatchesForTrends,
  importBatchTrendsStatus,
  isImportBatchTrendsEligibleStatus,
} from "../lib/importTrendsEligibility";
import {
  buildDailyTrendPointsFromTrendsSegments,
  buildTrendPointsFromTrendsSegments,
  type TrendsImportSegment,
} from "../lib/trendsSeriesFromImports";
import {
  distinctGameLabelsFromChunks,
  filterImportChunksByGame,
  filterTrendsSegmentByGame,
} from "../lib/importWorkspaceScope";

export type { CsvData } from "../lib/csvData";
export type { ImportChunk } from "../lib/importMerge";
export type { ImportLabelMismatch } from "../lib/importHardening";
export type { CrossFileFinancialConsistency } from "../lib/crossFileFinancialCheck";
export type { ImportTimeAlignment } from "../lib/crossFileTimeAlignment";

export type LastImportBatchInfo = {
  at: Date;
  gameLabel: string;
  duplicatesSkipped: number;
  filesAccepted: number;
  filesRejected: number;
};

/** Shown when user picks a CSV whose filename is already in that slot; file is not added. */
export type ImportDuplicateFilenameNotice = {
  slot: "order" | "summary";
  skippedCount: number;
  noticeId: number;
};

/** Persisted import payload. All pages read via `useData()`; storage uses this key only. */
export const CARDOPS_IMPORT_STORAGE_KEY = "cardops-import-data-v1";
const DEMO_SANDBOX_SESSION_KEY = "cardops-demo-sandbox";

type PersistedImportStateV1 = {
  version: 1;
  orderData: CsvData | null;
  summaryData: CsvData | null;
  orderFileName: string;
  summaryFileName: string;
  lastPreview: ImportPreviewPayload | null;
  lastImportDateIso: string | null;
};

type PersistedImportStateV2 = {
  version: 2;
  orderImports: ImportChunk[];
  summaryImports: ImportChunk[];
  lastPreview: ImportPreviewPayload | null;
  lastImportDateIso: string | null;
};

type PersistedImportStateV3 = {
  version: 3;
  savedBatches: ImportSessionBatch[];
  draftOrderImports: ImportChunk[];
  draftSummaryImports: ImportChunk[];
  lastPreview: ImportPreviewPayload | null;
  lastImportDateIso: string | null;
};

const DASHBOARD_IMPORT_SCOPE_KEY = "cardops-dashboard-import-scope";
const WORKSPACE_GAME_FILTER_KEY = "cardops-workspace-game-filter";

function migrateV1ToChunks(v1: PersistedImportStateV1): { orderImports: ImportChunk[]; summaryImports: ImportChunk[] } {
  const orderImports: ImportChunk[] = [];
  const summaryImports: ImportChunk[] = [];
  if (v1.orderData) {
    orderImports.push({
      id: newImportId(),
      fileName: v1.orderFileName || "order-list.csv",
      data: v1.orderData,
    });
  }
  if (v1.summaryData) {
    summaryImports.push({
      id: newImportId(),
      fileName: v1.summaryFileName || "sales-summary.csv",
      data: v1.summaryData,
    });
  }
  return { orderImports, summaryImports };
}

function loadImportStateFromStorage(): PersistedImportStateV3 | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(CARDOPS_IMPORT_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return null;
    const v = (parsed as { version?: number }).version;
    if (v === 3) {
      return parsed as PersistedImportStateV3;
    }
    if (v === 2) {
      const v2 = parsed as PersistedImportStateV2;
      return {
        version: 3,
        savedBatches: [],
        draftOrderImports: v2.orderImports ?? [],
        draftSummaryImports: v2.summaryImports ?? [],
        lastPreview: v2.lastPreview,
        lastImportDateIso: v2.lastImportDateIso,
      };
    }
    if (v === 1) {
      const v1 = parsed as PersistedImportStateV1;
      const { orderImports, summaryImports } = migrateV1ToChunks(v1);
      return {
        version: 3,
        savedBatches: [],
        draftOrderImports: orderImports,
        draftSummaryImports: summaryImports,
        lastPreview: v1.lastPreview,
        lastImportDateIso: v1.lastImportDateIso,
      };
    }
  } catch {
    // ignore
  }
  return null;
}

function saveImportStateToStorage(state: PersistedImportStateV3): void {
  if (typeof window === "undefined") return;
  try {
    if (sessionStorage.getItem(DEMO_SANDBOX_SESSION_KEY) === "1") return;
  } catch {
    // ignore; continue to best-effort save
  }
  try {
    localStorage.setItem(CARDOPS_IMPORT_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // QuotaExceededError or private mode - fail silently; in-memory state still works
  }
}

function clearImportStateStorage(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(CARDOPS_IMPORT_STORAGE_KEY);
  } catch {
    // ignore
  }
}

function toNumberLoose(v: unknown) {
  if (v === null || v === undefined) return 0;
  const s = String(v).trim();
  if (!s) return 0;
  const cleaned = s.replace(/[^0-9.-]/g, "");
  const n = Number(cleaned);
  return Number.isNaN(n) ? 0 : n;
}

function orderDateToLocalMidnightMs(orderDateRaw: string): number | null {
  const s = (orderDateRaw ?? "").trim();
  if (!s) return null;
  const parts = s.split(",").map((x) => x.trim());
  const datePart = parts.length > 1 ? parts[1] : parts[0];
  let d = new Date(datePart);
  if (Number.isNaN(d.getTime())) {
    d = new Date(datePart.slice(0, 10));
    if (Number.isNaN(d.getTime())) return null;
  }
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

/**
 * Build daily trend buckets from merged order CSV (shared by workspace + Trends-only paths).
 * `blocked` batches are filtered before merge for Trends; `ready` + `review` are included — see importTrendsEligibility.
 */
function buildTrendDataFromWorkspaceOrder(
  orderData: CsvData | null,
  orderColumnMap: OrderListColumnMap | null,
): TrendPoint[] {
  if (!orderData || !orderColumnMap?.ok) return [];
  const orderDateKey = orderColumnMap.orderDateKey;
  if (!orderDateKey) return [];
  const m = orderColumnMap;
  const shippingKey = m.shippingKey;
  const map = new Map<number, TrendPoint>();
  for (const r of orderData.rows) {
    const raw = r[orderDateKey];
    const dateMs = orderDateToLocalMidnightMs(typeof raw === "string" ? raw : String(raw ?? ""));
    if (dateMs == null) continue;
    const d = new Date(dateMs);
    const month = d.toLocaleString(undefined, { month: "short" });
    const dom = String(d.getDate()).padStart(2, "0");
    const day = `${month} ${dom}`;
    const revenue = orderRowCheckoutTotal(r, m);
    const shipping = shippingKey ? toNumberLoose(r[shippingKey]) : 0;
    const prev = map.get(dateMs);
    if (!prev) map.set(dateMs, { day, revenue, shipping, orders: 1, dateMs });
    else {
      prev.revenue += revenue;
      prev.shipping += shipping;
      prev.orders += 1;
    }
  }
  const arr = Array.from(map.values());
  arr.sort((a, b) => a.dateMs - b.dateMs);
  return arr;
}

function normalizeDayLabel(orderDateRaw: string) {
  const s = (orderDateRaw ?? "").trim();
  if (!s) return "Unknown";
  const parts = s.split(",").map((x) => x.trim());
  const datePart = parts.length > 1 ? parts[1] : parts[0];
  const d = new Date(datePart);
  if (Number.isNaN(d.getTime())) return datePart.slice(0, 10);
  const month = d.toLocaleString(undefined, { month: "short" });
  const day = String(d.getDate()).padStart(2, "0");
  return `${month} ${day}`;
}

export type DataContextValue = {
  /** Single source of truth: true when Sales Summary CSV is present (hydrated from storage or new upload). Drives Dashboard + Imports “synced” UI. */
  hasDashboardImport: boolean;
  /** True when Order List and/or Sales Summary CSV rows exist in the shared store. */
  hasAnyImport: boolean;
  /** True when Order List CSV is present (Trends charts / order metrics). */
  hasOrderImport: boolean;
  orderData: CsvData | null;
  summaryData: CsvData | null;
  orderFileName: string;
  summaryFileName: string;
  lastPreview: ImportPreviewPayload | null;
  lastImportDate: Date | null;
  error: string;
  setError: (s: string) => void;
  /** Multiple order-list and sales-summary files (lifetime-style history). */
  orderImports: ImportChunk[];
  summaryImports: ImportChunk[];
  /** Chunks merged for Dashboard/Trends/Account for the current import scope (`dashboardImportScope`). */
  effectiveOrderImports: ImportChunk[];
  effectiveSummaryImports: ImportChunk[];
  handleFile: (file: File, target: "order" | "summary", options?: { game?: string }) => Promise<void>;
  handleFiles: (
    files: FileList | File[],
    target: "order" | "summary",
    options?: { game?: string }
  ) => Promise<void>;
  /** Last completed batch from Import (this browser session). */
  lastImportBatch: LastImportBatchInfo | null;
  removeImportFile: (id: string, target: "order" | "summary") => void;
  resetAll: () => void;
  derived: {
    orders: number;
    grossSales: number;
    shipping: number;
    fees: number | null;
    netAfterFees: number | null;
    refunds: number | null;
    aov: number | null;
  };
  orderMetrics: { orders: number; productSales: number; shipping: number; total: number } | null;
  summaryMetrics: { orders: number; grossSales: number; shipping: number; fees: number; netAfterFees: number; refunds: number } | null;
  trendData: TrendPoint[];
  feeRate: number | null;
  orderValueBuckets: { under5: number; fiveTo10: number; tenTo20: number; over20: number } | null;
  mpo: number | null;
  ordersBelowMPO: number | null;
  shippingEstimatedCost: number;
  /** Fees + shipping only when shipping is included in net (matches Account preference). */
  costsForNetDisplay: number | null;
  /** Gross − fees − optional shipping per Account preferences. */
  estimatedNet: number | null;
  shippingMargin: number | null;
  averageDailyRevenue: number | null;
  momentumScore: number;
  momentumLabel: string;
  feeEfficiencyScore: number;
  feeEfficiencyLabel: string;
  orderStrengthScore: number;
  orderStrengthLabel: string;
  reconciliation: { synced: boolean; orderDiff: number; salesDiff: number } | null;
  previewHeaders: string[];
  previewRows: Record<string, string>[];
  /** Label from Import tags only - never inferred from card data. */
  workspaceStoreLabel: string;
  /** Missing columns or empty exports - surfaced instead of silent failure. */
  importValidationIssues: string[];
  /** True when merged order list headers map to CardOps calculations (date + totals). */
  orderListCalculationReady: boolean;
  /** True when merged sales summary headers map to dashboard totals. */
  summaryCalculationReady: boolean;
  /** Resolved column map for merged order data (null if no order CSV). */
  orderColumnMap: OrderListColumnMap | null;
  /** Resolved column map for merged summary data (null if no summary CSV). */
  summaryColumnMap: SalesSummaryColumnMap | null;
  /** Workspace merges only non-rejected files; gate requires pair validation. */
  workspaceReady: boolean;
  workspaceBlockedReasons: string[];
  /** Order List vs Sales Summary game labels disagree (single distinct label per side). */
  importLabelMismatch: ImportLabelMismatch | null;
  /** Order List vs Sales Summary money rollups (never blocks workspace). */
  importFinancialConsistency: CrossFileFinancialConsistency | null;
  /** Temporary UI: duplicate filename skipped for this slot (not added to list). */
  importDuplicateFilenameNotice: ImportDuplicateFilenameNotice | null;
  /** Order List vs Sales Summary calendar alignment (month overlap). */
  importTimeAlignment: ImportTimeAlignment | null;
  importHasRejectedFiles: boolean;
  /** Active import row only — validation, mapping, and the Imports workspace card use this, not merged session data. */
  draftImportEvaluation: ReturnType<typeof evaluateImportBatch>;
  /** Saved labeled batches this session (persisted with imports). */
  savedImportBatches: ImportSessionBatch[];
  /** Per-batch status and headline numbers for Imports session list. */
  savedBatchSummaries: { batch: ImportSessionBatch; status: ImportBatchStatus; summary: ReturnType<typeof evaluateImportBatch> }[];
  /** Sum of Ready + Review saved batches (draft excluded). */
  sessionCombinedTotals: {
    grossSales: number;
    netAfterFees: number;
    fees: number;
    shipping: number;
    orders: number;
  } | null;
  /** Returns the new batch id, or null if nothing was committed. */
  commitDraftToSession: () => string | null;
  /** Clears the last file preview strip (e.g. when starting another batch in the composer). */
  clearLastImportPreview: () => void;
  removeSessionBatch: (batchId: string) => void;
  /** Move batch files into the draft editor and remove it from the session list. */
  replaceSessionBatchWithDraft: (batchId: string) => void;
  /** Dashboard/Trends: "all" merged usable batches, or one batch id. */
  dashboardImportScope: "all" | string;
  setDashboardImportScope: (scope: "all" | string) => void;
  /** Filter analytics to one game label, or all games in scope. */
  workspaceGameFilter: "all" | string;
  setWorkspaceGameFilter: (game: "all" | string) => void;
  /** Distinct game labels on files included in the current scope (before game filter). */
  workspaceGameFilterOptions: string[];
  /** Valid draft files are merged into "all batches" scope until you save or clear. */
  workspaceIncludesUnsavedDraft: boolean;
  /** Large-import progress (null when idle). */
  importProgress: ImportProgressPayload | null;
  /**
   * Trends: merged eligible saved batches + valid draft when scope is "all"; respects import scope + game filter.
   * (`ready` + `review`; `blocked` excluded.)
   */
  trendsOrderData: CsvData | null;
  trendsOrderColumnMap: OrderListColumnMap | null;
  trendsTrendData: TrendPoint[];
  /** Daily buckets for the current Trends segment (before weekly rollup). For chart granularity. */
  trendsDailyTrendData: TrendPoint[];
  trendsOrderListReady: boolean;
  trendsOrderValueBuckets: { under5: number; fiveTo10: number; tenTo20: number; over20: number } | null;
  trendsOrderMetrics: { orders: number; productSales: number; shipping: number; total: number } | null;
  /** Saved batches that can feed Trends (`ready`/`review`); used for empty-state copy when no draft fallback. */
  trendsValidBatchCount: number;
  /** Eligible saved batches, oldest → newest (`ready` + `review`) — source for batch-vs-batch comparison. */
  trendsReadyBatchesAsc: ImportSessionBatch[];
  /** True when the batch currently shown on Trends is in `review`. */
  trendsHasReviewBatch: boolean;
};

const DataContext = createContext<DataContextValue | null>(null);

export function DataProvider({
  children,
  estimatedShippingCostPerOrder,
  includeShippingInProfit,
}: {
  children: React.ReactNode;
  estimatedShippingCostPerOrder: number;
  /** From Account; when false, net excludes assumed shipping cost. */
  includeShippingInProfit: boolean;
}) {
  const [orderImports, setOrderImports] = useState<ImportChunk[]>([]);
  const [summaryImports, setSummaryImports] = useState<ImportChunk[]>([]);
  const [savedBatches, setSavedBatches] = useState<ImportSessionBatch[]>([]);
  const [dashboardImportScope, setDashboardImportScopeState] = useState<"all" | string>("all");
  const [workspaceGameFilter, setWorkspaceGameFilterState] = useState<"all" | string>("all");
  const [lastPreview, setLastPreview] = useState<ImportPreviewPayload | null>(null);
  const [importProgress, setImportProgress] = useState<ImportProgressPayload | null>(null);
  const orderImportsRef = useRef<ImportChunk[]>([]);
  const summaryImportsRef = useRef<ImportChunk[]>([]);
  const [lastImportDate, setLastImportDate] = useState<Date | null>(null);
  const [error, setError] = useState("");
  const [importHydrated, setImportHydrated] = useState(false);
  const [lastImportBatch, setLastImportBatch] = useState<LastImportBatchInfo | null>(null);
  const [importDuplicateFilenameNotice, setImportDuplicateFilenameNotice] =
    useState<ImportDuplicateFilenameNotice | null>(null);
  const duplicateFilenameNoticeIdRef = useRef(0);
  const duplicateFilenameNoticeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const skipNextPersistRef = useRef(false);

  const queueDuplicateFilenameNotice = useCallback((slot: "order" | "summary", skippedCount: number) => {
    duplicateFilenameNoticeIdRef.current += 1;
    const noticeId = duplicateFilenameNoticeIdRef.current;
    if (duplicateFilenameNoticeTimeoutRef.current) {
      clearTimeout(duplicateFilenameNoticeTimeoutRef.current);
      duplicateFilenameNoticeTimeoutRef.current = null;
    }
    setImportDuplicateFilenameNotice({ slot, skippedCount, noticeId });
    duplicateFilenameNoticeTimeoutRef.current = setTimeout(() => {
      setImportDuplicateFilenameNotice(null);
      duplicateFilenameNoticeTimeoutRef.current = null;
    }, 6000);
  }, []);

  useEffect(() => {
    return () => {
      if (duplicateFilenameNoticeTimeoutRef.current) {
        clearTimeout(duplicateFilenameNoticeTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    orderImportsRef.current = orderImports;
  }, [orderImports]);

  useEffect(() => {
    summaryImportsRef.current = summaryImports;
  }, [summaryImports]);

  // Hydrate from localStorage once (same pattern as SettingsProvider)
  useEffect(() => {
    const loaded = loadImportStateFromStorage();
    if (loaded) {
      skipNextPersistRef.current = true;
      setSavedBatches(loaded.savedBatches ?? []);
      const draftO = loaded.draftOrderImports ?? [];
      const draftS = loaded.draftSummaryImports ?? [];
      setOrderImports(draftO);
      setSummaryImports(draftS);
      orderImportsRef.current = draftO;
      summaryImportsRef.current = draftS;
      setLastPreview(loaded.lastPreview);
      setLastImportDate(loaded.lastImportDateIso ? new Date(loaded.lastImportDateIso) : null);
    }
    try {
      const sc = localStorage.getItem(DASHBOARD_IMPORT_SCOPE_KEY);
      if (sc === "all" || (sc && sc.length > 0)) {
        setDashboardImportScopeState(sc as "all" | string);
      }
      const gf = localStorage.getItem(WORKSPACE_GAME_FILTER_KEY);
      if (gf === "all" || (gf && gf.length > 0)) {
        setWorkspaceGameFilterState(gf as "all" | string);
      }
    } catch {
      /* ignore */
    }
    setImportHydrated(true);
  }, []);

  const setDashboardImportScope = useCallback((scope: "all" | string) => {
    setDashboardImportScopeState(scope);
    try {
      localStorage.setItem(DASHBOARD_IMPORT_SCOPE_KEY, scope);
    } catch {
      /* ignore */
    }
  }, []);

  const setWorkspaceGameFilter = useCallback((game: "all" | string) => {
    setWorkspaceGameFilterState(game);
    try {
      localStorage.setItem(WORKSPACE_GAME_FILTER_KEY, game);
    } catch {
      /* ignore */
    }
  }, []);

  // Persist whenever import-related state changes (after initial hydration)
  useEffect(() => {
    if (!importHydrated) return;
    if (skipNextPersistRef.current) {
      skipNextPersistRef.current = false;
      return;
    }
    const payload: PersistedImportStateV3 = {
      version: 3,
      savedBatches,
      draftOrderImports: orderImports,
      draftSummaryImports: summaryImports,
      lastPreview,
      lastImportDateIso: lastImportDate ? lastImportDate.toISOString() : null,
    };
    const hasAnyData =
      orderImports.length > 0 || summaryImports.length > 0 || savedBatches.length > 0;
    if (hasAnyData) {
      saveImportStateToStorage(payload);
    } else {
      clearImportStateStorage();
    }
  }, [importHydrated, orderImports, summaryImports, savedBatches, lastPreview, lastImportDate]);

  const draftEval = useMemo(() => evaluateImportBatch(orderImports, summaryImports), [orderImports, summaryImports]);
  const importHasRejectedFiles = draftEval.importHasRejected;

  const savedBatchSummaries = useMemo(
    () =>
      savedBatches.map((batch) => {
        const summary = getOrEvaluateSavedBatchSummary(batch);
        return { batch, status: summary.status, summary };
      }),
    [savedBatches],
  );

  const savedBatchBlocked = useCallback((b: ImportSessionBatch) => {
    if (b.summaryCache?.v === 1) return b.summaryCache.status === "blocked";
    return evaluateImportBatch(b.orderImports, b.summaryImports).status === "blocked";
  }, []);

  const effectiveOrderImportsBase = useMemo(() => {
    if (dashboardImportScope !== "all") {
      const b = savedBatches.find((x) => x.id === dashboardImportScope);
      if (b) return b.orderImports;
      return orderImports;
    }
    const parts: ImportChunk[] = [];
    for (const b of savedBatches) {
      if (!savedBatchBlocked(b)) {
        parts.push(...b.orderImports);
      }
    }
    const draftEligible = isImportBatchTrendsEligibleStatus(draftEval.status);
    if (draftEligible && orderImports.length > 0) {
      parts.push(...orderImports);
    } else if (savedBatches.length === 0 && orderImports.length > 0) {
      parts.push(...orderImports);
    }
    return parts;
  }, [savedBatches, orderImports, dashboardImportScope, savedBatchBlocked, draftEval.status]);

  const effectiveSummaryImportsBase = useMemo(() => {
    if (dashboardImportScope !== "all") {
      const b = savedBatches.find((x) => x.id === dashboardImportScope);
      if (b) return b.summaryImports;
      return summaryImports;
    }
    const parts: ImportChunk[] = [];
    for (const b of savedBatches) {
      if (!savedBatchBlocked(b)) {
        parts.push(...b.summaryImports);
      }
    }
    const draftEligible = isImportBatchTrendsEligibleStatus(draftEval.status);
    if (draftEligible && summaryImports.length > 0) {
      parts.push(...summaryImports);
    } else if (savedBatches.length === 0 && summaryImports.length > 0) {
      parts.push(...summaryImports);
    }
    return parts;
  }, [savedBatches, summaryImports, dashboardImportScope, savedBatchBlocked, draftEval.status]);

  const workspaceGameFilterOptions = useMemo(
    () =>
      distinctGameLabelsFromChunks([...effectiveOrderImportsBase, ...effectiveSummaryImportsBase]),
    [effectiveOrderImportsBase, effectiveSummaryImportsBase],
  );

  useEffect(() => {
    if (workspaceGameFilter === "all") return;
    if (!workspaceGameFilterOptions.includes(workspaceGameFilter)) {
      setWorkspaceGameFilterState("all");
      try {
        localStorage.setItem(WORKSPACE_GAME_FILTER_KEY, "all");
      } catch {
        /* ignore */
      }
    }
  }, [workspaceGameFilter, workspaceGameFilterOptions]);

  const effectiveOrderImports = useMemo(
    () => filterImportChunksByGame(effectiveOrderImportsBase, workspaceGameFilter),
    [effectiveOrderImportsBase, workspaceGameFilter],
  );

  const effectiveSummaryImports = useMemo(
    () => filterImportChunksByGame(effectiveSummaryImportsBase, workspaceGameFilter),
    [effectiveSummaryImportsBase, workspaceGameFilter],
  );

  const workspaceIncludesUnsavedDraft = useMemo(() => {
    if (dashboardImportScope !== "all") return false;
    return (
      isImportBatchTrendsEligibleStatus(draftEval.status) &&
      (orderImports.length > 0 || summaryImports.length > 0)
    );
  }, [dashboardImportScope, draftEval.status, orderImports.length, summaryImports.length]);

  const trendsReadyBatchesAsc = useMemo(
    () =>
      filterImportBatchesForTrends(savedBatches).sort((a, b) => a.savedAtIso.localeCompare(b.savedAtIso)),
    [savedBatches],
  );

  /** Eligible saved batches + valid draft (when scope is "all"), each as a segment; respects import scope. */
  const trendsWorkspaceSegmentsBase = useMemo((): TrendsImportSegment[] => {
    if (dashboardImportScope !== "all") {
      const b = savedBatches.find((x) => x.id === dashboardImportScope);
      if (b && isImportBatchTrendsEligibleStatus(importBatchTrendsStatus(b))) {
        return [{ orderImports: b.orderImports, summaryImports: b.summaryImports }];
      }
      if (isImportBatchTrendsEligibleStatus(draftEval.status) && orderImports.length > 0) {
        return [{ orderImports, summaryImports }];
      }
      return [];
    }
    const segments: TrendsImportSegment[] = [];
    for (const b of trendsReadyBatchesAsc) {
      segments.push({ orderImports: b.orderImports, summaryImports: b.summaryImports });
    }
    if (isImportBatchTrendsEligibleStatus(draftEval.status) && orderImports.length > 0) {
      segments.push({ orderImports, summaryImports });
    }
    return segments;
  }, [
    dashboardImportScope,
    savedBatches,
    trendsReadyBatchesAsc,
    draftEval.status,
    orderImports,
    summaryImports,
  ]);

  const trendsSegments = useMemo(() => {
    return trendsWorkspaceSegmentsBase
      .map((seg) => filterTrendsSegmentByGame(seg, workspaceGameFilter))
      .filter((x): x is TrendsImportSegment => x != null);
  }, [trendsWorkspaceSegmentsBase, workspaceGameFilter]);

  const trendsOrderImportsMerged = useMemo(
    () => trendsSegments.flatMap((s) => s.orderImports),
    [trendsSegments],
  );

  const trendsOrderData = useMemo(
    () => mergeImportChunks(trendsOrderImportsMerged),
    [trendsOrderImportsMerged],
  );

  const trendsOrderColumnMap = useMemo((): OrderListColumnMap | null => {
    if (!trendsOrderData?.headers.length) return null;
    return resolveOrderListColumnMap(trendsOrderData.headers);
  }, [trendsOrderData]);

  const trendsOrderListReady = Boolean(
    trendsOrderColumnMap?.ok && trendsOrderData && trendsOrderData.rows.length > 0,
  );

  const trendsTrendData = useMemo(
    () => buildTrendPointsFromTrendsSegments(trendsSegments),
    [trendsSegments],
  );

  const trendsDailyTrendData = useMemo(
    () => buildDailyTrendPointsFromTrendsSegments(trendsSegments),
    [trendsSegments],
  );

  const trendsOrderMetrics = useMemo(() => {
    if (!trendsOrderData || !trendsOrderColumnMap?.ok) return null;
    const m = trendsOrderColumnMap;
    let productSales = 0,
      shipping = 0,
      total = 0;
    for (const r of trendsOrderData.rows) {
      const rowTotal = orderRowCheckoutTotal(r, m);
      total += rowTotal;
      const sh = m.shippingKey ? toNumberLoose(r[m.shippingKey]) : 0;
      shipping += sh;
      if (m.productKey) productSales += toNumberLoose(r[m.productKey]);
      else productSales += Math.max(0, rowTotal - sh);
    }
    const chartRevenue = trendsTrendData.reduce((s, p) => s + p.revenue, 0);
    const chartShipping = trendsTrendData.reduce((s, p) => s + p.shipping, 0);
    return {
      orders: trendsOrderData.rows.length,
      productSales,
      shipping: chartShipping > 0 ? chartShipping : shipping,
      total: chartRevenue > 0 ? chartRevenue : total,
    };
  }, [trendsOrderData, trendsOrderColumnMap, trendsTrendData]);

  const trendsOrderValueBuckets = useMemo(() => {
    if (!trendsOrderData || !trendsOrderColumnMap?.ok) return null;
    const m = trendsOrderColumnMap;
    const buckets = { under5: 0, fiveTo10: 0, tenTo20: 0, over20: 0 };
    for (const r of trendsOrderData.rows) {
      const v = orderRowCheckoutTotal(r, m);
      if (v < 5) buckets.under5++;
      else if (v < 10) buckets.fiveTo10++;
      else if (v < 20) buckets.tenTo20++;
      else buckets.over20++;
    }
    return buckets;
  }, [trendsOrderData, trendsOrderColumnMap]);

  const trendsValidBatchCount = useMemo(() => {
    const nSaved = trendsReadyBatchesAsc.length;
    const draftCanFeed =
      isImportBatchTrendsEligibleStatus(draftEval.status) && orderImports.length > 0;
    if (nSaved > 0) return nSaved;
    return draftCanFeed ? 1 : 0;
  }, [trendsReadyBatchesAsc, draftEval.status, orderImports.length]);

  const trendsHasReviewBatch = useMemo(() => {
    if (dashboardImportScope !== "all") {
      const b = savedBatches.find((x) => x.id === dashboardImportScope);
      if (b) return importBatchTrendsStatus(b) === "review";
      return (
        isImportBatchTrendsEligibleStatus(draftEval.status) &&
        draftEval.status === "review" &&
        orderImports.length > 0
      );
    }
    for (const b of trendsReadyBatchesAsc) {
      if (importBatchTrendsStatus(b) === "review") return true;
    }
    return (
      isImportBatchTrendsEligibleStatus(draftEval.status) &&
      draftEval.status === "review" &&
      orderImports.length > 0
    );
  }, [dashboardImportScope, savedBatches, trendsReadyBatchesAsc, draftEval.status, orderImports.length]);

  const sessionCombinedTotals = useMemo(() => {
    let grossSales = 0;
    let netAfterFees = 0;
    let fees = 0;
    let shipping = 0;
    let orders = 0;
    let any = false;
    for (const { status, summary } of savedBatchSummaries) {
      if (status === "blocked") continue;
      any = true;
      grossSales += summary.grossSales;
      shipping += summary.shipping;
      orders += summary.orders;
      if (summary.fees != null) fees += summary.fees;
      if (summary.netAfterFees != null) netAfterFees += summary.netAfterFees;
    }
    if (!any) return null;
    return { grossSales, netAfterFees, fees, shipping, orders };
  }, [savedBatchSummaries]);

  const orderData = useMemo(() => mergeImportChunks(effectiveOrderImports), [effectiveOrderImports]);
  const summaryData = useMemo(() => mergeImportChunks(effectiveSummaryImports), [effectiveSummaryImports]);

  const orderFileName = useMemo(() => {
    if (orderImports.length === 0) return "";
    if (orderImports.length === 1) return orderImports[0].fileName;
    return `${orderImports.length} order files`;
  }, [orderImports]);

  const summaryFileName = useMemo(() => {
    if (summaryImports.length === 0) return "";
    if (summaryImports.length === 1) return summaryImports[0].fileName;
    return `${summaryImports.length} summary files`;
  }, [summaryImports]);

  const orderColumnMap = useMemo((): OrderListColumnMap | null => {
    if (!orderData?.headers.length) return null;
    return resolveOrderListColumnMap(orderData.headers);
  }, [orderData]);

  const summaryColumnMap = useMemo((): SalesSummaryColumnMap | null => {
    if (!summaryData?.headers.length) return null;
    return resolveSalesSummaryColumnMap(summaryData.headers);
  }, [summaryData]);

  const orderListCalculationReady = Boolean(orderColumnMap?.ok && orderData && orderData.rows.length > 0);
  const summaryCalculationReady = Boolean(summaryColumnMap?.ok && summaryData && summaryData.rows.length > 0);

  const orderMetrics = useMemo(() => {
    if (!orderData || !orderColumnMap?.ok) return null;
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
  }, [orderData, orderColumnMap]);

  const orderFinancialRollup = useMemo(() => {
    if (!orderData || !orderColumnMap?.ok) return null;
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
  }, [orderData, orderColumnMap]);

  const summaryMetrics = useMemo(() => {
    if (!summaryData || !summaryColumnMap?.ok) return null;
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
  }, [summaryData, summaryColumnMap]);

  const trendData = useMemo(
    () => buildTrendDataFromWorkspaceOrder(orderData, orderColumnMap),
    [orderData, orderColumnMap],
  );

  const derived = useMemo(() => {
    const ordersFromSummary = summaryCalculationReady && summaryMetrics && summaryMetrics.orders > 0 ? summaryMetrics.orders : 0;
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
      summaryCalculationReady && summaryMetrics && summaryMetrics.netAfterFees > 0
        ? summaryMetrics.netAfterFees
        : null;
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

    const refunds = summaryCalculationReady && summaryMetrics ? summaryMetrics.refunds : null;
    const aov = orders > 0 && grossSales > 0 ? grossSales / orders : null;
    return { orders, grossSales, shipping, fees, netAfterFees, refunds, aov };
  }, [summaryCalculationReady, summaryMetrics, orderListCalculationReady, orderMetrics, orderFinancialRollup]);

  const feeRate = useMemo(() => {
    if (derived.grossSales == null || derived.grossSales <= 0 || derived.fees == null) return null;
    return derived.fees / derived.grossSales;
  }, [derived.grossSales, derived.fees]);

  const mpo = useMemo(() => {
    if (feeRate == null || feeRate >= 1) return null;
    return estimatedShippingCostPerOrder / (1 - feeRate);
  }, [feeRate, estimatedShippingCostPerOrder]);

  const ordersBelowMPO = useMemo(() => {
    if (!orderData || !orderColumnMap?.ok || mpo == null) return null;
    const m = orderColumnMap;
    let count = 0;
    for (const r of orderData.rows) {
      const orderTotal = orderRowCheckoutTotal(r, m);
      if (orderTotal < mpo) count++;
    }
    return count;
  }, [orderData, orderColumnMap, mpo]);

  const orderValueBuckets = useMemo(() => {
    if (!orderData || !orderColumnMap?.ok) return null;
    const m = orderColumnMap;
    const buckets = { under5: 0, fiveTo10: 0, tenTo20: 0, over20: 0 };
    for (const r of orderData.rows) {
      const v = orderRowCheckoutTotal(r, m);
      if (v < 5) buckets.under5++;
      else if (v < 10) buckets.fiveTo10++;
      else if (v < 20) buckets.tenTo20++;
      else buckets.over20++;
    }
    return buckets;
  }, [orderData, orderColumnMap]);

  const shippingEstimatedCost = useMemo(() => {
    if (!orderData?.rows.length || !orderColumnMap?.ok) return 0;
    const k = orderColumnMap.assumedShippingKey;
    if (k) {
      let sum = 0;
      for (const r of orderData.rows) sum += toNumberLooseCell(r[k]);
      return sum;
    }
    const n = orderMetrics?.orders ?? orderData.rows.length;
    return n > 0 ? n * estimatedShippingCostPerOrder : 0;
  }, [orderData, orderColumnMap, orderMetrics?.orders, estimatedShippingCostPerOrder]);

  const shippingInNet = includeShippingInProfit ? shippingEstimatedCost : 0;

  const estimatedNet = useMemo(() => {
    if (derived.grossSales <= 0) return null;

    if (summaryCalculationReady && summaryData && derived.fees != null) {
      return derived.grossSales - derived.fees - shippingInNet;
    }

    if (orderListCalculationReady && orderFinancialRollup) {
      if (orderFinancialRollup.payout > 0) {
        return orderFinancialRollup.payout - shippingInNet;
      }
      if (derived.fees != null) {
        return derived.grossSales - derived.fees - shippingInNet;
      }
    }

    return null;
  }, [
    derived.grossSales,
    derived.fees,
    shippingInNet,
    summaryCalculationReady,
    summaryData,
    orderListCalculationReady,
    orderFinancialRollup,
  ]);

  const costsForNetDisplay = useMemo(() => {
    if (derived.fees == null) return null;
    if (!summaryCalculationReady && !orderListCalculationReady) return null;
    return (derived.fees ?? 0) + shippingInNet;
  }, [derived.fees, shippingInNet, summaryCalculationReady, orderListCalculationReady]);

  const shippingMargin = derived.shipping != null ? derived.shipping - shippingEstimatedCost : null;

  const averageDailyRevenue = useMemo(() => {
    if (!trendData.length) return null;
    return trendData.reduce((sum, p) => sum + p.revenue, 0) / trendData.length;
  }, [trendData]);

  const momentumScore = useMemo(() => {
    if (averageDailyRevenue == null) return 0;
    if (averageDailyRevenue >= 200) return 95;
    if (averageDailyRevenue >= 120) return 82;
    if (averageDailyRevenue >= 80) return 68;
    if (averageDailyRevenue >= 40) return 50;
    return 30;
  }, [averageDailyRevenue]);

  const momentumLabel = useMemo(() => {
    if (averageDailyRevenue == null) return "-";
    if (momentumScore >= 80) return "Fast";
    if (momentumScore >= 60) return "Normal";
    return "Slow";
  }, [momentumScore, averageDailyRevenue]);

  const feeEfficiencyScore = useMemo(() => {
    if (feeRate == null) return 0;
    if (feeRate <= 0.13) return 95;
    if (feeRate <= 0.145) return 82;
    if (feeRate <= 0.155) return 68;
    if (feeRate <= 0.17) return 50;
    return 30;
  }, [feeRate]);

  const feeEfficiencyLabel = useMemo(() => {
    if (feeRate == null) return "-";
    if (feeEfficiencyScore >= 80) return "Light";
    if (feeEfficiencyScore >= 60) return "Average";
    return "Heavy";
  }, [feeEfficiencyScore, feeRate]);

  const orderStrengthScore = useMemo(() => {
    if (derived.aov == null) return 0;
    if (derived.aov >= 15) return 95;
    if (derived.aov >= 12) return 82;
    if (derived.aov >= 9) return 68;
    if (derived.aov >= 6) return 50;
    return 30;
  }, [derived.aov]);

  const orderStrengthLabel = useMemo(() => {
    if (derived.aov == null) return "-";
    if (orderStrengthScore >= 90) return "Strong";
    if (orderStrengthScore >= 75) return "Good";
    if (orderStrengthScore >= 60) return "Fair";
    return "Weak";
  }, [orderStrengthScore, derived.aov]);

  const reconciliation = useMemo(() => {
    if (!orderListCalculationReady || !summaryCalculationReady || !orderMetrics || !summaryMetrics) return null;
    const orderDiff = summaryMetrics.orders - orderMetrics.orders;
    const salesDiff = summaryMetrics.grossSales - orderMetrics.total;
    const synced = Math.abs(orderDiff) === 0 && Math.abs(salesDiff) <= 0.01;
    return { synced, orderDiff, salesDiff };
  }, [orderListCalculationReady, summaryCalculationReady, orderMetrics, summaryMetrics]);

  const workspaceGate = draftEval.workspaceGate;
  const workspaceReady = draftEval.workspaceReady;
  const importFinancialConsistency = draftEval.importFinancialConsistency;
  const importTimeAlignment = draftEval.importTimeAlignment;

  const commitDraftToSession = useCallback((): string | null => {
    if (!draftEval.workspaceReady || orderImports.length === 0 || summaryImports.length === 0) return null;
    const label =
      draftEval.label !== "Unlabeled" ? draftEval.label : orderImports[0]?.gameLabel?.trim() || "Import";
    const summaryCache = snapshotFromImportBatchEvaluation(draftEval);
    const id = newImportId();
    setSavedBatches((prev) => [
      ...prev,
      {
        id,
        label,
        savedAtIso: new Date().toISOString(),
        orderImports: orderImports.map(cloneImportChunkDeep),
        summaryImports: summaryImports.map(cloneImportChunkDeep),
        summaryCache,
      },
    ]);
    setOrderImports([]);
    setSummaryImports([]);
    return id;
  }, [draftEval, orderImports, summaryImports]);

  const clearLastImportPreview = useCallback(() => {
    setLastPreview(null);
  }, []);

  const removeSessionBatch = useCallback(
    (batchId: string) => {
      setSavedBatches((prev) => prev.filter((b) => b.id !== batchId));
      if (dashboardImportScope === batchId) setDashboardImportScope("all");
    },
    [dashboardImportScope, setDashboardImportScope],
  );

  const replaceSessionBatchWithDraft = useCallback(
    (batchId: string) => {
      const b = savedBatches.find((x) => x.id === batchId);
      if (!b) return;
      setOrderImports(b.orderImports.map(cloneImportChunkDeep));
      setSummaryImports(b.summaryImports.map(cloneImportChunkDeep));
      setSavedBatches((prev) => prev.filter((x) => x.id !== batchId));
      if (dashboardImportScope === batchId) setDashboardImportScope("all");
    },
    [savedBatches, dashboardImportScope, setDashboardImportScope],
  );

  useEffect(() => {
    if (dashboardImportScope === "all") return;
    if (!savedBatches.some((b) => b.id === dashboardImportScope)) {
      setDashboardImportScope("all");
    }
  }, [savedBatches, dashboardImportScope, setDashboardImportScope]);

  const handleFiles = async (
    files: FileList | File[],
    target: "order" | "summary",
    options?: { game?: string }
  ) => {
    const game = options?.game?.trim() || "All Games";
    const list = Array.from(files);
    if (list.length === 0) return;
    setError("");
    setImportProgress(null);

    let batchDup = 0;
    let filesAccepted = 0;
    let filesRejected = 0;
    let batchAny = 0;
    let previewUpdate: ImportPreviewPayload | null = null;
    let limitHit = false;

    const onProg = (p: ImportProgressPayload | null) => setImportProgress(p);

    try {
      if (target === "order") {
        const r = await appendOrderImportsFromFiles(list, orderImportsRef.current, game, onProg);
        orderImportsRef.current = r.chunks;
        setOrderImports(r.chunks);
        batchDup = r.batchDup;
        filesAccepted = r.filesAccepted;
        filesRejected = r.filesRejected;
        batchAny = r.batchAny;
        limitHit = r.limitHit;
        previewUpdate = r.previewUpdate;
        if (r.filenameDuplicateSkips > 0) {
          queueDuplicateFilenameNotice("order", r.filenameDuplicateSkips);
        }
      } else {
        const r = await appendSummaryImportsFromFiles(list, summaryImportsRef.current, game, onProg);
        summaryImportsRef.current = r.chunks;
        setSummaryImports(r.chunks);
        batchDup = r.batchDup;
        filesAccepted = r.filesAccepted;
        filesRejected = r.filesRejected;
        batchAny = r.batchAny;
        limitHit = r.limitHit;
        previewUpdate = r.previewUpdate;
        if (r.filenameDuplicateSkips > 0) {
          queueDuplicateFilenameNotice("summary", r.filenameDuplicateSkips);
        }
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to process import.");
    } finally {
      setImportProgress(null);
    }

    if (limitHit) {
      setError(
        `You can add up to ${MAX_IMPORT_FILES_PER_TYPE} ${target === "order" ? "order list" : "sales summary"} files. Remove some to add more.`
      );
    }

    if (batchAny > 0) {
      setLastImportDate(new Date());
      if (previewUpdate) setLastPreview(previewUpdate);
    }

    setLastImportBatch({
      at: new Date(),
      gameLabel: game,
      duplicatesSkipped: batchDup,
      filesAccepted,
      filesRejected,
    });
  };

  const handleFile = async (file: File, target: "order" | "summary", options?: { game?: string }) => {
    await handleFiles([file], target, options);
  };

  const removeImportFile = (id: string, target: "order" | "summary") => {
    setError("");
    setLastPreview(null);
    if (target === "order") {
      setOrderImports((prev) => prev.filter((x) => x.id !== id));
    } else {
      setSummaryImports((prev) => prev.filter((x) => x.id !== id));
    }
  };

  const resetAll = () => {
    setOrderImports([]);
    setSummaryImports([]);
    orderImportsRef.current = [];
    summaryImportsRef.current = [];
    setSavedBatches([]);
    setLastPreview(null);
    setLastImportDate(null);
    setLastImportBatch(null);
    setError("");
    setImportProgress(null);
    setImportDuplicateFilenameNotice(null);
    setDashboardImportScope("all");
    setWorkspaceGameFilterState("all");
    try {
      localStorage.removeItem(WORKSPACE_GAME_FILTER_KEY);
    } catch {
      /* ignore */
    }
    if (duplicateFilenameNoticeTimeoutRef.current) {
      clearTimeout(duplicateFilenameNoticeTimeoutRef.current);
      duplicateFilenameNoticeTimeoutRef.current = null;
    }
    clearImportStateStorage();
  };

  const previewHeaders = lastPreview?.data.headers ?? [];
  const previewRows = (lastPreview?.data.rows ?? []).slice(0, 25);

  const hasDashboardImport = summaryData != null;
  const hasAnyImport = orderData != null || summaryData != null;
  const hasOrderImport = orderData != null;

  const workspaceStoreLabel = useMemo(() => {
    if (workspaceGameFilter !== "all") {
      return workspaceGameFilter;
    }
    if (dashboardImportScope !== "all") {
      const b = savedBatches.find((x) => x.id === dashboardImportScope);
      if (b) return b.label;
    }
    if (savedBatches.length === 0) {
      return getWorkspaceStoreLabel([...orderImports, ...summaryImports]);
    }
    const usableLabels = savedBatchSummaries
      .filter((x) => x.status !== "blocked")
      .map((x) => x.batch.label.trim())
      .filter(Boolean);
    const uniq = [...new Set(usableLabels)];
    if (uniq.length === 1) return uniq[0]!;
    return getWorkspaceStoreLabel([...effectiveOrderImportsBase, ...effectiveSummaryImportsBase]);
  }, [
    workspaceGameFilter,
    dashboardImportScope,
    savedBatches,
    savedBatchSummaries,
    orderImports,
    summaryImports,
    effectiveOrderImportsBase,
    effectiveSummaryImportsBase,
  ]);

  const importValidationIssues = useMemo(() => {
    const issues: string[] = [];
    if (orderData) issues.push(...validateOrderListCsv(orderData));
    if (summaryData) issues.push(...validateSalesSummaryCsv(summaryData));
    if (issues.length <= IMPORT_MAX_ISSUES_DISPLAYED) return issues;
    const more = issues.length - IMPORT_MAX_ISSUES_DISPLAYED;
    return [
      ...issues.slice(0, IMPORT_MAX_ISSUES_DISPLAYED),
      `Showing first ${IMPORT_MAX_ISSUES_DISPLAYED} issues (${more} more not listed).`,
    ];
  }, [orderData, summaryData]);

  const value: DataContextValue = {
    hasDashboardImport,
    hasAnyImport,
    hasOrderImport,
    orderData,
    summaryData,
    orderFileName,
    summaryFileName,
    lastPreview,
    lastImportDate,
    error,
    setError,
    orderImports,
    summaryImports,
    effectiveOrderImports,
    effectiveSummaryImports,
    handleFile,
    handleFiles,
    lastImportBatch,
    removeImportFile,
    resetAll,
    derived,
    orderMetrics,
    summaryMetrics,
    trendData,
    feeRate,
    orderValueBuckets,
    mpo,
    ordersBelowMPO,
    shippingEstimatedCost,
    costsForNetDisplay,
    estimatedNet,
    shippingMargin,
    averageDailyRevenue,
    momentumScore,
    momentumLabel,
    feeEfficiencyScore,
    feeEfficiencyLabel,
    orderStrengthScore,
    orderStrengthLabel,
    reconciliation,
    previewHeaders,
    previewRows,
    workspaceStoreLabel,
    importValidationIssues,
    orderListCalculationReady,
    summaryCalculationReady,
    orderColumnMap,
    summaryColumnMap,
    workspaceReady,
    workspaceBlockedReasons: workspaceGate.reasons,
    importLabelMismatch: workspaceGate.labelMismatch,
    importFinancialConsistency,
    importDuplicateFilenameNotice,
    importTimeAlignment,
    importHasRejectedFiles,
    draftImportEvaluation: draftEval,
    savedImportBatches: savedBatches,
    savedBatchSummaries,
    sessionCombinedTotals,
    commitDraftToSession,
    clearLastImportPreview,
    removeSessionBatch,
    replaceSessionBatchWithDraft,
    dashboardImportScope,
    setDashboardImportScope,
    workspaceGameFilter,
    setWorkspaceGameFilter,
    workspaceGameFilterOptions,
    workspaceIncludesUnsavedDraft,
    importProgress,
    trendsOrderData,
    trendsOrderColumnMap,
    trendsTrendData,
    trendsDailyTrendData,
    trendsOrderListReady,
    trendsOrderValueBuckets,
    trendsOrderMetrics,
    trendsValidBatchCount,
    trendsReadyBatchesAsc,
    trendsHasReviewBatch,
  };

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error("useData must be used within DataProvider");
  return ctx;
}
