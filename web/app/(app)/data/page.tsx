"use client";

import Link from "next/link";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import PageShell from "../../../components/PageShell";
import { useData, type ImportChunk } from "../../../components/DataProvider";
import Card from "../../../components/Card";
import InfoTooltip from "../../../components/InfoTooltip";
import { IMPORT_GAME_OPTIONS, type ImportGameId } from "../../../lib/games";
import { MAX_IMPORT_FILES_PER_TYPE } from "../../../lib/importMerge";
import { isContributingChunk } from "../../../lib/importHardening";
import {
  aggregateOrderDateRangeFromChunks,
  formatImportRangeLabel,
} from "../../../lib/importMetadata";
import { getWorkspaceStoreLabel } from "../../../lib/sessionLabel";
import { resolveOrderListColumnMap } from "../../../lib/orderListColumnMap";
import { resolveSalesSummaryColumnMap } from "../../../lib/salesSummaryColumnMap";
import { ImportCheckBlock } from "../../../components/imports/ImportCheckBlock";
import { ImportsSnapshotStrip } from "../../../components/imports/ImportsSnapshotStrip";
import { UNMAPPED_COLUMN_WARNING_LINES, formatImportFileRejectionMessage } from "../../../lib/importFormatCopy";
import type { ImportBatchStatus } from "../../../lib/importSessionBatch";
import type { CrossFileFinancialConsistency } from "../../../lib/crossFileFinancialCheck";
import type { ImportTimeAlignment } from "../../../lib/crossFileTimeAlignment";
import type { ImportLabelMismatch } from "../../../lib/importHardening";

const RECOMMENDED_MAX_FILES_UI = 12;
const IMPORT_GAME_STORAGE_KEY = "cardops-import-selected-game";
const IMPORT_GAME_CUSTOM_STORAGE_KEY = "cardops-import-custom-label";

function formatImportSessionUsd(n: number) {
  return n.toLocaleString(undefined, { style: "currency", currency: "USD" });
}

function importBatchStatusTitle(status: ImportBatchStatus): string {
  switch (status) {
    case "ready":
      return "Ready";
    case "review":
      return "Review";
    case "blocked":
      return "Blocked";
  }
}

type ImportTrafficLight = "green" | "yellow" | "red";

function importTrafficPresentation(input: {
  hasFiles: boolean;
  workspaceReady: boolean;
  importLabelMismatch: ImportLabelMismatch | null;
  importTimeAlignment: ImportTimeAlignment | null;
  financialConsistencyLevel: CrossFileFinancialConsistency["level"];
  importFinancialConsistency: CrossFileFinancialConsistency | null;
  workspaceBlockedReasons: string[];
}): { light: ImportTrafficLight; headline: string; subtext: string } | null {
  if (!input.hasFiles) return null;

  if (!input.workspaceReady) {
    if (input.importLabelMismatch) {
      return {
        light: "red",
        headline: "Fix this batch",
        subtext: "Labels don’t match.",
      };
    }
    if (input.importTimeAlignment?.status === "mismatch") {
      return {
        light: "red",
        headline: "Fix this batch",
        subtext: "Time periods don’t match.",
      };
    }
    return {
      light: "red",
      headline: "Fix this batch",
      subtext: "See details to fix.",
    };
  }

  const fin = input.financialConsistencyLevel;
  if (fin === "severe") {
    return {
      light: "red",
      headline: "Fix this batch",
      subtext: "Totals don’t line up.",
    };
  }
  if (input.importTimeAlignment?.status === "unknown") {
    return {
      light: "yellow",
      headline: "Review this batch",
      subtext: "Sales Summary date range is unknown",
    };
  }
  if (fin === "warn") {
    return {
      light: "yellow",
      headline: "Review this batch",
      subtext: "Totals worth a second look.",
    };
  }
  return {
    light: "green",
    headline: "You're ready to go",
    subtext: "Your data has been processed and matched successfully.",
  };
}

function readStoredImportLabel(): { choice: ImportGameId | ""; custom: string } {
  if (typeof window === "undefined") return { choice: "", custom: "" };
  try {
    const s = localStorage.getItem(IMPORT_GAME_STORAGE_KEY);
    if (!s || !(IMPORT_GAME_OPTIONS as readonly string[]).includes(s)) {
      return { choice: "", custom: "" };
    }
    const choice = s as ImportGameId;
    if (choice === "Other") {
      const custom = localStorage.getItem(IMPORT_GAME_CUSTOM_STORAGE_KEY) ?? "";
      return { choice: "Other", custom };
    }
    return { choice, custom: "" };
  } catch {
    /* ignore */
  }
  return { choice: "", custom: "" };
}

function slotCardStatusLine(imports: ImportChunk[]): string {
  const rejected = imports.filter((c) => c.validationStatus === "rejected");
  if (rejected.length > 0) {
    const r = (rejected[0].validationReasonLine ?? "").trim();
    return formatImportFileRejectionMessage(r || "Rejected");
  }
  const total = imports.filter(isContributingChunk).reduce((s, c) => {
    const n = c.importCheck?.rowsAccepted ?? c.data.rows.length;
    return s + n;
  }, 0);
  return `Accepted - ${total.toLocaleString()} row${total !== 1 ? "s" : ""}`;
}

function ImportRulesTooltipBody({ techCap }: { techCap: number }) {
  return (
    <div className="space-y-2.5 text-xs leading-snug">
      <div>
        <p className="font-semibold text-slate-900 dark:text-slate-50">File limits</p>
        <p className="text-slate-600 dark:text-slate-300">
          Up to ~{RECOMMENDED_MAX_FILES_UI} files per type recommended · hard cap {techCap}.
        </p>
      </div>
      <div>
        <p className="font-semibold text-slate-900 dark:text-slate-50">Duplicate handling</p>
        <p className="text-slate-600 dark:text-slate-300">
          Same filename again → not added; you&apos;ll see a short notice by Add CSV. Same contents under a different name
          → warning on the file row; rows still merge unless rejected for another reason.
        </p>
      </div>
      <div>
        <p className="font-semibold text-slate-900 dark:text-slate-50">File type</p>
        <p className="text-slate-600 dark:text-slate-300">
          Type is detected from column headers. Wrong slot (e.g. Sales Summary CSV under Order List) → Rejected.
        </p>
      </div>
      <div>
        <p className="font-semibold text-slate-900 dark:text-slate-50">Rows</p>
        <p className="text-slate-600 dark:text-slate-300">Invalid rows are skipped during merge.</p>
      </div>
    </div>
  );
}

function UploadCardInfoTooltip({ techCap }: { techCap: number }) {
  return (
    <InfoTooltip
      aria-label="Import rules: limits, duplicates, and file type"
      marker={<span className="text-sm leading-none text-slate-500 dark:text-slate-400">ℹ️</span>}
    >
      <ImportRulesTooltipBody techCap={techCap} />
    </InfoTooltip>
  );
}

/** Secondary trust line inside Workspace card: Details tooltip includes invalid-rows note. */
function ImportsWorkspaceTrustLine({ techCap }: { techCap: number }) {
  return (
    <div className="flex flex-wrap items-center gap-x-1.5 text-[10px] leading-snug text-slate-500 dark:text-slate-500">
      <InfoTooltip
        aria-label="Import rules"
        marker={
          <span className="cursor-pointer font-medium text-slate-600 underline underline-offset-2 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200">
            Import rules
          </span>
        }
      >
        <ImportRulesTooltipBody techCap={techCap} />
      </InfoTooltip>
      <span className="text-slate-400 dark:text-slate-600" aria-hidden>
        ·
      </span>
      <Link
        href="/help"
        className="font-medium text-slate-600 underline underline-offset-2 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
      >
        Help
      </Link>
    </div>
  );
}

function CollapsibleUnmappedHelp() {
  return (
    <div className="sm:col-span-2 text-[11px] leading-snug text-amber-950 dark:text-amber-100" role="status">
      <p>Headers do not match a standard export.</p>
      <details className="mt-0.5">
        <summary className="cursor-pointer font-medium text-amber-900/90 underline-offset-2 hover:underline dark:text-amber-200">Detail</summary>
        <p className="mt-1 opacity-95">{UNMAPPED_COLUMN_WARNING_LINES[0] ?? ""}</p>
      </details>
    </div>
  );
}

function chunkMappedForCalculations(chunk: ImportChunk, kind: "order" | "summary"): boolean {
  if (kind === "order") {
    return chunk.importMapping?.kind === "order"
      ? chunk.importMapping.mapped
      : resolveOrderListColumnMap(chunk.data.headers).ok;
  }
  return chunk.importMapping?.kind === "summary"
    ? chunk.importMapping.mapped
    : resolveSalesSummaryColumnMap(chunk.data.headers).ok;
}

function chunkShowUnmappedHelp(chunk: ImportChunk, kind: "order" | "summary"): boolean {
  if (chunk.validationStatus === "rejected") return false;
  return !chunkMappedForCalculations(chunk, kind);
}

function UploadZone({
  title,
  titleDescription,
  helperEmpty,
  imports,
  onFiles,
  onRemove,
  uploadsEnabled,
  techCap,
  kind,
  fileInputTestId,
  statusLineTestId,
  regionLabel,
  nextStepHint,
  pairedSlotLabel,
  labelPairMismatch,
  duplicateFilenameNotice,
}: {
  title: string;
  /** Short line under the section title (what belongs in this slot). */
  titleDescription: string;
  helperEmpty: string;
  imports: ImportChunk[];
  onFiles: (files: FileList) => void;
  onRemove: (id: string) => void;
  uploadsEnabled: boolean;
  techCap: number;
  kind: "order" | "summary";
  fileInputTestId?: string;
  statusLineTestId: string;
  regionLabel: string;
  /** When only the *other* slot has files, highlight this card and show next step. */
  nextStepHint?: string | null;
  /** Other slot’s game label when Order List vs Sales Summary labels disagree. */
  pairedSlotLabel?: string | null;
  labelPairMismatch?: boolean;
  /** Filename already in this slot. Show alert above Add CSV (temporary). */
  duplicateFilenameNotice?: { skippedCount: number; noticeId: number } | null;
}) {
  const statusLine = imports.length === 0 ? helperEmpty : slotCardStatusLine(imports);
  const isRejectedLine = imports.length > 0 && statusLine.startsWith("Rejected");
  const pairClash = Boolean(labelPairMismatch && imports.length > 0 && !isRejectedLine);
  const accentBar = kind === "order" ? "border-l-sky-500" : "border-l-teal-600";
  const nextHighlight = Boolean(nextStepHint) && !pairClash;

  return (
    <section
      aria-label={regionLabel}
      className="flex h-full min-h-[17rem] flex-1 flex-col sm:min-h-[18rem]"
    >
      <Card
        data-imports-next-highlight={nextHighlight ? "true" : undefined}
        data-imports-label-pair-mismatch={pairClash ? "true" : undefined}
        className={`flex h-full min-h-[17rem] flex-col !p-0 overflow-hidden border border-slate-200/85 dark:border-slate-700/65 sm:min-h-[18rem] ${!uploadsEnabled ? "opacity-70" : ""} ${
          pairClash
            ? "ring-2 ring-rose-500/75 ring-offset-2 ring-offset-white shadow-md shadow-rose-900/15 dark:ring-rose-500/55 dark:ring-offset-slate-900 dark:shadow-rose-950/35"
            : nextHighlight
              ? "ring-2 ring-amber-400/70 ring-offset-2 ring-offset-white shadow-md shadow-amber-900/10 dark:ring-amber-500/50 dark:ring-offset-slate-900 dark:shadow-amber-900/20"
              : ""
        }`}
      >
        <div
          className={`relative border-b border-slate-200/80 bg-slate-50/95 px-4 py-3 dark:border-slate-700/70 dark:bg-slate-900/75 sm:px-4 sm:py-3.5 ${accentBar} border-l-[3px]`}
        >
          <div className="relative flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="text-base font-bold leading-tight tracking-tight text-slate-900 dark:text-slate-50 sm:text-lg">
                {title}
              </h3>
              <p className="mt-1 text-xs leading-snug text-slate-600 dark:text-slate-400">{titleDescription}</p>
            </div>
            <div className="shrink-0 rounded-md border border-slate-200/90 bg-white p-0.5 dark:border-slate-600 dark:bg-slate-800">
              <UploadCardInfoTooltip techCap={techCap} />
            </div>
          </div>
        </div>

        <div className="flex min-h-0 flex-1 flex-col border-slate-200/80 bg-white px-4 py-3 dark:border-slate-700/60 dark:bg-slate-950/40 sm:px-4 sm:py-4">
        {nextStepHint ? (
          <p className="mb-3 rounded-lg border border-amber-300/60 bg-amber-50/95 px-3 py-2 text-[12px] font-semibold text-amber-950 dark:border-amber-700/50 dark:bg-amber-950/40 dark:text-amber-100">
            {nextStepHint}
          </p>
        ) : null}

        {pairedSlotLabel && pairClash ? (
          <p
            className="mb-2 rounded-lg border border-rose-300/70 bg-rose-50/95 px-3 py-2 text-[12px] font-semibold text-rose-950 dark:border-rose-600/50 dark:bg-rose-950/45 dark:text-rose-100"
            data-testid={kind === "order" ? "upload-order-paired-label" : "upload-summary-paired-label"}
          >
            Paired file is {pairedSlotLabel}
          </p>
        ) : null}

        <p
          data-testid={statusLineTestId}
          className={`min-h-[2.75rem] text-[12px] leading-snug sm:text-[13px] ${
            imports.length === 0
              ? "text-slate-600 dark:text-slate-400"
              : isRejectedLine
                ? "font-medium text-red-800 dark:text-red-200"
                : pairClash
                  ? "font-medium text-rose-900 dark:text-rose-100"
                  : "font-medium text-emerald-800 dark:text-emerald-200"
          }`}
        >
          {statusLine}
        </p>

        {duplicateFilenameNotice ? (
          <div
            key={duplicateFilenameNotice.noticeId}
            role="alert"
            data-testid={kind === "order" ? "upload-order-duplicate-notice" : "upload-summary-duplicate-notice"}
            className="mt-3 rounded-lg border border-amber-400/80 bg-amber-50 px-3 py-2.5 shadow-sm dark:border-amber-600/55 dark:bg-amber-950/50"
          >
            <p className="text-sm font-semibold text-amber-950 dark:text-amber-50">
              {duplicateFilenameNotice.skippedCount > 1
                ? "These files are already uploaded"
                : "This file is already uploaded"}
            </p>
            <p className="mt-0.5 text-[11px] font-medium leading-snug text-amber-900/90 dark:text-amber-200/90">
              Each file can only be added once
            </p>
          </div>
        ) : null}

        <div className="mt-3">
          <label className={`inline-flex ${!uploadsEnabled ? "cursor-not-allowed" : "cursor-pointer"}`}>
            <span
              className={`rounded-xl px-5 py-3 text-base font-semibold ring-2 ring-slate-900/15 ring-offset-2 ring-offset-white transition-[transform,background-color,box-shadow] active:translate-y-px dark:ring-offset-slate-900 ${
                uploadsEnabled
                  ? "bg-slate-900 text-white shadow-lg shadow-slate-900/30 hover:bg-slate-800 hover:shadow-xl hover:shadow-slate-900/35 dark:bg-blue-600 dark:shadow-blue-950/40 dark:ring-blue-500/35 dark:hover:bg-blue-500 dark:hover:shadow-lg dark:hover:shadow-blue-900/45"
                  : "cursor-not-allowed bg-slate-300 text-slate-500 shadow-none ring-slate-300/50 dark:bg-slate-700 dark:text-slate-400 dark:ring-slate-600/40"
              }`}
            >
              Add CSV
            </span>
            <input
              type="file"
              accept=".csv,text/csv"
              multiple
              disabled={!uploadsEnabled}
              className="sr-only"
              data-testid={fileInputTestId}
              onChange={(e) => {
                const list = e.target.files;
                if (list && list.length > 0 && uploadsEnabled) onFiles(list);
                e.target.value = "";
              }}
            />
          </label>
        </div>

        {imports.length > 0 ? (
          <ul className="mt-4 max-h-56 min-h-0 flex-1 space-y-2 overflow-y-auto rounded-xl border border-slate-200/90 bg-white p-2 shadow-sm dark:border-slate-700/70 dark:bg-slate-950/50">
            {imports.map((imp) => (
              <li
                key={imp.id}
                className="rounded-md border border-slate-100 bg-slate-50/90 px-2 py-1.5 dark:border-slate-700/60 dark:bg-slate-900/60"
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="min-w-0 truncate text-xs font-semibold text-slate-900 dark:text-slate-100" title={imp.fileName}>
                    {imp.fileName}
                  </span>
                  <button
                    type="button"
                    onClick={() => onRemove(imp.id)}
                    className="shrink-0 rounded px-1.5 py-0.5 text-[10px] font-normal text-slate-500 underline-offset-2 hover:bg-slate-100 hover:text-red-700 dark:text-slate-500 dark:hover:bg-slate-800 dark:hover:text-red-400"
                  >
                    Remove file
                  </button>
                </div>
                {imp.gameLabel ? (
                  <p className="mt-0.5 text-[10px] text-slate-500 dark:text-slate-500">Label: {imp.gameLabel}</p>
                ) : null}
                {imp.importCheck ? (
                  <ImportCheckBlock
                    kind={kind}
                    check={imp.importCheck}
                    integrityWarning={imp.integrityWarning}
                    rejected={imp.validationStatus === "rejected"}
                    rejectionReason={imp.validationReasonLine}
                  />
                ) : null}
                {chunkShowUnmappedHelp(imp, kind) ? (
                  <div className="mt-1">
                    <CollapsibleUnmappedHelp />
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        ) : (
          <div className="mt-4 min-h-[5rem] flex-1 rounded-xl border border-dashed border-slate-200/40 bg-slate-50/50 dark:border-slate-700/30 dark:bg-slate-900/30" aria-hidden />
        )}
        </div>
      </Card>
    </section>
  );
}

export default function DataPage() {
  const {
    orderImports,
    summaryImports,
    error,
    handleFiles,
    removeImportFile,
    resetAll,
    lastImportDate,
    lastImportBatch,
    draftImportEvaluation,
    workspaceReady,
    workspaceBlockedReasons,
    importLabelMismatch,
    importFinancialConsistency,
    importDuplicateFilenameNotice,
    importTimeAlignment,
    importHasRejectedFiles,
    savedBatchSummaries,
    sessionCombinedTotals,
    commitDraftToSession,
    clearLastImportPreview,
    removeSessionBatch,
    replaceSessionBatchWithDraft,
    importProgress,
  } = useData();

  const orderListCalculationReady = draftImportEvaluation.orderListCalculationReady;
  const summaryCalculationReady = draftImportEvaluation.summaryCalculationReady;

  const [importGame, setImportGame] = useState<ImportGameId | "">("");
  const [importGameOtherText, setImportGameOtherText] = useState("");
  const [gameHydrated, setGameHydrated] = useState(false);
  const [batchSavedNotice, setBatchSavedNotice] = useState<string | null>(null);
  const [currentUploadCollapsed, setCurrentUploadCollapsed] = useState(false);
  const [highlightSavedBatchId, setHighlightSavedBatchId] = useState<string | null>(null);
  const [importSuccessFlash, setImportSuccessFlash] = useState(false);
  const skipImportFlashHydration = useRef(true);
  const prevLastImportMs = useRef<number | null>(null);

  useEffect(() => {
    const ms = lastImportDate?.getTime() ?? null;
    if (skipImportFlashHydration.current) {
      skipImportFlashHydration.current = false;
      prevLastImportMs.current = ms;
      return;
    }
    if (ms != null && prevLastImportMs.current !== ms && workspaceReady) {
      prevLastImportMs.current = ms;
      setImportSuccessFlash(true);
      const id = window.setTimeout(() => setImportSuccessFlash(false), 4000);
      return () => window.clearTimeout(id);
    }
    prevLastImportMs.current = ms;
  }, [lastImportDate, workspaceReady]);

  useEffect(() => {
    const id = requestAnimationFrame(() => {
      const { choice, custom } = readStoredImportLabel();
      setImportGame((prev) => (prev !== "" ? prev : choice));
      setImportGameOtherText((prev) => {
        if (prev !== "") return prev;
        return choice === "Other" ? custom : "";
      });
      setGameHydrated(true);
    });
    return () => cancelAnimationFrame(id);
  }, []);

  useEffect(() => {
    if (!gameHydrated || !importGame) return;
    try {
      localStorage.setItem(IMPORT_GAME_STORAGE_KEY, importGame);
      if (importGame === "Other") {
        localStorage.setItem(IMPORT_GAME_CUSTOM_STORAGE_KEY, importGameOtherText);
      } else {
        localStorage.removeItem(IMPORT_GAME_CUSTOM_STORAGE_KEY);
      }
    } catch {
      /* ignore */
    }
  }, [importGame, importGameOtherText, gameHydrated]);

  const effectiveImportLabel = useMemo(() => {
    if (!importGame) return "";
    if (importGame === "Other") return importGameOtherText.trim();
    return importGame;
  }, [importGame, importGameOtherText]);

  const uploadsEnabled = Boolean(effectiveImportLabel);

  const canAddAnotherGame =
    workspaceReady && orderImports.length > 0 && summaryImports.length > 0 && !importProgress;

  const handleAddAnotherGame = useCallback(() => {
    if (!canAddAnotherGame) return;
    const label = effectiveImportLabel.trim() || "This";
    const newBatchId = commitDraftToSession();
    clearLastImportPreview();
    setImportGame("");
    setImportGameOtherText("");
    setBatchSavedNotice(`${label} batch added`);
    setCurrentUploadCollapsed(true);
    if (newBatchId) setHighlightSavedBatchId(newBatchId);
    try {
      localStorage.removeItem(IMPORT_GAME_STORAGE_KEY);
      localStorage.removeItem(IMPORT_GAME_CUSTOM_STORAGE_KEY);
    } catch {
      /* ignore */
    }
  }, [canAddAnotherGame, effectiveImportLabel, commitDraftToSession, clearLastImportPreview]);

  const allChunks = useMemo(() => [...orderImports, ...summaryImports], [orderImports, summaryImports]);
  const filesLoadedCount = allChunks.length;
  const hasFiles = filesLoadedCount > 0;
  const distinctImportLabels = useMemo(() => {
    const raw = allChunks.map((c) => c.gameLabel?.trim()).filter(Boolean) as string[];
    return new Set(raw);
  }, [allChunks]);
  const workspaceLabelCount = distinctImportLabels.size;

  useEffect(() => {
    if (filesLoadedCount > 0) setCurrentUploadCollapsed(false);
  }, [filesLoadedCount]);

  useEffect(() => {
    if (!batchSavedNotice) return;
    const id = window.setTimeout(() => setBatchSavedNotice(null), 10000);
    return () => clearTimeout(id);
  }, [batchSavedNotice]);

  useEffect(() => {
    if (!highlightSavedBatchId) return;
    const id = window.setTimeout(() => setHighlightSavedBatchId(null), 2800);
    return () => clearTimeout(id);
  }, [highlightSavedBatchId]);

  useLayoutEffect(() => {
    if (!highlightSavedBatchId) return;
    const row = document.getElementById(`imports-saved-batch-${highlightSavedBatchId}`);
    if (row) {
      row.scrollIntoView({ behavior: "smooth", block: "center" });
    } else {
      document.getElementById("imports-saved-batches-section")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [highlightSavedBatchId]);

  const ordersImported = draftImportEvaluation.orders;

  const coverageRange = useMemo(() => aggregateOrderDateRangeFromChunks(orderImports), [orderImports]);
  const coverageRangeLabel = coverageRange ? formatImportRangeLabel(coverageRange.from, coverageRange.to) : "-";

  const summaryGameLabel = useMemo(() => {
    const fromFiles = getWorkspaceStoreLabel(allChunks);
    return fromFiles !== "Unlabeled" ? fromFiles : effectiveImportLabel || "-";
  }, [allChunks, effectiveImportLabel]);

  const selectClass =
    "app-inset-well w-full max-w-md rounded-xl border border-slate-200/90 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400/25 dark:border-slate-600/90 dark:bg-slate-950/80 dark:text-slate-100";

  const runOrderUpload = (files: FileList) => {
    if (!effectiveImportLabel) return;
    void handleFiles(files, "order", { game: effectiveImportLabel });
  };
  const runSummaryUpload = (files: FileList) => {
    if (!effectiveImportLabel) return;
    void handleFiles(files, "summary", { game: effectiveImportLabel });
  };

  const lastBatchTime =
    lastImportBatch &&
    new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(lastImportBatch.at);

  const orderFilesPresentButUnmapped = orderImports.length > 0 && !orderListCalculationReady;
  const summaryFilesPresentButUnmapped = summaryImports.length > 0 && !summaryCalculationReady;

  const onlyOrderUploaded = orderImports.length > 0 && summaryImports.length === 0;
  const onlySummaryUploaded = summaryImports.length > 0 && orderImports.length === 0;

  const financialConsistencyLevel = importFinancialConsistency?.level ?? "ok";

  const importTraffic = useMemo(
    () =>
      importTrafficPresentation({
        hasFiles,
        workspaceReady,
        importLabelMismatch,
        importTimeAlignment,
        financialConsistencyLevel,
        importFinancialConsistency,
        workspaceBlockedReasons,
      }),
    [
      hasFiles,
      workspaceReady,
      importLabelMismatch,
      importTimeAlignment,
      financialConsistencyLevel,
      importFinancialConsistency,
      workspaceBlockedReasons,
    ],
  );

  const importStatusTone = useMemo(() => {
    if (!importTraffic) return null;
    switch (importTraffic.light) {
      case "green":
        return "success" as const;
      case "yellow":
        return "time_unknown" as const;
      case "red":
        return "time_mismatch" as const;
      default:
        return null;
    }
  }, [importTraffic]);

  const importStatusShadow = useMemo(() => {
    switch (importStatusTone) {
      case "success":
        return "0 0 0 1px rgba(52, 211, 153, 0.35), 0 10px 36px -12px rgba(16, 185, 129, 0.38)";
      case "time_unknown":
        return "0 0 0 1px rgba(234, 179, 8, 0.42), 0 10px 36px -12px rgba(202, 138, 4, 0.3)";
      case "time_mismatch":
        return "0 0 0 1px rgba(244, 63, 94, 0.45), 0 10px 36px -12px rgba(225, 29, 72, 0.28)";
      default:
        return "0 1px 3px rgba(15, 23, 42, 0.06)";
    }
  }, [importStatusTone]);

  const importStatusCardClass = useMemo(() => {
    switch (importStatusTone) {
      case "success":
        return "border-2 border-emerald-400/70 bg-emerald-50/95 dark:border-emerald-600/50 dark:bg-emerald-950/45";
      case "time_unknown":
        return "border-2 border-amber-400/80 bg-amber-50/95 dark:border-amber-600/50 dark:bg-amber-950/40";
      case "time_mismatch":
        return "border-2 border-rose-500/70 bg-rose-50/95 dark:border-rose-500/50 dark:bg-rose-950/45";
      default:
        return "";
    }
  }, [importStatusTone]);

  const financialHeadlineClass =
    financialConsistencyLevel === "ok"
      ? "text-sm font-semibold text-emerald-800 dark:text-emerald-200"
      : financialConsistencyLevel === "warn"
        ? "text-sm font-semibold text-amber-950 dark:text-amber-100"
        : "text-sm font-semibold text-orange-950 dark:text-orange-100";

  const financialBodyClass =
    financialConsistencyLevel === "ok"
      ? "text-xs font-medium leading-snug text-emerald-700/95 dark:text-emerald-300/90"
      : financialConsistencyLevel === "warn"
        ? "text-xs font-medium leading-snug text-amber-900/95 dark:text-amber-200/90"
        : "text-xs font-medium leading-snug text-orange-900/95 dark:text-orange-200/90";

  const savedBatchesSection =
    savedBatchSummaries.length > 0 ? (
      <section
        id="imports-saved-batches-section"
        aria-labelledby="imports-session-batches-heading"
        className="space-y-2.5 scroll-mt-4 rounded-2xl border-2 border-emerald-200/70 bg-gradient-to-b from-emerald-50/90 via-slate-50/80 to-slate-100/60 p-3.5 shadow-[0_2px_12px_-4px_rgba(16,185,129,0.25)] dark:border-emerald-900/50 dark:from-emerald-950/40 dark:via-slate-950/80 dark:to-slate-900/90 dark:shadow-emerald-950/20 sm:p-4"
      >
        <h2
          id="imports-session-batches-heading"
          className="text-sm font-bold uppercase tracking-wide text-emerald-950 dark:text-emerald-100"
        >
          Saved batches
        </h2>
        <ul className="space-y-2.5 rounded-xl border border-emerald-200/50 bg-white/80 p-2 dark:border-emerald-900/40 dark:bg-slate-900/60" data-testid="imports-session-batch-list">
          {savedBatchSummaries.map(({ batch, status, summary }) => (
            <li
              key={batch.id}
              id={`imports-saved-batch-${batch.id}`}
              className={`rounded-xl border bg-white px-3 py-3 shadow-sm transition-[box-shadow,ring] duration-500 dark:bg-slate-950/85 ${
                highlightSavedBatchId === batch.id
                  ? "border-emerald-400/90 ring-2 ring-emerald-400/70 ring-offset-2 ring-offset-emerald-50 dark:border-emerald-500/70 dark:ring-emerald-400/50 dark:ring-offset-slate-900"
                  : "border-emerald-100/90 dark:border-emerald-900/35"
              }`}
            >
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-50">
                    <span>{batch.label}</span>
                    <span className="mx-1.5 text-slate-400 dark:text-slate-500" aria-hidden>
                      ·
                    </span>
                    <span
                      className={
                        status === "ready"
                          ? "text-emerald-700 dark:text-emerald-300"
                          : status === "review"
                            ? "text-amber-800 dark:text-amber-200"
                            : "text-rose-700 dark:text-rose-300"
                      }
                    >
                      {importBatchStatusTitle(status)}
                    </span>
                  </p>
                  <p className="mt-0.5 text-[11px] text-slate-600 dark:text-slate-400">
                    {summary.orders.toLocaleString()} orders · {summary.coverageLabel}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <details className="relative">
                    <summary className="cursor-pointer list-none rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-slate-800 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800">
                      View details
                    </summary>
                    <div className="absolute right-0 z-20 mt-1 w-[min(92vw,20rem)] rounded-lg border border-slate-200 bg-white p-3 text-[11px] shadow-lg dark:border-slate-600 dark:bg-slate-900">
                      {!summary.workspaceReady ? (
                        <ul className="list-inside list-disc space-y-1 text-slate-700 dark:text-slate-300">
                          {(summary.workspaceGate.reasons.length ? summary.workspaceGate.reasons : ["Workspace not ready"]).map((r) => (
                            <li key={r}>{r}</li>
                          ))}
                        </ul>
                      ) : (
                        <div className="space-y-2 text-slate-700 dark:text-slate-300">
                          {summary.importTimeAlignment ? (
                            <div>
                              <p className="font-semibold text-slate-900 dark:text-slate-100">Time alignment</p>
                              <p>{summary.importTimeAlignment.orderListLine}</p>
                              <p>{summary.importTimeAlignment.salesSummaryLine}</p>
                            </div>
                          ) : null}
                          {summary.importFinancialConsistency ? (
                            <div>
                              <p className="font-semibold text-slate-900 dark:text-slate-100">Totals check</p>
                              <p>{summary.importFinancialConsistency.headline}</p>
                              <ul className="mt-1 list-inside list-disc">
                                {(summary.importFinancialConsistency.sublines ?? []).map((line) => (
                                  <li key={line}>{line}</li>
                                ))}
                              </ul>
                            </div>
                          ) : null}
                          {summary.netAfterFees != null ? (
                            <p className="font-medium tabular-nums text-slate-800 dark:text-slate-200">
                              Net after fees: {formatImportSessionUsd(summary.netAfterFees)}
                            </p>
                          ) : null}
                        </div>
                      )}
                      <p className="mt-2 border-t border-slate-100 pt-2 text-slate-500 dark:border-slate-700 dark:text-slate-400">
                        {batch.orderImports.length} order file
                        {batch.orderImports.length !== 1 ? "s" : ""} · {batch.summaryImports.length} summary file
                        {batch.summaryImports.length !== 1 ? "s" : ""}
                      </p>
                    </div>
                  </details>
                  <button
                    type="button"
                    onClick={() => replaceSessionBatchWithDraft(batch.id)}
                    className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-slate-800 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
                  >
                    Replace files
                  </button>
                  <button
                    type="button"
                    onClick={() => removeSessionBatch(batch.id)}
                    className="rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-[11px] font-semibold text-rose-900 hover:bg-rose-100 dark:border-rose-900/50 dark:bg-rose-950/60 dark:text-rose-100 dark:hover:bg-rose-950/90"
                  >
                    Remove
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </section>
    ) : null;

  const sessionCombinedTotalsPanel = sessionCombinedTotals ? (
    <details className="rounded-md border border-slate-200/50 bg-slate-50/40 px-2 py-1 text-slate-500 opacity-[0.82] dark:border-slate-800/60 dark:bg-slate-950/25 dark:text-slate-500">
      <summary className="cursor-pointer list-none text-[10px] font-medium outline-none [&::-webkit-details-marker]:hidden">
        Combined totals (session)
      </summary>
      <section
        aria-labelledby="imports-combined-heading"
        className="mt-2 rounded-lg border border-slate-200/45 bg-white/70 p-2 dark:border-slate-700/40 dark:bg-slate-900/50 sm:p-2.5"
      >
        <h2 id="imports-combined-heading" className="sr-only">
          Combined imported totals
        </h2>
        <dl className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
          <div className="rounded border border-slate-200/70 bg-white/80 px-2 py-1.5 dark:border-slate-700/50 dark:bg-slate-950/40">
            <dt className="text-[9px] font-medium uppercase tracking-wide text-slate-500">Gross</dt>
            <dd className="mt-0.5 text-xs font-semibold tabular-nums text-slate-800 dark:text-slate-100">
              {formatImportSessionUsd(sessionCombinedTotals.grossSales)}
            </dd>
          </div>
          <div className="rounded border border-slate-200/70 bg-white/80 px-2 py-1.5 dark:border-slate-700/50 dark:bg-slate-950/40">
            <dt className="text-[9px] font-medium uppercase tracking-wide text-slate-500">Net</dt>
            <dd className="mt-0.5 text-xs font-semibold tabular-nums text-slate-800 dark:text-slate-100">
              {formatImportSessionUsd(sessionCombinedTotals.netAfterFees)}
            </dd>
          </div>
          <div className="rounded border border-slate-200/70 bg-white/80 px-2 py-1.5 dark:border-slate-700/50 dark:bg-slate-950/40">
            <dt className="text-[9px] font-medium uppercase tracking-wide text-slate-500">Fees</dt>
            <dd className="mt-0.5 text-xs font-semibold tabular-nums text-slate-800 dark:text-slate-100">
              {formatImportSessionUsd(sessionCombinedTotals.fees)}
            </dd>
          </div>
          <div className="rounded border border-slate-200/70 bg-white/80 px-2 py-1.5 dark:border-slate-700/50 dark:bg-slate-950/40">
            <dt className="text-[9px] font-medium uppercase tracking-wide text-slate-500">Orders</dt>
            <dd className="mt-0.5 text-xs font-semibold tabular-nums text-slate-800 dark:text-slate-100">{sessionCombinedTotals.orders}</dd>
          </div>
          <div className="rounded border border-slate-200/70 bg-white/80 px-2 py-1.5 dark:border-slate-700/50 dark:bg-slate-950/40">
            <dt className="text-[9px] font-medium uppercase tracking-wide text-slate-500">Shipping</dt>
            <dd className="mt-0.5 text-xs font-semibold tabular-nums text-slate-800 dark:text-slate-100">
              {formatImportSessionUsd(sessionCombinedTotals.shipping)}
            </dd>
          </div>
        </dl>
      </section>
    </details>
  ) : null;

  return (
    <PageShell maxWidth="wide-xl" contentClassName="px-6 pt-5 pb-5 sm:px-8 sm:pt-6 sm:pb-6 lg:px-10">
      <div className="space-y-3 rounded-lg border border-slate-200/75 bg-white/95 p-3.5 dark:border-slate-700/65 dark:bg-slate-950/40 sm:space-y-3 sm:p-4">
        <header className="mb-1 border-b border-slate-200/70 pb-3.5 dark:border-slate-700/55">
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50 sm:text-3xl">
            Import your data
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-500 dark:text-slate-400">
            Upload one Order List and one Sales Summary for the same date range.
          </p>
        </header>

        <section
          aria-labelledby="imports-current-upload-heading"
          className="rounded-xl border border-slate-200/80 bg-white p-3 shadow-sm sm:p-4 dark:border-slate-700/60 dark:bg-slate-900/50"
        >
          <div className="flex flex-wrap items-start justify-between gap-2 border-b border-slate-200/70 pb-2 dark:border-slate-700/50">
            <div>
              <h2
                id="imports-current-upload-heading"
                className="text-xs font-bold uppercase tracking-wide text-slate-700 dark:text-slate-300"
              >
                Current upload
              </h2>
            </div>
            {currentUploadCollapsed ? (
              <button
                type="button"
                onClick={() => setCurrentUploadCollapsed(false)}
                className="shrink-0 rounded-lg border border-slate-300/90 bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-slate-800 dark:border-slate-600 dark:bg-slate-800 dark:hover:bg-slate-700"
              >
                Set up next batch
              </button>
            ) : null}
          </div>

          {batchSavedNotice ? (
            <div
              data-testid="imports-batch-saved-notice"
              role="status"
              aria-live="polite"
              className="mt-2.5 rounded-lg border border-emerald-300/80 bg-emerald-50 px-3 py-2.5 text-sm font-semibold text-emerald-950 shadow-sm dark:border-emerald-800/55 dark:bg-emerald-950/50 dark:text-emerald-50"
            >
              {batchSavedNotice}
            </div>
          ) : null}

          {!currentUploadCollapsed ? (
            <div className="mt-2.5 space-y-2.5 sm:mt-3 sm:space-y-3">
        {importProgress ? (
          <div
            role="status"
            aria-live="polite"
            data-testid="imports-progress-banner"
            className="rounded-xl border border-sky-300/80 bg-sky-50/95 px-3.5 py-3 text-sm shadow-sm dark:border-sky-800/50 dark:bg-sky-950/40"
          >
            <p className="font-semibold text-sky-950 dark:text-sky-100">
              {importProgress.largeImport ? "Large import" : "Processing"} · {importProgress.fileName}
            </p>
            <p className="mt-1 text-xs text-sky-900/90 dark:text-sky-200/90">{importProgress.detail}</p>
            {importProgress.totalRows != null && importProgress.processedRows != null ? (
              <p className="mt-1.5 text-[11px] font-medium tabular-nums text-sky-900 dark:text-sky-200">
                {importProgress.processedRows.toLocaleString()} / {importProgress.totalRows.toLocaleString()} rows
              </p>
            ) : null}
          </div>
        ) : null}

        <Card className="border-slate-200/80 bg-white/95 p-3.5 shadow-sm dark:border-slate-700/60 dark:bg-slate-900/70 sm:p-4">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <label htmlFor="import-game" className="shrink-0 text-sm font-semibold text-slate-800 dark:text-slate-200">
              Label
            </label>
            <div className="min-w-0 max-w-64 flex-1 sm:flex-initial">
              <select
                id="import-game"
                data-testid="import-game-select"
                className={`${selectClass} mt-0 w-full max-w-none`}
                value={importGame}
                onChange={(e) => {
                  const v = e.target.value as ImportGameId | "";
                  setImportGame(v);
                  if (v !== "Other") setImportGameOtherText("");
                }}
              >
                <option value="">Choose label…</option>
                {IMPORT_GAME_OPTIONS.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            </div>
          </div>
          {importGame === "Other" ? (
            <div className="mt-3 max-w-64 space-y-1.5">
              <label htmlFor="import-game-other" className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                Your label
              </label>
              <input
                id="import-game-other"
                data-testid="import-game-other-input"
                type="text"
                value={importGameOtherText}
                onChange={(e) => setImportGameOtherText(e.target.value)}
                placeholder="e.g. My shop name or game title"
                autoComplete="off"
                className={`${selectClass} mt-1`}
              />
            </div>
          ) : null}
          {!uploadsEnabled ? (
            <p className="mt-1.5 text-[11px] font-medium text-amber-800 dark:text-amber-300">
              {importGame === "Other" ? "Type your label to upload." : "Pick a label to upload."}
            </p>
          ) : null}
        </Card>

        {hasFiles && workspaceLabelCount > 1 ? (
          <div
            role="alert"
            data-testid="imports-mixed-game-batch-warning"
            className="mt-2 rounded-lg border border-amber-400/90 bg-amber-50 px-3 py-2.5 text-xs font-semibold text-amber-950 shadow-sm dark:border-amber-800/60 dark:bg-amber-950/50 dark:text-amber-50"
          >
            Each batch should contain only one game. Please separate uploads by game.
          </div>
        ) : null}
        {hasFiles && (orderImports.length > 1 || summaryImports.length > 1) ? (
          <div className="mt-2 rounded-lg border border-slate-300/80 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-800 dark:border-slate-600/70 dark:bg-slate-900/50 dark:text-slate-100">
            Each batch should use one order list file and one sales summary file. Save this batch before adding another
            pair.
          </div>
        ) : null}

        <section aria-labelledby="imports-upload-heading" className="mt-2.5 space-y-2 sm:mt-3">
          <h2 id="imports-upload-heading" className="sr-only">
            Upload CSV files
          </h2>
          <div className="grid gap-3 md:grid-cols-2 md:items-stretch md:gap-4">
            <UploadZone
              title="1. Order List"
              titleDescription="Export from TCGplayer Orders (CSV)."
              helperEmpty="Add your Order List to begin"
              imports={orderImports}
              onFiles={runOrderUpload}
              onRemove={(id) => removeImportFile(id, "order")}
              uploadsEnabled={uploadsEnabled}
              techCap={MAX_IMPORT_FILES_PER_TYPE}
              kind="order"
              fileInputTestId="upload-order-csv"
              statusLineTestId="upload-order-slot-status"
              regionLabel="Order List upload"
              nextStepHint={onlySummaryUploaded ? "Next: Add Order List" : null}
              pairedSlotLabel={importLabelMismatch?.summaryLabel ?? null}
              labelPairMismatch={Boolean(importLabelMismatch)}
              duplicateFilenameNotice={
                importDuplicateFilenameNotice?.slot === "order"
                  ? {
                      skippedCount: importDuplicateFilenameNotice.skippedCount,
                      noticeId: importDuplicateFilenameNotice.noticeId,
                    }
                  : null
              }
            />
            <UploadZone
              title="2. Sales Summary"
              titleDescription="Export from Sales Summary for the same period (CSV)."
              helperEmpty="Add your Sales Summary to continue"
              imports={summaryImports}
              onFiles={runSummaryUpload}
              onRemove={(id) => removeImportFile(id, "summary")}
              uploadsEnabled={uploadsEnabled}
              techCap={MAX_IMPORT_FILES_PER_TYPE}
              kind="summary"
              fileInputTestId="upload-summary-csv"
              statusLineTestId="upload-summary-slot-status"
              regionLabel="Sales Summary upload"
              nextStepHint={onlyOrderUploaded ? "Next: Add Sales Summary" : null}
              pairedSlotLabel={importLabelMismatch?.orderLabel ?? null}
              labelPairMismatch={Boolean(importLabelMismatch)}
              duplicateFilenameNotice={
                importDuplicateFilenameNotice?.slot === "summary"
                  ? {
                      skippedCount: importDuplicateFilenameNotice.skippedCount,
                      noticeId: importDuplicateFilenameNotice.noticeId,
                    }
                  : null
              }
            />
          </div>
        </section>

        {error ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-100">
            {error}
          </div>
        ) : null}

            </div>
        ) : (
          <div className="mt-3 rounded-lg border border-dashed border-slate-300/80 bg-slate-50/50 px-3 py-3 text-center dark:border-slate-600/60 dark:bg-slate-950/40">
            <p className="text-sm font-medium text-slate-700 dark:text-slate-200">Cleared. Your batch is in Saved batches.</p>
          </div>
        )}

        </section>

        {hasFiles && importStatusTone ? (
          <section
            aria-labelledby="imports-batch-status-heading"
            className="space-y-2 rounded-xl border border-slate-200/70 bg-white/60 p-3 dark:border-slate-700/55 dark:bg-slate-900/40 sm:p-3.5"
          >
            <h2
              id="imports-batch-status-heading"
              className="text-xs font-bold uppercase tracking-wide text-slate-600 dark:text-slate-400"
            >
              Batch status
            </h2>
          <motion.div
            data-testid="imports-workspace-status"
            key={`${workspaceReady ? "ready" : "blocked"}-${importStatusTone}-${financialConsistencyLevel}-${importLabelMismatch ? "lm" : "ok"}-${importTimeAlignment?.status ?? "x"}`}
            initial={{ opacity: 0.94, y: 6 }}
            animate={{
              opacity: 1,
              y: 0,
              boxShadow: importStatusShadow,
            }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="rounded-2xl"
          >
            <Card className={`p-4 shadow-md sm:p-5 ${importStatusCardClass}`}>
              {importTraffic ? (
                <>
                  <div className="space-y-1">
                    <p
                      data-testid="imports-workspace-headline"
                      className={`text-base font-bold leading-tight sm:text-lg ${
                        importTraffic.light === "green"
                          ? "text-emerald-950 dark:text-emerald-50"
                          : importTraffic.light === "yellow"
                            ? "text-amber-950 dark:text-amber-50"
                            : "text-rose-950 dark:text-rose-50"
                      }`}
                    >
                      {importTraffic.headline}
                    </p>
                    {importTraffic.subtext.trim() ? (
                      <p
                        data-testid="imports-workspace-subtext"
                        className={`text-sm leading-snug ${
                          importTraffic.light === "green"
                            ? "font-normal text-emerald-900/85 dark:text-emerald-100/85"
                            : importTraffic.light === "yellow"
                              ? "font-medium text-amber-900/95 dark:text-amber-100/95"
                              : "font-medium text-rose-900/95 dark:text-rose-100/95"
                        }`}
                      >
                        {importTraffic.subtext}
                      </p>
                    ) : null}
                  </div>

                  <details
                    data-testid="imports-status-details"
                    className="mt-3 rounded-lg border border-slate-200/80 bg-white/70 px-3 py-2 dark:border-slate-600/50 dark:bg-slate-900/40"
                  >
                    <summary className="cursor-pointer text-xs font-semibold text-slate-800 outline-none dark:text-slate-200">
                      View details
                    </summary>
                    <div className="mt-3 space-y-3 text-xs leading-relaxed">
                      <p
                        data-testid="imports-batch-summary-line"
                        className="text-[11px] font-semibold leading-snug text-slate-800 dark:text-slate-100"
                      >
                        <span className="text-slate-900 dark:text-slate-50">{summaryGameLabel}</span>
                        <span className="font-normal text-slate-500 dark:text-slate-400" aria-hidden>
                          {" · "}
                        </span>
                        <span className="tabular-nums">{ordersImported.toLocaleString()} orders</span>
                        <span className="font-normal text-slate-500 dark:text-slate-400" aria-hidden>
                          {" · "}
                        </span>
                        {coverageRangeLabel}
                        <span className="font-normal text-slate-500 dark:text-slate-400" aria-hidden>
                          {" · "}
                        </span>
                        {filesLoadedCount} file{filesLoadedCount !== 1 ? "s" : ""}
                        {workspaceLabelCount > 1 ? (
                          <>
                            <span className="font-normal text-slate-500 dark:text-slate-400" aria-hidden>
                              {" · "}
                            </span>
                            <span className="text-slate-700 dark:text-slate-200">
                              {workspaceLabelCount} labels
                            </span>
                          </>
                        ) : null}
                      </p>

                      {importHasRejectedFiles ? (
                        <p className="text-xs font-semibold text-red-800 dark:text-red-200">
                          Rejected files are not merged.
                        </p>
                      ) : null}

                      {importLabelMismatch ? (
                        <p
                          data-testid="imports-label-mismatch-banner"
                          role="alert"
                          className="font-semibold text-rose-900 dark:text-rose-100"
                        >
                          You mixed {importLabelMismatch.orderLabel} Orders with {importLabelMismatch.summaryLabel} Sales
                        </p>
                      ) : null}

                      {importTimeAlignment?.status === "mismatch" ? (
                        <p className="font-medium text-rose-900/90 dark:text-rose-200/90">
                          These files may cover different months or time spans. Use exports for the same period, then upload
                          again. Dashboard stays off until the dates line up.
                        </p>
                      ) : null}

                      {workspaceReady && importTimeAlignment?.status === "unknown" ? (
                        <p data-testid="imports-time-alignment-unknown" className="text-slate-700 dark:text-slate-300">
                          Make sure your Sales Summary matches your Order List before trusting these numbers. Totals are
                          visible, but the Sales Summary period isn&apos;t clear. Match it to your Order List dates before
                          you rely on these figures.
                        </p>
                      ) : null}

                      {importTimeAlignment ? (
                        <div data-testid="imports-time-alignment-lines" className="space-y-1">
                          <p className="font-medium text-slate-800 dark:text-slate-200">{importTimeAlignment.orderListLine}</p>
                          <div>
                            <p className="font-medium text-slate-800 dark:text-slate-200">
                              {importTimeAlignment.salesSummaryLine}
                              {importTimeAlignment.summaryRangeInferredFromOrders ? (
                                <span
                                  data-testid="imports-summary-dates-inferred-hint"
                                  className="ml-1.5 inline-block cursor-help align-text-bottom text-[11px] font-normal normal-case text-slate-500 underline decoration-dotted underline-offset-2 dark:text-slate-400"
                                  title="Sales summary does not include dates. Using order list date range."
                                >
                                  Why?
                                </span>
                              ) : null}
                            </p>
                          </div>
                        </div>
                      ) : null}

                      {importFinancialConsistency ? (
                        <div data-testid="imports-financial-consistency" className="space-y-1">
                          {financialConsistencyLevel === "ok" ? (
                            <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-200">
                              Batch totals (from your files)
                            </p>
                          ) : (
                            <p className={financialHeadlineClass}>{importFinancialConsistency.headline}</p>
                          )}
                          {(importFinancialConsistency.sublines ?? []).map((line) => (
                            <p
                              key={line}
                              className={
                                financialConsistencyLevel === "ok"
                                  ? "font-medium leading-snug text-emerald-800/90 dark:text-emerald-300/85"
                                  : financialBodyClass
                              }
                            >
                              {line}
                            </p>
                          ))}
                        </div>
                      ) : null}

                      {workspaceBlockedReasons.length > 0 || importHasRejectedFiles ? (
                        <ul className="list-inside list-disc space-y-1 font-medium text-slate-800 dark:text-slate-200">
                          {workspaceBlockedReasons.map((r, i) => (
                            <li key={`import-details-reason-${i}`} className="whitespace-pre-line">
                              {r}
                            </li>
                          ))}
                          {importHasRejectedFiles && workspaceBlockedReasons.length === 0 ? (
                            <li>Remove or fix rejected files.</li>
                          ) : null}
                        </ul>
                      ) : null}

                      {lastImportBatch || lastImportDate ? (
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                          Last import{" "}
                          {lastImportDate
                            ? new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(
                                lastImportDate,
                              )
                            : lastBatchTime ?? "-"}{" "}
                          · Dup names {lastImportBatch?.duplicatesSkipped ?? 0} · Rejected {lastImportBatch?.filesRejected ?? 0}
                        </p>
                      ) : null}

                      <div className="rounded-lg border border-dashed border-slate-200/90 bg-slate-50/70 p-2 dark:border-slate-600/45 dark:bg-slate-950/35">
                        <ImportsSnapshotStrip
                          gross={draftImportEvaluation.grossSales}
                          net={draftImportEvaluation.netAfterFees}
                          fees={draftImportEvaluation.fees}
                          orders={draftImportEvaluation.orders}
                          shipping={draftImportEvaluation.shipping}
                          emptyWorkspace={!workspaceReady}
                          className="!border-slate-200/50 !bg-white/80 !p-2 !shadow-none dark:!border-slate-600/50 dark:!bg-slate-900/50 [&_p]:!text-xs"
                        />
                      </div>

                      <ImportsWorkspaceTrustLine techCap={MAX_IMPORT_FILES_PER_TYPE} />
                    </div>
                  </details>

              <div className="mt-5 space-y-4 border-t border-slate-200/75 pt-5 dark:border-slate-600/45">
                {workspaceReady ? (
                  <>
                    {importSuccessFlash ? (
                      <p
                        className="text-center text-sm font-medium text-emerald-800 dark:text-emerald-200"
                        role="status"
                      >
                        Data loaded successfully
                      </p>
                    ) : null}
                    <Link
                      href="/dashboard"
                      className="mx-auto flex w-full max-w-md items-center justify-center rounded-xl bg-[color:var(--accent)] px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:opacity-95"
                    >
                      Continue to Dashboard
                    </Link>
                    {canAddAnotherGame ? (
                      <button
                        type="button"
                        data-testid="imports-add-another-game-button"
                        onClick={() => handleAddAnotherGame()}
                        className="mx-auto flex w-full max-w-md items-center justify-center rounded-xl border border-slate-300/90 bg-white px-6 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                      >
                        Save &amp; continue
                      </button>
                    ) : null}
                    <button
                      type="button"
                      onClick={resetAll}
                      data-testid="imports-reset-button"
                      className="mx-auto flex w-full max-w-md items-center justify-center rounded-xl border border-slate-300/90 bg-white px-6 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                    >
                      Reset imports
                    </button>
                    <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-2 text-sm">
                      <Link
                        href="/trends"
                        className="font-medium text-slate-600 underline-offset-2 hover:text-slate-900 hover:underline dark:text-slate-400 dark:hover:text-slate-200"
                      >
                        View Trends
                      </Link>
                    </div>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={resetAll}
                    data-testid="imports-reset-button"
                    className="mx-auto flex w-full max-w-md items-center justify-center rounded-xl border border-slate-300/90 bg-white px-6 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                  >
                    Reset imports
                  </button>
                )}
              </div>
                </>
              ) : null}
            </Card>
          </motion.div>

            {(orderFilesPresentButUnmapped || summaryFilesPresentButUnmapped) && hasFiles ? (
              <div className="mt-2 space-y-2.5">
                <details className="rounded-lg border border-amber-200/90 bg-amber-50/95 px-3 py-2 text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-100">
                  <summary className="cursor-pointer text-xs font-semibold outline-none">Column detail</summary>
                  <div className="mt-2 space-y-1 text-xs leading-relaxed opacity-95">
                    {UNMAPPED_COLUMN_WARNING_LINES.map((line) => (
                      <p key={line}>{line}</p>
                    ))}
                  </div>
                </details>
              </div>
            ) : null}
          </section>
        ) : null}

        {savedBatchSummaries.length > 0 ? (
          <section
            id="imports-saved-batches-section"
            aria-labelledby="imports-session-batches-heading"
            className="space-y-2.5 scroll-mt-4 rounded-2xl border-2 border-emerald-200/70 bg-gradient-to-b from-emerald-50/90 via-slate-50/80 to-slate-100/60 p-3.5 shadow-[0_2px_12px_-4px_rgba(16,185,129,0.25)] dark:border-emerald-900/50 dark:from-emerald-950/40 dark:via-slate-950/80 dark:to-slate-900/90 dark:shadow-emerald-950/20 sm:p-4"
          >
            <h2
              id="imports-session-batches-heading"
              className="text-sm font-bold uppercase tracking-wide text-emerald-950 dark:text-emerald-100"
            >
              Saved batches
            </h2>
            <ul className="space-y-2.5 rounded-xl border border-emerald-200/50 bg-white/80 p-2 dark:border-emerald-900/40 dark:bg-slate-900/60" data-testid="imports-session-batch-list">
              {savedBatchSummaries.map(({ batch, status, summary }) => (
                <li
                  key={batch.id}
                  id={`imports-saved-batch-${batch.id}`}
                  className={`rounded-xl border bg-white px-3 py-3 shadow-sm transition-[box-shadow,ring] duration-500 dark:bg-slate-950/85 ${
                    highlightSavedBatchId === batch.id
                      ? "border-emerald-400/90 ring-2 ring-emerald-400/70 ring-offset-2 ring-offset-emerald-50 dark:border-emerald-500/70 dark:ring-emerald-400/50 dark:ring-offset-slate-900"
                      : "border-emerald-100/90 dark:border-emerald-900/35"
                  }`}
                >
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="text-sm font-semibold text-slate-900 dark:text-slate-50">
                        <span>{batch.label}</span>
                        <span className="mx-1.5 text-slate-400 dark:text-slate-500" aria-hidden>
                          ·
                        </span>
                        <span
                          className={
                            status === "ready"
                              ? "text-emerald-700 dark:text-emerald-300"
                              : status === "review"
                                ? "text-amber-800 dark:text-amber-200"
                                : "text-rose-700 dark:text-rose-300"
                          }
                        >
                          {importBatchStatusTitle(status)}
                        </span>
                      </p>
                      <p className="mt-0.5 text-[11px] text-slate-600 dark:text-slate-400">
                        {summary.orders.toLocaleString()} orders · {summary.coverageLabel}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <details className="relative">
                        <summary className="cursor-pointer list-none rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-slate-800 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800">
                          View details
                        </summary>
                        <div className="absolute right-0 z-20 mt-1 w-[min(92vw,20rem)] rounded-lg border border-slate-200 bg-white p-3 text-[11px] shadow-lg dark:border-slate-600 dark:bg-slate-900">
                          {!summary.workspaceReady ? (
                            <ul className="list-inside list-disc space-y-1 text-slate-700 dark:text-slate-300">
                              {(summary.workspaceGate.reasons.length
                                ? summary.workspaceGate.reasons
                                : ["Workspace not ready"]
                              ).map((r) => (
                                <li key={r}>{r}</li>
                              ))}
                            </ul>
                          ) : (
                            <div className="space-y-2 text-slate-700 dark:text-slate-300">
                              {summary.importTimeAlignment ? (
                                <div>
                                  <p className="font-semibold text-slate-900 dark:text-slate-100">Time alignment</p>
                                  <p>{summary.importTimeAlignment.orderListLine}</p>
                                  <p>{summary.importTimeAlignment.salesSummaryLine}</p>
                                </div>
                              ) : null}
                              {summary.importFinancialConsistency ? (
                                <div>
                                  <p className="font-semibold text-slate-900 dark:text-slate-100">Totals check</p>
                                  <p>{summary.importFinancialConsistency.headline}</p>
                                  <ul className="mt-1 list-inside list-disc">
                                    {(summary.importFinancialConsistency.sublines ?? []).map((line) => (
                                      <li key={line}>{line}</li>
                                    ))}
                                  </ul>
                                </div>
                              ) : null}
                              {summary.netAfterFees != null ? (
                                <p className="font-medium tabular-nums text-slate-800 dark:text-slate-200">
                                  Net after fees: {formatImportSessionUsd(summary.netAfterFees)}
                                </p>
                              ) : null}
                            </div>
                          )}
                          <p className="mt-2 border-t border-slate-100 pt-2 text-slate-500 dark:border-slate-700 dark:text-slate-400">
                            {batch.orderImports.length} order file
                            {batch.orderImports.length !== 1 ? "s" : ""} · {batch.summaryImports.length} summary file
                            {batch.summaryImports.length !== 1 ? "s" : ""}
                          </p>
                        </div>
                      </details>
                      <button
                        type="button"
                        onClick={() => replaceSessionBatchWithDraft(batch.id)}
                        className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-slate-800 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
                      >
                        Replace files
                      </button>
                      <button
                        type="button"
                        onClick={() => removeSessionBatch(batch.id)}
                        className="rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-[11px] font-semibold text-rose-900 hover:bg-rose-100 dark:border-rose-900/50 dark:bg-rose-950/60 dark:text-rose-100 dark:hover:bg-rose-950/90"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {sessionCombinedTotals ? (
          <details className="rounded-md border border-slate-200/50 bg-slate-50/40 px-2 py-1 text-slate-500 opacity-[0.82] dark:border-slate-800/60 dark:bg-slate-950/25 dark:text-slate-500">
            <summary className="cursor-pointer list-none text-[10px] font-medium outline-none [&::-webkit-details-marker]:hidden">
              Combined totals (session)
            </summary>
            <section
              aria-labelledby="imports-combined-heading"
              className="mt-2 rounded-lg border border-slate-200/45 bg-white/70 p-2 dark:border-slate-700/40 dark:bg-slate-900/50 sm:p-2.5"
            >
              <h2 id="imports-combined-heading" className="sr-only">
                Combined imported totals
              </h2>
              <dl className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
                <div className="rounded border border-slate-200/70 bg-white/80 px-2 py-1.5 dark:border-slate-700/50 dark:bg-slate-950/40">
                  <dt className="text-[9px] font-medium uppercase tracking-wide text-slate-500">Gross</dt>
                  <dd className="mt-0.5 text-xs font-semibold tabular-nums text-slate-800 dark:text-slate-100">
                    {formatImportSessionUsd(sessionCombinedTotals.grossSales)}
                  </dd>
                </div>
                <div className="rounded border border-slate-200/70 bg-white/80 px-2 py-1.5 dark:border-slate-700/50 dark:bg-slate-950/40">
                  <dt className="text-[9px] font-medium uppercase tracking-wide text-slate-500">Net</dt>
                  <dd className="mt-0.5 text-xs font-semibold tabular-nums text-slate-800 dark:text-slate-100">
                    {formatImportSessionUsd(sessionCombinedTotals.netAfterFees)}
                  </dd>
                </div>
                <div className="rounded border border-slate-200/70 bg-white/80 px-2 py-1.5 dark:border-slate-700/50 dark:bg-slate-950/40">
                  <dt className="text-[9px] font-medium uppercase tracking-wide text-slate-500">Fees</dt>
                  <dd className="mt-0.5 text-xs font-semibold tabular-nums text-slate-800 dark:text-slate-100">
                    {formatImportSessionUsd(sessionCombinedTotals.fees)}
                  </dd>
                </div>
                <div className="rounded border border-slate-200/70 bg-white/80 px-2 py-1.5 dark:border-slate-700/50 dark:bg-slate-950/40">
                  <dt className="text-[9px] font-medium uppercase tracking-wide text-slate-500">Orders</dt>
                  <dd className="mt-0.5 text-xs font-semibold tabular-nums text-slate-800 dark:text-slate-100">
                    {sessionCombinedTotals.orders}
                  </dd>
                </div>
                <div className="rounded border border-slate-200/70 bg-white/80 px-2 py-1.5 dark:border-slate-700/50 dark:bg-slate-950/40">
                  <dt className="text-[9px] font-medium uppercase tracking-wide text-slate-500">Shipping</dt>
                  <dd className="mt-0.5 text-xs font-semibold tabular-nums text-slate-800 dark:text-slate-100">
                    {formatImportSessionUsd(sessionCombinedTotals.shipping)}
                  </dd>
                </div>
              </dl>
            </section>
          </details>
        ) : null}

      </div>
    </PageShell>
  );
}
