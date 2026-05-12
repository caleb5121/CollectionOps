"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type DragEvent,
} from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import PageShell from "../../../components/PageShell";
import { CARDOPS_IMPORT_STORAGE_KEY, useData, type ImportChunk } from "../../../components/DataProvider";
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
import FirstImportHelpCard from "../../../components/imports/FirstImportHelpCard";
import { ImportsSnapshotStrip } from "../../../components/imports/ImportsSnapshotStrip";
import { UNMAPPED_COLUMN_WARNING_LINES, formatImportFileRejectionMessage } from "../../../lib/importFormatCopy";
import type { ImportBatchStatus } from "../../../lib/importSessionBatch";
import type { CrossFileFinancialConsistency } from "../../../lib/crossFileFinancialCheck";
import type { ImportTimeAlignment } from "../../../lib/crossFileTimeAlignment";
import type { ImportLabelMismatch } from "../../../lib/importHardening";
import { useAuth } from "../../../components/AuthProvider";
import { upsertCurrentUserStoreData } from "../../../lib/supabase/userStoreData";
import {
  IconCalendarImport,
  IconCloudUpload,
  IconCsvBadge,
  IconOrderListSlot,
  IconSalesSummarySlot,
  ImportPageHeroIcon,
  ImportsFlowArrow,
} from "../../../components/imports/ImportsPageVisuals";

const RECOMMENDED_MAX_FILES_UI = 12;
const IMPORT_GAME_STORAGE_KEY = "cardops-import-selected-game";
const IMPORT_GAME_CUSTOM_STORAGE_KEY = "cardops-import-custom-label";
const DEMO_SANDBOX_SESSION_KEY = "cardops-demo-sandbox";
const DEMO_BACKUP_IMPORT_STATE_KEY = "cardops-demo-backup-import-state";

const easeImports = [0.23, 1, 0.32, 1] as const;

function getImportsGuideStep(
  isDemoMode: boolean,
  hasFiles: boolean,
  orderCount: number,
  summaryCount: number,
): 1 | 2 | 3 {
  if (isDemoMode && !hasFiles) return 1;
  if (orderCount === 0 || summaryCount === 0) return 2;
  return 3;
}

const IMPORTS_GUIDE_DEMO_LABELS: Record<1 | 2, string> = {
  1: "Choose a demo month",
  2: "Review and open your dashboard",
};

/** Step indicator for demo mode only (`?demo=1`). Real imports use a single upload + review layout without numbered steps. */
function ImportsGuideProgress({ guideStep }: { guideStep: 1 | 2 | 3 }) {
  const reduceMotion = useReducedMotion();
  const totalSteps = 2;
  const displayStep: 1 | 2 = guideStep === 1 ? 1 : 2;
  const label = IMPORTS_GUIDE_DEMO_LABELS[displayStep];
  const steps = [1, 2] as const;

  return (
    <motion.div
      layout
      className="rounded-xl border border-stone-200/85 bg-[var(--surface-muted)] px-4 py-3 shadow-sm dark:border-stone-800/75 dark:bg-zinc-900/40 sm:px-5 sm:py-3.5"
      transition={{ layout: { duration: reduceMotion ? 0 : 0.35, ease: easeImports }}}
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-[0.6875rem] font-medium uppercase tracking-[0.12em] text-[color:var(--foreground-muted)]">
          Your progress
        </p>
        <motion.p
          key={`${displayStep}-${label}`}
          initial={reduceMotion ? false : { opacity: 0.65, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: easeImports }}
          className="text-sm font-semibold text-[color:var(--foreground)] sm:text-right"
        >
          Step {displayStep} of {totalSteps} · {label}
        </motion.p>
      </div>
      <ol className="mt-3 flex w-full items-center gap-1.5" aria-label="Import steps">
        {steps.map((n, i) => {
          const isCurrent = n === displayStep;
          const isDone = n < displayStep;
          return (
            <li key={n} className="flex min-w-0 flex-1 items-center gap-1.5">
              {i > 0 ? (
                <span
                  className={`h-px min-w-[0.5rem] flex-1 origin-center rounded-full transition-[background-color,transform] duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] ${
                    isDone
                      ? "bg-[color:color-mix(in_oklab,var(--warm-gold)_70%,var(--accent))] scale-y-[1.35] dark:bg-[color:color-mix(in_oklab,var(--warm-gold)_55%,var(--accent))]"
                      : "bg-stone-200/90 dark:bg-stone-700/80"
                  }`}
                  aria-hidden
                />
              ) : null}
              <motion.span
                layout
                className={`relative flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-bold tabular-nums ${
                  isCurrent
                    ? "bg-[color:var(--accent)] text-white"
                    : isDone
                      ? "bg-[color:var(--warm-gold)] text-[color:var(--foreground)] shadow-[0_2px_10px_-4px_rgba(212,165,116,0.45)]"
                      : "border border-stone-300/90 bg-[var(--surface-raised)] text-stone-500 dark:border-stone-600 dark:bg-zinc-950/50 dark:text-stone-400"
                }`}
                animate={
                  reduceMotion
                    ? {}
                    : {
                        scale: isCurrent ? 1.08 : 1,
                        boxShadow: isCurrent
                          ? "0 0 0 3px color-mix(in oklab, var(--accent) 28%, transparent), 0 6px 20px -6px color-mix(in oklab, var(--accent) 45%, transparent)"
                          : isDone
                            ? "0 2px 12px -4px color-mix(in oklab, var(--warm-gold) 40%, transparent)"
                            : "0 0 0 0 transparent",
                      }
                }
                transition={{ type: "spring", stiffness: 420, damping: 26 }}
              >
                <AnimatePresence mode="popLayout" initial={false}>
                  {isDone ? (
                    <motion.span
                      key="done"
                      initial={reduceMotion ? false : { scale: 0.2, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={reduceMotion ? undefined : { scale: 0.5, opacity: 0 }}
                      transition={{ type: "spring", stiffness: 520, damping: 28 }}
                      className="inline-flex text-sm font-bold leading-none"
                      aria-hidden
                    >
                      ✓
                    </motion.span>
                  ) : (
                    <motion.span key="num" initial={false} exit={{ opacity: 0 }} className="inline-flex">
                      {n}
                    </motion.span>
                  )}
                </AnimatePresence>
              </motion.span>
            </li>
          );
        })}
      </ol>
    </motion.div>
  );
}

const primaryCtaClass =
  "inline-flex items-center justify-center rounded-lg bg-[color:var(--accent)] px-6 py-3 text-sm font-semibold text-white shadow-[0_2px_6px_rgba(26,155,127,0.32),0_8px_22px_-6px_var(--accent-glow)] transition-[transform,background-color,box-shadow,filter] duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] hover:bg-[color:var(--accent-hover)] hover:brightness-[1.02] active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-45 dark:shadow-[0_4px_18px_-4px_var(--accent-glow)]";

function LockIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="currentColor" aria-hidden>
      <path
        fillRule="evenodd"
        d="M10 1a4 4 0 0 0-4 4v2H5a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-1V5a4 4 0 0 0-4-4Zm2 6V5a2 2 0 1 0-4 0v2h4Z"
        clipRule="evenodd"
      />
    </svg>
  );
}

const secondaryCtaClass =
  "inline-flex items-center justify-center rounded-lg border border-stone-300/90 bg-[var(--surface-raised)] px-5 py-2.5 text-sm font-semibold text-stone-800 shadow-sm transition-[transform,background-color] duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] hover:bg-stone-100/90 active:scale-[0.97] dark:border-stone-600 dark:bg-zinc-900 dark:text-stone-200 dark:hover:bg-zinc-800";

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

/** Reserved import label for bundled demo CSVs only (never hydrate into normal Imports). */
const DEMO_GAME_LABEL = "Demo Data";

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

function isDemoGameLabelPair(choice: ImportGameId | "", custom: string): boolean {
  return choice === "Other" && custom.trim() === DEMO_GAME_LABEL;
}

function purgeDemoGameLabelStorage(): void {
  if (typeof window === "undefined") return;
  try {
    const s = localStorage.getItem(IMPORT_GAME_STORAGE_KEY);
    const c = localStorage.getItem(IMPORT_GAME_CUSTOM_STORAGE_KEY) ?? "";
    if (isDemoGameLabelPair(s as ImportGameId | "", c)) {
      localStorage.removeItem(IMPORT_GAME_STORAGE_KEY);
      localStorage.removeItem(IMPORT_GAME_CUSTOM_STORAGE_KEY);
    }
  } catch {
    /* ignore */
  }
}

function backupRealImportStateForDemo(): void {
  if (typeof window === "undefined") return;
  try {
    if (sessionStorage.getItem(DEMO_BACKUP_IMPORT_STATE_KEY) !== null) return;
    const raw = localStorage.getItem(CARDOPS_IMPORT_STORAGE_KEY);
    sessionStorage.setItem(DEMO_BACKUP_IMPORT_STATE_KEY, raw ?? "__empty__");
  } catch {
    /* ignore */
  }
}

function restoreRealImportStateAfterDemo(): void {
  if (typeof window === "undefined") return;
  try {
    const snap = sessionStorage.getItem(DEMO_BACKUP_IMPORT_STATE_KEY);
    if (snap === null) return;
    if (snap === "__empty__") {
      localStorage.removeItem(CARDOPS_IMPORT_STORAGE_KEY);
    } else {
      localStorage.setItem(CARDOPS_IMPORT_STORAGE_KEY, snap);
    }
    sessionStorage.removeItem(DEMO_BACKUP_IMPORT_STATE_KEY);
  } catch {
    /* ignore */
  }
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
    <div className="space-y-2.5 text-[0.8125rem] leading-snug">
      <div>
        <p className="font-semibold text-zinc-900 dark:text-zinc-50">File limits</p>
        <p className="text-zinc-600 dark:text-zinc-300">
          Up to ~{RECOMMENDED_MAX_FILES_UI} files per type recommended · hard cap {techCap}.
        </p>
      </div>
      <div>
        <p className="font-semibold text-zinc-900 dark:text-zinc-50">Duplicate handling</p>
        <p className="text-zinc-600 dark:text-zinc-300">
          Same filename again → not added; you&apos;ll see a short notice by Add CSV. Same contents under a different name
          → warning on the file row; rows still merge unless rejected for another reason.
        </p>
      </div>
      <div>
        <p className="font-semibold text-zinc-900 dark:text-zinc-50">File type</p>
        <p className="text-zinc-600 dark:text-zinc-300">
          Type is detected from column headers. Wrong slot (e.g. Sales Summary CSV under Order List) → Rejected.
        </p>
      </div>
      <div>
        <p className="font-semibold text-zinc-900 dark:text-zinc-50">Rows</p>
        <p className="text-zinc-600 dark:text-zinc-300">Invalid rows are skipped during merge.</p>
      </div>
    </div>
  );
}

function UploadCardInfoTooltip({ techCap }: { techCap: number }) {
  return (
    <InfoTooltip
      aria-label="Import rules: limits, duplicates, and file type"
      marker={<span className="text-sm leading-none text-zinc-500 dark:text-zinc-400">ℹ️</span>}
    >
      <ImportRulesTooltipBody techCap={techCap} />
    </InfoTooltip>
  );
}

/** Secondary trust line inside Workspace card: Details tooltip includes invalid-rows note. */
function ImportsWorkspaceTrustLine({ techCap }: { techCap: number }) {
  return (
    <div className="flex flex-wrap items-center gap-x-1.5 text-[0.625rem] leading-snug text-zinc-500 dark:text-zinc-500">
      <InfoTooltip
        aria-label="Import rules"
        marker={
          <span className="cursor-pointer font-medium text-zinc-600 underline underline-offset-2 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200">
            Import rules
          </span>
        }
      >
        <ImportRulesTooltipBody techCap={techCap} />
      </InfoTooltip>
      <span className="text-zinc-400 dark:text-zinc-600" aria-hidden>
        ·
      </span>
      <Link
        href="/help/faq"
        className="font-medium text-zinc-600 underline underline-offset-2 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200"
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
  titleTooltip,
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
  /** Optional (?) tooltip next to the slot title. */
  titleTooltip?: string;
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
  const reduceMotionSlot = useReducedMotion();
  const [dragOver, setDragOver] = useState(false);
  const dragDepthRef = useRef(0);
  const statusLine = imports.length === 0 ? helperEmpty : slotCardStatusLine(imports);
  const isRejectedLine = imports.length > 0 && statusLine.startsWith("Rejected");
  const acceptedFresh = imports.length > 0 && statusLine.startsWith("Accepted");
  const pairClash = Boolean(labelPairMismatch && imports.length > 0 && !isRejectedLine);
  const accentBar = kind === "order" ? "border-l-zinc-400 dark:border-l-zinc-500" : "border-l-[color:var(--accent)]";
  const nextHighlight = Boolean(nextStepHint) && !pairClash;
  const SlotIcon = kind === "order" ? IconOrderListSlot : IconSalesSummarySlot;

  const onZoneDragEnter = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!uploadsEnabled) return;
    dragDepthRef.current += 1;
    setDragOver(true);
  };
  const onZoneDragLeave = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);
    if (dragDepthRef.current === 0) setDragOver(false);
  };
  const onZoneDragOver = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (uploadsEnabled) e.dataTransfer.dropEffect = "copy";
  };
  const onZoneDrop = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragDepthRef.current = 0;
    setDragOver(false);
    if (!uploadsEnabled) return;
    const list = e.dataTransfer.files;
    if (list?.length) onFiles(list);
  };

  return (
    <section
      aria-label={regionLabel}
      className="flex h-full min-h-[17rem] flex-1 flex-col sm:min-h-[18rem]"
    >
      <Card
        data-imports-next-highlight={nextHighlight ? "true" : undefined}
        data-imports-label-pair-mismatch={pairClash ? "true" : undefined}
        className={`group/upload flex h-full min-h-[17rem] flex-col !p-0 overflow-hidden border border-stone-200/85 transition-[border-color,box-shadow] duration-300 dark:border-stone-800/75 sm:min-h-[18rem] ${!uploadsEnabled ? "opacity-70" : ""} ${
          pairClash
            ? "ring-2 ring-rose-400/80 ring-offset-2 ring-offset-white dark:ring-rose-500/50 dark:ring-offset-zinc-950"
            : nextHighlight
              ? "ring-2 ring-amber-400/75 ring-offset-2 ring-offset-white dark:ring-amber-500/45 dark:ring-offset-zinc-950"
              : "hover:border-[color:var(--accent)]/35 hover:shadow-[0_10px_36px_-16px_color-mix(in_oklab,var(--accent)_25%,transparent),0_0_0_1px_color-mix(in_oklab,var(--accent)_14%,transparent)] dark:hover:border-[color:var(--accent)]/28"
        }`}
      >
        <div
          className={`relative border-b border-stone-200/80 bg-[color-mix(in_oklab,var(--surface-muted)_42%,white)] px-4 py-3.5 dark:border-stone-800/70 dark:bg-zinc-900/45 sm:px-5 sm:py-4 ${accentBar} border-l-[3px]`}
        >
          <div className="relative flex items-start justify-between gap-3">
            <div className="flex min-w-0 gap-3">
              <span className="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-xl border border-stone-200/90 bg-white text-[color:var(--accent)] shadow-sm dark:border-zinc-600/80 dark:bg-zinc-950/60 dark:text-[color:var(--accent)]">
                <SlotIcon className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-1.5">
                  <h3 className="text-[0.9375rem] font-semibold leading-tight tracking-[-0.02em] text-zinc-900 dark:text-zinc-50 sm:text-base">
                    {title}
                  </h3>
                  {titleTooltip ? (
                    <InfoTooltip text={titleTooltip} aria-label={`Help: ${title}`} />
                  ) : null}
                </div>
                <p className="mt-1.5 text-[0.8125rem] leading-snug text-zinc-600 dark:text-zinc-400">{titleDescription}</p>
              </div>
            </div>
            <div className="shrink-0 rounded-md border border-stone-200/85 bg-white p-0.5 dark:border-zinc-600 dark:bg-zinc-800">
              <UploadCardInfoTooltip techCap={techCap} />
            </div>
          </div>
        </div>

        <div
          className={`flex min-h-0 flex-1 flex-col bg-[color:color-mix(in_oklab,var(--surface-muted)_78%,white)] px-4 py-4 dark:bg-zinc-950/40 sm:px-5 sm:py-4 ${dragOver && uploadsEnabled ? "bg-[color:color-mix(in_oklab,var(--accent-soft)_55%,var(--surface-muted))] dark:bg-[color-mix(in_oklab,var(--accent-soft)_22%,var(--surface-muted))]" : ""}`}
          onDragEnter={onZoneDragEnter}
          onDragLeave={onZoneDragLeave}
          onDragOver={onZoneDragOver}
          onDrop={onZoneDrop}
        >
        {nextStepHint ? (
          <p className="mb-3 rounded-lg border border-amber-200/90 bg-amber-50/80 px-3 py-2 text-[0.8125rem] font-semibold text-amber-950 dark:border-amber-800/45 dark:bg-amber-950/25 dark:text-amber-100">
            {nextStepHint}
          </p>
        ) : null}

        {pairedSlotLabel && pairClash ? (
          <p
            className="mb-2 rounded-lg border border-rose-200/90 bg-rose-50/80 px-3 py-2 text-[0.8125rem] font-semibold text-rose-950 dark:border-rose-800/45 dark:bg-rose-950/25 dark:text-rose-100"
            data-testid={kind === "order" ? "upload-order-paired-label" : "upload-summary-paired-label"}
          >
            Paired file is {pairedSlotLabel}
          </p>
        ) : null}

        <motion.p
          key={statusLine}
          data-testid={statusLineTestId}
          initial={
            reduceMotionSlot || !acceptedFresh ? false : { backgroundColor: "color-mix(in oklab, rgb(16 185 129) 18%, transparent)" }
          }
          animate={{ backgroundColor: "transparent" }}
          transition={{ duration: 1.15, ease: easeImports }}
          className={`min-h-[2.75rem] rounded-md px-1.5 py-1 text-[0.8125rem] leading-snug sm:text-[0.8125rem] ${
            imports.length === 0
              ? "text-zinc-600 dark:text-zinc-400"
              : isRejectedLine
                ? "font-medium text-rose-800 dark:text-rose-200"
                : pairClash
                  ? "font-medium text-rose-900 dark:text-rose-100"
                  : "font-medium text-emerald-800 dark:text-emerald-200"
          }`}
        >
          {statusLine}
        </motion.p>

        {duplicateFilenameNotice ? (
          <div
            key={duplicateFilenameNotice.noticeId}
            role="alert"
            data-testid={kind === "order" ? "upload-order-duplicate-notice" : "upload-summary-duplicate-notice"}
            className="mt-3 rounded-lg border border-amber-200/90 bg-amber-50/90 px-3 py-2.5 shadow-sm dark:border-amber-800/40 dark:bg-amber-950/25"
          >
            <p className="text-[0.8125rem] font-semibold text-amber-950 dark:text-amber-50">
              {duplicateFilenameNotice.skippedCount > 1
                ? "These files are already uploaded"
                : "This file is already uploaded"}
            </p>
            <p className="mt-1 text-[0.6875rem] font-medium leading-snug text-amber-900/90 dark:text-amber-200/90">
              Each file can only be added once
            </p>
          </div>
        ) : null}

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <label className={`inline-flex items-center gap-2 ${!uploadsEnabled ? "cursor-not-allowed" : "cursor-pointer"}`}>
            <span
              className={`inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-[0.9375rem] font-semibold transition-[transform,background-color,box-shadow] duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] active:scale-[0.97] ${
                uploadsEnabled
                  ? "bg-zinc-900 text-white shadow-sm hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
                  : "cursor-not-allowed bg-zinc-200 text-zinc-500 shadow-none dark:bg-zinc-800 dark:text-zinc-500"
              }`}
            >
              <IconCsvBadge className="h-4 w-4 shrink-0 opacity-90" />
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
          <ul className="mt-4 max-h-56 min-h-0 flex-1 space-y-2 overflow-y-auto rounded-lg border border-stone-200/85 bg-zinc-50/50 p-2 dark:border-stone-800/70 dark:bg-zinc-950/40">
            {imports.map((imp) => (
              <motion.li
                key={imp.id}
                layout={!reduceMotionSlot}
                initial={reduceMotionSlot ? false : { opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, ease: easeImports }}
                className="rounded-md border border-stone-200/80 bg-white px-2.5 py-2 shadow-sm dark:border-stone-700/65 dark:bg-zinc-900/55"
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="flex min-w-0 items-center gap-2 truncate text-[0.8125rem] font-semibold text-zinc-900 dark:text-zinc-100" title={imp.fileName}>
                    <IconCsvBadge className="h-4 w-4 shrink-0 text-emerald-700 dark:text-emerald-400" />
                    <span className="truncate">{imp.fileName}</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => onRemove(imp.id)}
                    className="shrink-0 rounded px-1.5 py-0.5 text-[0.625rem] font-medium text-zinc-500 underline-offset-2 transition-colors duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] hover:bg-zinc-100 hover:text-rose-700 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-rose-400"
                  >
                    Remove file
                  </button>
                </div>
                {imp.gameLabel ? (
                  <p className="mt-0.5 text-[0.625rem] text-zinc-500 dark:text-zinc-500">Label: {imp.gameLabel}</p>
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
              </motion.li>
            ))}
          </ul>
        ) : (
          <div
            className={`mt-4 flex min-h-[6.5rem] flex-1 flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-5 text-center transition-[border-color,background-color,transform,box-shadow] duration-300 ease-[cubic-bezier(0.23,1,0.32,1)] ${
              dragOver && uploadsEnabled
                ? "border-[color:var(--accent)]/55 bg-[color-mix(in_oklab,var(--accent-soft)_75%,white)] shadow-[0_0_0_3px_color-mix(in_oklab,var(--accent)_12%,transparent)] dark:border-[color:var(--accent)]/45 dark:bg-[color-mix(in_oklab,var(--accent-soft)_18%,var(--surface-muted))]"
                : "border-stone-300/80 bg-[color-mix(in_oklab,var(--surface-muted)_35%,transparent)] dark:border-zinc-600/55 dark:bg-zinc-900/35"
            } ${!uploadsEnabled ? "opacity-60" : ""}`}
          >
            <IconCloudUpload
              className={`h-9 w-9 shrink-0 ${dragOver && uploadsEnabled ? "text-[color:var(--accent)]" : "text-[color:var(--accent)]/70"}`}
            />
            <p className="text-[0.8125rem] font-semibold text-zinc-700 dark:text-zinc-200">
              {uploadsEnabled ? "Drop CSV files here" : "Choose a label to enable uploads"}
            </p>
            <p className="max-w-[14rem] text-[0.6875rem] font-medium leading-snug text-zinc-500 dark:text-zinc-400">
              {uploadsEnabled ? "Or use Add CSV - same files, your choice." : null}
            </p>
          </div>
        )}
        </div>
      </Card>
    </section>
  );
}

/** Built-in demo CSV pairs under /public/demo-data (loaded only in ?demo=1 mode). */
const DEMO_OPTIONS = [
  {
    id: "low" as const,
    label: "Low Margin Month",
    orderFile: "low_orders.csv",
    salesFile: "low_sales.csv",
  },
  {
    id: "standard" as const,
    label: "Standard Store Month",
    orderFile: "medium_orders.csv",
    salesFile: "medium_sales.csv",
  },
  {
    id: "peak" as const,
    label: "High Volume Month",
    orderFile: "high_orders.csv",
    salesFile: "high_sales.csv",
  },
  {
    id: "growth" as const,
    label: "Growth Month",
    orderFile: "high_orders.csv",
    salesFile: "high_sales.csv",
  },
] as const;

type DemoSetId = (typeof DEMO_OPTIONS)[number]["id"] | "";
const DEMO_LOADING_LINES = ["Loading sample orders...", "Calculating fees...", "Building dashboard..."] as const;

export default function DataPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const isDemoMode = searchParams.get("demo") === "1";
  const reduceMotionPage = useReducedMotion();
  const { user } = useAuth();

  const {
    orderImports,
    summaryImports,
    error,
    handleFile,
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
    derived,
    estimatedNet,
    costsForNetDisplay,
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
  const [demoSetId, setDemoSetId] = useState<DemoSetId>("");
  const [demoLoading, setDemoLoading] = useState(false);
  const [demoLoadingStep, setDemoLoadingStep] = useState(0);
  const demoLoadInFlightRef = useRef(false);
  const demoSessionInitializedRef = useRef(false);
  const prevDemoModeRef = useRef(false);
  const lastDemoLoadKeyRef = useRef<(typeof DEMO_OPTIONS)[number]["id"] | null>(null);
  const skipImportFlashHydration = useRef(true);
  const prevLastImportMs = useRef<number | null>(null);

  const handleDemoLoad = useCallback(async () => {
    if (!isDemoMode || demoSetId === "") return;
    const meta = DEMO_OPTIONS.find((d) => d.id === demoSetId);
    if (!meta) return;
    if (demoLoadInFlightRef.current) return;
    if (
      lastDemoLoadKeyRef.current === meta.id &&
      orderImports.some((c) => c.fileName === meta.orderFile) &&
      summaryImports.some((c) => c.fileName === meta.salesFile)
    ) {
      return;
    }

    demoLoadInFlightRef.current = true;
    setDemoLoading(true);
    setDemoLoadingStep(0);
    try {
      resetAll();
      const [ordersRes, salesRes] = await Promise.all([
        fetch(`/api/demo-data/${meta.orderFile}`),
        fetch(`/api/demo-data/${meta.salesFile}`),
      ]);
      if (!ordersRes.ok || !salesRes.ok) {
        throw new Error(`Demo fetch failed (orders ${ordersRes.status}, sales ${salesRes.status})`);
      }
      const [ordersText, salesText] = await Promise.all([ordersRes.text(), salesRes.text()]);
      const gameLabel = DEMO_GAME_LABEL;
      setImportGame("Other");
      setImportGameOtherText(gameLabel);
      const orderFile = new File([ordersText], meta.orderFile, { type: "text/csv" });
      const salesFile = new File([salesText], meta.salesFile, { type: "text/csv" });
      await handleFile(orderFile, "order", { game: gameLabel });
      await handleFile(salesFile, "summary", { game: gameLabel });
      lastDemoLoadKeyRef.current = meta.id;
    } catch (e) {
      console.error("Demo load failed:", e);
    } finally {
      demoLoadInFlightRef.current = false;
      setDemoLoading(false);
      setDemoLoadingStep(0);
    }
  }, [demoSetId, handleFile, isDemoMode, orderImports, resetAll, summaryImports]);

  useEffect(() => {
    if (!demoLoading) return;
    const id = window.setInterval(() => {
      setDemoLoadingStep((prev) => (prev < DEMO_LOADING_LINES.length - 1 ? prev + 1 : prev));
    }, 800);
    return () => window.clearInterval(id);
  }, [demoLoading]);

  const handleExitDemoMode = useCallback(() => {
    demoLoadInFlightRef.current = false;
    demoSessionInitializedRef.current = false;
    setDemoLoading(false);
    setDemoSetId("");
    setImportGame("");
    setImportGameOtherText("");
    setBatchSavedNotice(null);
    resetAll();
    purgeDemoGameLabelStorage();
    restoreRealImportStateAfterDemo();
    try {
      sessionStorage.removeItem(DEMO_SANDBOX_SESSION_KEY);
    } catch {
      /* ignore */
    }
    if (typeof window !== "undefined") {
      window.location.assign("/data");
    }
  }, [resetAll]);

  useEffect(() => {
    const wasDemoMode = prevDemoModeRef.current;
    prevDemoModeRef.current = isDemoMode;
    let hasDemoSessionFlag = false;
    try {
      hasDemoSessionFlag = sessionStorage.getItem(DEMO_SANDBOX_SESSION_KEY) === "1";
      if (isDemoMode) sessionStorage.setItem(DEMO_SANDBOX_SESSION_KEY, "1");
      else sessionStorage.removeItem(DEMO_SANDBOX_SESSION_KEY);
    } catch {
      /* ignore */
    }

    if (!isDemoMode && (wasDemoMode || hasDemoSessionFlag)) {
      demoLoadInFlightRef.current = false;
      demoSessionInitializedRef.current = false;
      restoreRealImportStateAfterDemo();
      purgeDemoGameLabelStorage();
      if (typeof window !== "undefined") {
        window.location.assign("/data");
      }
    }
  }, [isDemoMode]);

  useEffect(() => {
    if (!isDemoMode) {
      demoSessionInitializedRef.current = false;
      return;
    }
    if (demoSessionInitializedRef.current) return;
    demoSessionInitializedRef.current = true;
    backupRealImportStateForDemo();
    demoLoadInFlightRef.current = false;
    setDemoLoading(false);
    setDemoSetId("");
    setImportGame("Other");
    setImportGameOtherText(DEMO_GAME_LABEL);
    setBatchSavedNotice(null);
    resetAll();
    purgeDemoGameLabelStorage();
  }, [isDemoMode, resetAll]);

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
      if (!isDemoMode) {
        purgeDemoGameLabelStorage();
        const { choice, custom } = readStoredImportLabel();
        setImportGame(choice);
        setImportGameOtherText(choice === "Other" ? custom : "");
        setGameHydrated(true);
        return;
      }

      const { choice, custom } = readStoredImportLabel();
      const noDraftFiles = orderImports.length === 0 && summaryImports.length === 0;
      if (isDemoGameLabelPair(choice, custom) && noDraftFiles) {
        purgeDemoGameLabelStorage();
        setImportGame("");
        setImportGameOtherText("");
        setGameHydrated(true);
        return;
      }

      setImportGame((prev) => (prev !== "" ? prev : choice));
      setImportGameOtherText((prev) => {
        if (prev !== "") return prev;
        return choice === "Other" ? custom : "";
      });
      setGameHydrated(true);
    });

    return () => cancelAnimationFrame(id);
  }, [isDemoMode, orderImports.length, summaryImports.length]);

  useEffect(() => {
    if (!gameHydrated || !importGame) return;
    if (!isDemoMode && isDemoGameLabelPair(importGame, importGameOtherText)) return;
    if (isDemoMode && isDemoGameLabelPair(importGame, importGameOtherText) && orderImports.length === 0 && summaryImports.length === 0) {
      return;
    }
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
  }, [importGame, importGameOtherText, gameHydrated, isDemoMode, orderImports.length, summaryImports.length]);

  const effectiveImportLabel = useMemo(() => {
    if (!importGame) return "";
    if (importGame === "Other") return importGameOtherText.trim();
    return importGame;
  }, [importGame, importGameOtherText]);

  const uploadsEnabled = Boolean(effectiveImportLabel) && !isDemoMode;

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
    "app-inset-well w-full max-w-md rounded-lg border border-stone-200/85 bg-white px-3 py-2.5 text-sm text-zinc-900 transition-[border-color,box-shadow] duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] focus:border-zinc-400 focus:outline-none focus:ring-2 focus:ring-[color:var(--accent)]/25 dark:border-stone-600/85 dark:bg-zinc-950/80 dark:text-zinc-100";

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
  const importComplete = workspaceReady && orderImports.length > 0 && summaryImports.length > 0;

  const guideStep = useMemo(
    () => getImportsGuideStep(isDemoMode, hasFiles, orderImports.length, summaryImports.length),
    [isDemoMode, hasFiles, orderImports.length, summaryImports.length],
  );

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

  const importStatusCardClass = useMemo(() => {
    switch (importStatusTone) {
      case "success":
        return "border border-stone-200/85 bg-white border-l-[3px] border-l-[color:var(--accent)] dark:border-stone-800/75 dark:bg-zinc-950/45";
      case "time_unknown":
        return "border border-amber-200/90 bg-amber-50/40 dark:border-amber-800/40 dark:bg-amber-950/20";
      case "time_mismatch":
        return "border border-rose-200/90 bg-rose-50/35 dark:border-rose-800/40 dark:bg-rose-950/20";
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

  const [savingForDashboard, setSavingForDashboard] = useState(false);

  const handleContinueToDashboard = useCallback(async () => {
    if (!workspaceReady || savingForDashboard) return;
    setSavingForDashboard(true);
    try {
      if (user) {
        await upsertCurrentUserStoreData({
          total_revenue: derived.grossSales,
          total_orders: derived.orders,
          total_costs: costsForNetDisplay ?? 0,
          total_profit: estimatedNet ?? derived.netAfterFees ?? 0,
        });
      }
      router.push("/dashboard");
    } finally {
      setSavingForDashboard(false);
    }
  }, [
    workspaceReady,
    savingForDashboard,
    user,
    derived.grossSales,
    derived.orders,
    derived.netAfterFees,
    costsForNetDisplay,
    estimatedNet,
    router,
  ]);

  const savedBatchesSection =
    savedBatchSummaries.length > 0 ? (
      <section
        id="imports-saved-batches-section"
        aria-labelledby="imports-session-batches-heading"
        className="space-y-3 scroll-mt-4 rounded-xl border border-stone-200/85 bg-zinc-50/70 p-4 shadow-sm dark:border-stone-800/75 dark:bg-zinc-900/35 sm:p-4"
      >
        <h2
          id="imports-session-batches-heading"
          className="text-[0.6875rem] font-medium uppercase tracking-[0.1em] text-zinc-600 dark:text-zinc-400"
        >
          Saved batches
        </h2>
        <ul className="space-y-2.5 rounded-lg border border-stone-200/85 bg-white p-2 shadow-sm dark:border-stone-800/70 dark:bg-zinc-950/40" data-testid="imports-session-batch-list">
          {savedBatchSummaries.map(({ batch, status, summary }) => (
            <li
              key={batch.id}
              id={`imports-saved-batch-${batch.id}`}
              className={`rounded-lg border bg-white px-3 py-3 shadow-sm transition-[box-shadow,ring] duration-300 ease-[cubic-bezier(0.23,1,0.32,1)] dark:bg-zinc-900/50 ${
                highlightSavedBatchId === batch.id
                  ? "border-[color:var(--accent)]/50 ring-2 ring-[color:var(--accent)]/30 ring-offset-2 ring-offset-white dark:border-[color:var(--accent)]/40 dark:ring-offset-zinc-950"
                  : "border-stone-200/85 dark:border-stone-700/65"
              }`}
            >
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                    <span>{batch.label}</span>
                    <span className="mx-1.5 text-zinc-400 dark:text-zinc-500" aria-hidden>
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
                  <p className="mt-0.5 text-[0.6875rem] text-zinc-600 dark:text-zinc-400">
                    {summary.orders.toLocaleString()} orders · {summary.coverageLabel}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <details className="relative">
                    <summary className="cursor-pointer list-none rounded-md border border-stone-200/85 bg-white px-2.5 py-1.5 text-[0.6875rem] font-semibold text-zinc-800 shadow-sm transition-[transform,background-color] duration-200 hover:bg-zinc-50 active:scale-[0.97] dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800">
                      View details
                    </summary>
                    <div className="absolute right-0 z-20 mt-1 w-[min(92vw,20rem)] rounded-lg border border-stone-200/85 bg-white p-3 text-[0.6875rem] shadow-md dark:border-zinc-700 dark:bg-zinc-900">
                      {!summary.workspaceReady ? (
                        <ul className="list-inside list-disc space-y-1 text-zinc-700 dark:text-zinc-300">
                          {(summary.workspaceGate.reasons.length ? summary.workspaceGate.reasons : ["Workspace not ready"]).map((r) => (
                            <li key={r}>{r}</li>
                          ))}
                        </ul>
                      ) : (
                        <div className="space-y-2 text-zinc-700 dark:text-zinc-300">
                          {summary.importTimeAlignment ? (
                            <div>
                              <p className="font-semibold text-zinc-900 dark:text-zinc-100">Time alignment</p>
                              <p>{summary.importTimeAlignment.orderListLine}</p>
                              <p>{summary.importTimeAlignment.salesSummaryLine}</p>
                            </div>
                          ) : null}
                          {summary.importFinancialConsistency ? (
                            <div>
                              <p className="font-semibold text-zinc-900 dark:text-zinc-100">Totals check</p>
                              <p>{summary.importFinancialConsistency.headline}</p>
                              <ul className="mt-1 list-inside list-disc">
                                {(summary.importFinancialConsistency.sublines ?? []).map((line) => (
                                  <li key={line}>{line}</li>
                                ))}
                              </ul>
                            </div>
                          ) : null}
                          {summary.netAfterFees != null ? (
                            <p className="font-medium tabular-nums text-zinc-800 dark:text-zinc-200">
                              Net after fees: {formatImportSessionUsd(summary.netAfterFees)}
                            </p>
                          ) : null}
                        </div>
                      )}
                      <p className="mt-2 border-t border-stone-200/75 pt-2 text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
                        {batch.orderImports.length} order file
                        {batch.orderImports.length !== 1 ? "s" : ""} · {batch.summaryImports.length} summary file
                        {batch.summaryImports.length !== 1 ? "s" : ""}
                      </p>
                    </div>
                  </details>
                  <button
                    type="button"
                    onClick={() => replaceSessionBatchWithDraft(batch.id)}
                    className="rounded-md border border-stone-200/85 bg-white px-2.5 py-1.5 text-[0.6875rem] font-semibold text-zinc-800 shadow-sm transition-[transform,background-color] duration-200 hover:bg-zinc-50 active:scale-[0.97] dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
                  >
                    Replace files
                  </button>
                  <button
                    type="button"
                    onClick={() => removeSessionBatch(batch.id)}
                    className="rounded-md border border-rose-200/90 bg-rose-50 px-2.5 py-1.5 text-[0.6875rem] font-semibold text-rose-900 shadow-sm transition-[transform,background-color] duration-200 hover:bg-rose-100 active:scale-[0.97] dark:border-rose-800/50 dark:bg-rose-950/35 dark:text-rose-100 dark:hover:bg-rose-950/55"
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
    <details className="rounded-lg border border-stone-200/85 bg-zinc-50/70 px-2 py-1.5 text-zinc-600 dark:border-stone-800/75 dark:bg-zinc-900/35 dark:text-zinc-400">
      <summary className="cursor-pointer list-none text-[0.625rem] font-medium outline-none [&::-webkit-details-marker]:hidden">
        Combined totals (session)
      </summary>
      <section
        aria-labelledby="imports-combined-heading"
        className="mt-2 rounded-lg border border-stone-200/80 bg-white p-2 shadow-sm dark:border-stone-700/55 dark:bg-zinc-950/45 sm:p-2.5"
      >
        <h2 id="imports-combined-heading" className="sr-only">
          Combined imported totals
        </h2>
        <dl className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
          <div className="rounded-md border border-stone-200/85 bg-zinc-50/80 px-2 py-1.5 dark:border-stone-700/55 dark:bg-zinc-900/40">
            <dt className="text-[0.625rem] font-medium uppercase tracking-[0.08em] text-zinc-500">Gross</dt>
            <dd className="mt-0.5 text-xs font-semibold tabular-nums text-zinc-800 dark:text-zinc-100">
              {formatImportSessionUsd(sessionCombinedTotals.grossSales)}
            </dd>
          </div>
          <div className="rounded-md border border-stone-200/85 bg-zinc-50/80 px-2 py-1.5 dark:border-stone-700/55 dark:bg-zinc-900/40">
            <dt className="text-[0.625rem] font-medium uppercase tracking-[0.08em] text-zinc-500">Net</dt>
            <dd className="mt-0.5 text-xs font-semibold tabular-nums text-zinc-800 dark:text-zinc-100">
              {formatImportSessionUsd(sessionCombinedTotals.netAfterFees)}
            </dd>
          </div>
          <div className="rounded-md border border-stone-200/85 bg-zinc-50/80 px-2 py-1.5 dark:border-stone-700/55 dark:bg-zinc-900/40">
            <dt className="text-[0.625rem] font-medium uppercase tracking-[0.08em] text-zinc-500">Fees</dt>
            <dd className="mt-0.5 text-xs font-semibold tabular-nums text-zinc-800 dark:text-zinc-100">
              {formatImportSessionUsd(sessionCombinedTotals.fees)}
            </dd>
          </div>
          <div className="rounded-md border border-stone-200/85 bg-zinc-50/80 px-2 py-1.5 dark:border-stone-700/55 dark:bg-zinc-900/40">
            <dt className="text-[0.625rem] font-medium uppercase tracking-[0.08em] text-zinc-500">Orders</dt>
            <dd className="mt-0.5 text-xs font-semibold tabular-nums text-zinc-800 dark:text-zinc-100">{sessionCombinedTotals.orders}</dd>
          </div>
          <div className="rounded-md border border-stone-200/85 bg-zinc-50/80 px-2 py-1.5 dark:border-stone-700/55 dark:bg-zinc-900/40">
            <dt className="text-[0.625rem] font-medium uppercase tracking-[0.08em] text-zinc-500">Shipping</dt>
            <dd className="mt-0.5 text-xs font-semibold tabular-nums text-zinc-800 dark:text-zinc-100">
              {formatImportSessionUsd(sessionCombinedTotals.shipping)}
            </dd>
          </div>
        </dl>
      </section>
    </details>
  ) : null;

  return (
    <PageShell maxWidth="wide-xl" contentClassName="px-6 pt-5 pb-5 sm:px-8 sm:pt-6 sm:pb-6 lg:px-10">
      <div className="space-y-4 rounded-xl border border-stone-200/85 bg-white p-4 shadow-sm dark:border-stone-800/75 dark:bg-zinc-950/35 sm:space-y-5 sm:p-5">
        <header className="flex flex-col gap-4 border-b border-stone-200/75 pb-4 dark:border-stone-800/65 sm:flex-row sm:items-start sm:gap-6">
          <div className="flex size-[3.25rem] shrink-0 items-center justify-center rounded-2xl border border-stone-200/90 bg-[color-mix(in_oklab,var(--accent-soft)_100%,transparent)] text-[color:var(--accent)] shadow-[0_4px_20px_-12px_color-mix(in_oklab,var(--accent)_35%,transparent)] dark:border-stone-700/80 dark:bg-zinc-900/55 sm:size-[3.75rem]">
            <ImportPageHeroIcon className="h-10 w-10 sm:h-11 sm:w-11" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-xl font-semibold tracking-[-0.02em] text-zinc-900 dark:text-zinc-50 sm:text-2xl">
              Import your store data
            </h2>
            {isDemoMode ? (
              <p className="mt-2 max-w-2xl text-[0.9375rem] leading-relaxed text-zinc-600 dark:text-zinc-400">
                Pick a sample month to load TCGplayer-style demo CSVs, then review and open your dashboard. Exit demo anytime
                to use your real files.
              </p>
            ) : (
              <>
                <p className="mt-2 max-w-2xl text-[0.9375rem] leading-relaxed text-zinc-600 dark:text-zinc-400">
                  Add your TCGplayer Order List and Sales Summary exports for the same time period, then review and open your
                  dashboard.
                </p>
                <p className="mt-2 max-w-2xl text-[0.8125rem] leading-relaxed text-zinc-500 dark:text-zinc-500">
                  New here?{" "}
                  <Link href="/data?demo=1" className="font-semibold text-[color:var(--accent)] underline-offset-2 hover:underline">
                    Try sample data in demo mode
                  </Link>
                  .
                </p>
              </>
            )}
          </div>
        </header>

        {isDemoMode ? <ImportsGuideProgress guideStep={guideStep} /> : null}

        {isDemoMode ? (
          <section
            id="imports-step-1"
            className="scroll-mt-24 rounded-xl border border-stone-200/85 bg-[var(--surface-muted)] p-4 shadow-sm dark:border-stone-800/75 dark:bg-zinc-900/40 sm:p-5"
            aria-labelledby="imports-try-demo-heading"
            data-testid="imports-try-demo-section"
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <h2
                id="imports-try-demo-heading"
                className="text-lg font-semibold tracking-[-0.02em] text-zinc-900 dark:text-zinc-50"
              >
                <span className="mr-2 inline-flex size-8 items-center justify-center rounded-full bg-[color:var(--accent)] text-sm font-bold text-white shadow-sm">
                  1
                </span>
                Choose a demo month
              </h2>
              <button
                type="button"
                onClick={handleExitDemoMode}
                className={secondaryCtaClass + " px-3 py-1.5 text-[0.8125rem]"}
              >
                Exit demo
              </button>
            </div>
            <p className="mt-3 max-w-2xl text-[0.9375rem] leading-relaxed text-zinc-700 dark:text-zinc-300">
              Pick a sample month - we&apos;ll load the CSVs automatically (no upload step). Use &quot;View Demo Dashboard&quot; when
              you&apos;re ready to review.
            </p>
            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
              <div className="min-w-0 flex-1 sm:max-w-md">
                <label
                  htmlFor="imports-demo-set"
                  className="mb-1.5 flex items-center gap-2 text-sm font-semibold text-zinc-900 dark:text-zinc-100"
                >
                  <span className="flex size-8 items-center justify-center rounded-lg border border-stone-200/90 bg-white text-[color:var(--accent)] shadow-sm dark:border-zinc-600/80 dark:bg-zinc-950/70">
                    <IconCalendarImport className="h-4 w-4" />
                  </span>
                  Choose a demo month
                </label>
                <p className="mb-2 text-[0.8125rem] leading-snug text-zinc-600 dark:text-zinc-400">
                  This is the main choice in the demo - labels stay fixed in step 2 so you can focus here.
                </p>
                <motion.div
                  key={demoSetId || "none"}
                  initial={false}
                  animate={
                    demoSetId && !reduceMotionPage
                      ? {
                          boxShadow: [
                            "0 0 0 0 color-mix(in oklab, var(--accent) 0%, transparent)",
                            "0 0 0 4px color-mix(in oklab, var(--accent) 22%, transparent)",
                            "0 0 0 0 color-mix(in oklab, var(--accent) 0%, transparent)",
                          ],
                        }
                      : {}
                  }
                  transition={{ duration: 0.9, times: [0, 0.45, 1], ease: easeImports }}
                  className="rounded-lg"
                >
                  <select
                    id="imports-demo-set"
                    data-testid="imports-demo-set-select"
                    value={demoSetId}
                    onChange={(e) => setDemoSetId(e.target.value as DemoSetId)}
                    disabled={demoLoading}
                    className="app-inset-well w-full rounded-lg border-2 border-[color:var(--accent)]/35 bg-white px-3 py-3 text-sm font-medium text-zinc-900 shadow-sm transition-[border-color,background-color] duration-300 focus:border-[color:var(--accent)]/55 focus:outline-none focus:ring-2 focus:ring-[color:var(--accent)]/25 disabled:cursor-not-allowed disabled:opacity-60 dark:border-[color:var(--accent)]/30 dark:bg-zinc-950/90 dark:text-zinc-100 dark:focus:border-[color:var(--accent)]/45"
                  >
                    <option value="">Choose a demo month…</option>
                    {DEMO_OPTIONS.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </motion.div>
              </div>
              <button
                type="button"
                data-testid="imports-demo-load-button"
                disabled={demoSetId === "" || demoLoading}
                onClick={() => void handleDemoLoad()}
                className={primaryCtaClass + " shrink-0 px-8 py-3 sm:min-w-[14rem]"}
              >
                {demoLoading ? DEMO_LOADING_LINES[demoLoadingStep] : "View Demo Dashboard"}
              </button>
            </div>
          </section>
        ) : null}

        {!isDemoMode ? (
        <section
          id="imports-step-2"
          aria-labelledby="imports-step-2-heading"
          className="scroll-mt-24 rounded-xl border border-stone-200/85 bg-white p-3 shadow-sm sm:p-4 dark:border-stone-800/75 dark:bg-zinc-900/35"
        >
          <div className="flex flex-wrap items-start justify-between gap-2 border-b border-stone-200/75 pb-3 dark:border-stone-800/65">
            <div>
              <h2
                id="imports-step-2-heading"
                className="flex flex-wrap items-center gap-2 text-lg font-semibold tracking-[-0.02em] text-zinc-900 dark:text-zinc-50"
              >
                <span className="mr-1 inline-flex items-center gap-2">
                  <span className="hidden items-center gap-1.5 rounded-lg border border-stone-200/90 bg-white px-2 py-1 text-[color:var(--accent)] shadow-sm sm:inline-flex dark:border-zinc-600/80 dark:bg-zinc-950/60">
                    <IconOrderListSlot className="h-4 w-4" />
                    <IconSalesSummarySlot className="h-4 w-4" />
                  </span>
                  Upload your CSV files
                </span>
              </h2>
              <p className="mt-1.5 max-w-2xl text-[0.8125rem] leading-relaxed text-zinc-600 dark:text-zinc-400">
                Choose a label for this batch, then add one Order List and one Sales Summary from TCGplayer for the same time
                period.
              </p>
            </div>
            {currentUploadCollapsed ? (
              <button
                type="button"
                onClick={() => setCurrentUploadCollapsed(false)}
                className="shrink-0 rounded-lg border border-stone-200/85 bg-zinc-900 px-3 py-1.5 text-[0.8125rem] font-semibold text-white shadow-sm transition-[transform,background-color] duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] hover:bg-zinc-800 active:scale-[0.97] dark:border-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
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
              className="mt-3 rounded-lg border border-emerald-200/90 bg-emerald-50/90 px-3 py-2.5 text-[0.9375rem] font-semibold text-emerald-950 shadow-sm dark:border-emerald-800/45 dark:bg-emerald-950/25 dark:text-emerald-100"
            >
              {batchSavedNotice}
            </div>
          ) : null}

          {!currentUploadCollapsed ? (
            <div className="mt-2.5 space-y-2.5 sm:mt-3 sm:space-y-3">
        {!isDemoMode ? <FirstImportHelpCard hasImports={hasFiles} /> : null}
        {importProgress ? (
          <motion.div
            role="status"
            aria-live="polite"
            data-testid="imports-progress-banner"
            initial={reduceMotionPage ? false : { opacity: 0.88, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: easeImports }}
            className="relative overflow-hidden rounded-lg border border-stone-200/85 bg-zinc-50 px-3.5 py-3 text-[0.9375rem] shadow-sm dark:border-stone-700/75 dark:bg-zinc-900/50"
          >
            {!reduceMotionPage ? (
              <motion.div
                className="pointer-events-none absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-transparent via-[color:var(--accent)]/18 to-transparent"
                initial={{ x: "-120%" }}
                animate={{ x: "380%" }}
                transition={{ duration: 1.45, repeat: Infinity, ease: "linear" }}
                aria-hidden
              />
            ) : null}
            <div className="relative z-[1]">
              <p className="flex flex-wrap items-center gap-2 font-semibold text-zinc-900 dark:text-zinc-100">
                {!reduceMotionPage ? (
                  <motion.span
                    className="inline-flex size-2 rounded-full bg-[color:var(--accent)]"
                    animate={{ opacity: [1, 0.35, 1], scale: [1, 0.92, 1] }}
                    transition={{ duration: 1.1, repeat: Infinity, ease: easeImports }}
                    aria-hidden
                  />
                ) : null}
                <span>
                  {importProgress.largeImport ? "Large import" : "Processing"} · {importProgress.fileName}
                </span>
              </p>
              <p className="mt-1 text-[0.8125rem] text-zinc-600 dark:text-zinc-400">{importProgress.detail}</p>
              {importProgress.totalRows != null && importProgress.processedRows != null ? (
                <>
                  <p className="mt-2 text-[0.6875rem] font-medium tabular-nums text-zinc-600 dark:text-zinc-400">
                    {importProgress.processedRows.toLocaleString()} / {importProgress.totalRows.toLocaleString()} rows
                  </p>
                  <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
                    <motion.div
                      className="h-full rounded-full bg-[color:var(--accent)]"
                      initial={false}
                      animate={{
                        width: `${Math.min(100, (importProgress.processedRows / Math.max(1, importProgress.totalRows)) * 100)}%`,
                      }}
                      transition={{ type: "spring", stiffness: 200, damping: 28 }}
                    />
                  </div>
                </>
              ) : null}
            </div>
          </motion.div>
        ) : null}

        <Card
          className={`border-stone-200/85 p-4 shadow-sm dark:border-stone-800/75 sm:p-5 ${
            isDemoMode
              ? "border-dashed border-stone-300/90 bg-zinc-100/70 dark:border-zinc-600/70 dark:bg-zinc-900/60"
              : "bg-white dark:bg-zinc-900/50"
          }`}
          aria-describedby={isDemoMode ? "imports-demo-label-help" : undefined}
        >
          {isDemoMode ? (
            <div className="mb-3 flex flex-wrap items-center gap-2 rounded-lg border border-stone-200/90 bg-white/80 px-3 py-2 shadow-sm dark:border-zinc-600/80 dark:bg-zinc-950/50">
              <LockIcon className="h-4 w-4 shrink-0 text-zinc-500 dark:text-zinc-400" />
              <span className="text-xs font-semibold uppercase tracking-[0.08em] text-zinc-600 dark:text-zinc-300">
                Demo mode - fixed labels
              </span>
            </div>
          ) : null}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <div className="flex shrink-0 items-center gap-1.5">
              <label htmlFor="import-game" className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                Label
              </label>
              <InfoTooltip
                aria-label="Help: import label"
                text="Pick a name for this batch so you remember it later (example: 'June 2026' or 'Pokemon TCG'). It helps organize multiple imports."
              />
            </div>
            <div className="min-w-0 max-w-64 flex-1 sm:flex-initial">
              <select
                id="import-game"
                data-testid="import-game-select"
                className={`${selectClass} mt-0 w-full max-w-none ${
                  isDemoMode
                    ? "cursor-not-allowed opacity-60 grayscale-[0.35] dark:opacity-55 dark:grayscale-[0.2]"
                    : ""
                }`}
                value={isDemoMode ? "Other" : importGame}
                onChange={(e) => {
                  if (isDemoMode) return;
                  const v = e.target.value as ImportGameId | "";
                  setImportGame(v);
                  if (v !== "Other") setImportGameOtherText("");
                }}
                disabled={isDemoMode}
                aria-disabled={isDemoMode}
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
          {importGame === "Other" || isDemoMode ? (
            <div className="mt-3 max-w-md space-y-1.5">
              <label htmlFor="import-game-other" className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                Your label
              </label>
              <div className="relative">
                {isDemoMode ? (
                  <span
                    className="pointer-events-none absolute right-3 top-1/2 z-[1] -translate-y-1/2 text-zinc-400 dark:text-zinc-500"
                    aria-hidden
                  >
                    <LockIcon className="h-4 w-4" />
                  </span>
                ) : null}
                <input
                  id="import-game-other"
                  data-testid="import-game-other-input"
                  type="text"
                  value={isDemoMode ? DEMO_GAME_LABEL : importGameOtherText}
                  onChange={(e) => {
                    if (isDemoMode) return;
                    setImportGameOtherText(e.target.value);
                  }}
                  placeholder="e.g. My shop name or game title"
                  autoComplete="off"
                  className={`${selectClass} mt-1 ${isDemoMode ? "cursor-not-allowed bg-zinc-200/60 pr-10 opacity-80 dark:bg-zinc-800/70 dark:opacity-70" : ""}`}
                  disabled={isDemoMode}
                  aria-disabled={isDemoMode}
                />
              </div>
            </div>
          ) : null}
          {isDemoMode ? (
            <p
              id="imports-demo-label-help"
              className="mt-3 max-w-xl text-[0.8125rem] leading-relaxed text-zinc-600 dark:text-zinc-400"
            >
              In the real tool, you can name each batch whatever you want. In demo mode, this is locked so you can focus on
              trying the dashboard.
            </p>
          ) : null}
          {!uploadsEnabled && !isDemoMode ? (
            <p className="mt-1.5 text-[0.6875rem] font-medium text-zinc-500 dark:text-zinc-400">
              {importGame === "Other" ? "Type your label to upload." : "Pick a label to upload."}
            </p>
          ) : null}
        </Card>

        {hasFiles && workspaceLabelCount > 1 ? (
          <div
            role="alert"
            data-testid="imports-mixed-game-batch-warning"
            className="mt-2 rounded-lg border border-amber-200/90 bg-amber-50/90 px-3 py-2.5 text-[0.8125rem] font-semibold text-amber-950 shadow-sm dark:border-amber-800/45 dark:bg-amber-950/25 dark:text-amber-100"
          >
            Each batch should contain only one game. Please separate uploads by game.
          </div>
        ) : null}
        {hasFiles && (orderImports.length > 1 || summaryImports.length > 1) ? (
          <div className="mt-2 rounded-lg border border-stone-200/85 bg-zinc-50 px-3 py-2 text-[0.8125rem] font-medium text-zinc-800 dark:border-stone-700/75 dark:bg-zinc-900/45 dark:text-zinc-100">
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
              title="Order list"
              titleTooltip="This is your line-item export from TCGplayer. Go to Orders > Filters > set date range > See Results > Export Orders."
              titleDescription="This is your order history from TCGplayer - the line-item export from Orders (CSV)."
              helperEmpty="Add your Order List CSV to begin"
              imports={orderImports}
              onFiles={runOrderUpload}
              onRemove={(id) => removeImportFile(id, "order")}
              uploadsEnabled={uploadsEnabled}
              techCap={MAX_IMPORT_FILES_PER_TYPE}
              kind="order"
              fileInputTestId="upload-order-csv"
              statusLineTestId="upload-order-slot-status"
              regionLabel="Order List upload"
              nextStepHint={onlySummaryUploaded ? "Next: add your order history CSV here" : null}
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
              title="Sales summary"
              titleTooltip="This is your summary report from TCGplayer. Go to Reports > Sales Summary Report > set the SAME date range > Download Report."
              titleDescription="This is your sales summary from TCGplayer - totals for the same date range as your orders (CSV)."
              helperEmpty="Add your Sales Summary CSV to continue"
              imports={summaryImports}
              onFiles={runSummaryUpload}
              onRemove={(id) => removeImportFile(id, "summary")}
              uploadsEnabled={uploadsEnabled}
              techCap={MAX_IMPORT_FILES_PER_TYPE}
              kind="summary"
              fileInputTestId="upload-summary-csv"
              statusLineTestId="upload-summary-slot-status"
              regionLabel="Sales Summary upload"
              nextStepHint={onlyOrderUploaded ? "Next: add your sales summary CSV here" : null}
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
          {guideStep === 2 && hasFiles && (onlyOrderUploaded || onlySummaryUploaded) ? (
            <div
              className="mt-4 flex flex-col items-center gap-2 rounded-lg border border-dashed border-amber-200/85 bg-amber-50/50 px-4 py-3 text-center dark:border-amber-800/45 dark:bg-amber-950/25"
              role="status"
            >
              {isDemoMode ? <ImportsFlowArrow showCaption={false} caption="" /> : null}
              <p className="text-sm font-semibold text-amber-950 dark:text-amber-50">
                {isDemoMode
                  ? "Almost there - add the other TCGplayer CSV above to open step 3."
                  : "Almost there - add the other TCGplayer CSV above to finish this batch."}
              </p>
            </div>
          ) : null}
        </section>

        {error ? (
          <div className="rounded-lg border border-amber-200/90 bg-amber-50/90 px-3 py-2 text-[0.9375rem] text-amber-950 dark:border-amber-800/45 dark:bg-amber-950/25 dark:text-amber-100">
            {error}
          </div>
        ) : null}

            </div>
        ) : (
          <div className="mt-3 rounded-lg border border-dashed border-stone-300/75 bg-zinc-50/60 px-3 py-3 text-center dark:border-stone-600/55 dark:bg-zinc-950/40">
            <p className="text-[0.9375rem] font-medium text-zinc-700 dark:text-zinc-200">Cleared. Your batch is in Saved batches.</p>
          </div>
        )}

        </section>
        ) : null}

        {hasFiles && importStatusTone ? (
          <>
            {isDemoMode ? <ImportsFlowArrow caption="Review" /> : null}
            <section
              id="imports-step-3"
              aria-labelledby="imports-batch-status-heading"
              className="scroll-mt-24 space-y-2 rounded-xl border border-stone-200/85 bg-zinc-50/50 p-3 dark:border-stone-800/75 dark:bg-zinc-900/30 sm:p-3.5"
            >
              <h2
                id="imports-batch-status-heading"
                className={`text-lg font-semibold tracking-[-0.02em] text-zinc-900 dark:text-zinc-50 ${isDemoMode ? "flex flex-wrap items-center gap-2" : ""}`}
              >
                {isDemoMode ? (
                  <span className="mr-2 inline-flex size-8 items-center justify-center rounded-full bg-[color:var(--accent)] text-sm font-bold text-white shadow-sm">
                    2
                  </span>
                ) : null}
                {isDemoMode ? "Review and open your dashboard" : "Review and confirm"}
              </h2>
              <p className="text-[0.8125rem] leading-relaxed text-zinc-600 dark:text-zinc-400">
                {isDemoMode
                  ? "We loaded sample Order List and Sales Summary files for you. When you're happy with the summary, open your dashboard."
                  : "We'll check that your two files belong together. When you're happy with the summary, open your dashboard."}
              </p>
              <p className="text-[0.6875rem] font-medium uppercase tracking-[0.08em] text-zinc-500 dark:text-zinc-500">
                Batch status
              </p>
          <motion.div
            data-testid="imports-workspace-status"
            key={`${workspaceReady ? "ready" : "blocked"}-${importStatusTone}-${financialConsistencyLevel}-${importLabelMismatch ? "lm" : "ok"}-${importTimeAlignment?.status ?? "x"}`}
            initial={{ opacity: 0, y: 8 }}
            animate={{
              opacity: 1,
              y: 0,
            }}
            transition={{ duration: 0.38, ease: easeImports }}
            className="rounded-xl"
          >
            <Card className={`p-4 shadow-sm sm:p-5 ${importStatusCardClass}`}>
              {importTraffic ? (
                <>
                  <div className="space-y-1">
                    <p
                      data-testid="imports-workspace-headline"
                      className={`text-base font-semibold leading-tight tracking-[-0.02em] sm:text-lg ${
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
                    className="mt-3 rounded-lg border border-stone-200/85 bg-white px-3 py-2 shadow-sm dark:border-stone-700/65 dark:bg-zinc-900/45"
                  >
                    <summary className="cursor-pointer text-[0.8125rem] font-semibold text-zinc-800 outline-none dark:text-zinc-200">
                      View details
                    </summary>
                    <div className="mt-3 space-y-3 text-[0.8125rem] leading-relaxed">
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

                      <div className="rounded-lg border border-dashed border-stone-200/85 bg-zinc-50/70 p-2 dark:border-zinc-700/55 dark:bg-zinc-950/35">
                        <ImportsSnapshotStrip
                          gross={draftImportEvaluation.grossSales}
                          net={draftImportEvaluation.netAfterFees}
                          fees={draftImportEvaluation.fees}
                          orders={draftImportEvaluation.orders}
                          shipping={draftImportEvaluation.shipping}
                          emptyWorkspace={!workspaceReady}
                          className="!border-stone-200/75 !bg-white !p-2 !shadow-none dark:!border-stone-700/55 dark:!bg-zinc-900/50 [&_p]:!text-xs"
                        />
                      </div>

                      <ImportsWorkspaceTrustLine techCap={MAX_IMPORT_FILES_PER_TYPE} />
                    </div>
                  </details>

              <div className="mt-5 space-y-4 border-t border-stone-200/75 pt-5 dark:border-zinc-700/55">
                {workspaceReady ? (
                  <>
                    {importComplete ? (
                      <div className="mx-auto w-full max-w-md rounded-lg border border-emerald-200/90 bg-emerald-50/90 px-4 py-3.5 dark:border-emerald-800/45 dark:bg-emerald-950/25">
                        <h3 className="text-[0.9375rem] font-semibold text-emerald-950 dark:text-emerald-100">Import complete</h3>
                        <p className="mt-1 text-[0.8125rem] text-emerald-900/95 dark:text-emerald-200/95">
                          Your dashboard has been updated with this batch.
                        </p>
                        {isDemoMode ? (
                          <p className="mt-1.5 text-[0.6875rem] font-medium text-emerald-900/90 dark:text-emerald-200/90">
                            Demo imports are temporary and reset when you leave demo mode.
                          </p>
                        ) : null}
                      </div>
                    ) : null}
                    {importSuccessFlash ? (
                      <p
                        className="text-center text-[0.9375rem] font-medium text-emerald-800 dark:text-emerald-200"
                        role="status"
                      >
                        Your files are loaded! Scroll down to review what we found and then click View Dashboard.
                      </p>
                    ) : null}
                    <div className="mx-auto flex w-full max-w-md flex-col gap-4">
                      {isDemoMode ? (
                        <div className="rounded-xl border border-emerald-200/85 bg-[color:color-mix(in_oklab,var(--accent-soft)_55%,white)] px-4 py-3 text-center dark:border-emerald-800/45 dark:bg-[color:color-mix(in_oklab,var(--accent-soft)_16%,var(--surface-muted))]">
                          <p className="text-sm leading-relaxed text-emerald-950 dark:text-emerald-100">
                            Now you know how it works! Ready to try with your real data? See our guide:{" "}
                            <span className="font-semibold">How to Get Your CSVs from TCGplayer.com</span>
                          </p>
                          <Link
                            href="/help/getting-your-csvs"
                            className={
                              primaryCtaClass +
                              " mt-3 inline-flex w-full justify-center px-6 py-2.5 text-sm no-underline"
                            }
                          >
                            View Full Guide
                          </Link>
                        </div>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => void handleContinueToDashboard()}
                        disabled={savingForDashboard}
                        className={
                          primaryCtaClass +
                          " flex w-full justify-center px-8 py-3.5 text-base disabled:opacity-60"
                        }
                      >
                        {savingForDashboard ? "Saving..." : "View dashboard"}
                      </button>
                      {canAddAnotherGame && !isDemoMode ? (
                        <button
                          type="button"
                          data-testid="imports-add-another-game-button"
                          onClick={() => handleAddAnotherGame()}
                          className="flex w-full items-center justify-center rounded-lg border border-stone-200/85 bg-white px-6 py-3 text-sm font-semibold text-zinc-800 shadow-sm transition-[transform,background-color] duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] hover:bg-zinc-50 active:scale-[0.97] dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
                        >
                          Add more files to this batch
                        </button>
                      ) : null}
                      {canAddAnotherGame && !isDemoMode ? (
                        <p className="w-full text-center text-[0.6875rem] text-zinc-500 dark:text-zinc-400">
                          Continue building this batch with additional uploads in this session.
                        </p>
                      ) : null}
                      {isDemoMode ? (
                        <Link
                          href="/data?demo=1"
                          className="flex w-full items-center justify-center rounded-lg border border-stone-200/85 bg-white px-6 py-3 text-sm font-semibold text-zinc-800 shadow-sm transition-[transform,background-color] duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] hover:bg-zinc-50 active:scale-[0.97] dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
                        >
                          Try Another Demo Month
                        </Link>
                      ) : null}
                      <button
                        type="button"
                        onClick={resetAll}
                        data-testid="imports-reset-button"
                        className="flex w-full items-center justify-center rounded-lg border border-stone-200/85 bg-zinc-50 px-6 py-3 text-sm font-medium text-zinc-800 shadow-sm transition-[transform,background-color] duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] hover:bg-zinc-100 active:scale-[0.97] dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
                      >
                        Reset imports
                      </button>
                    </div>
                    <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-2 text-sm">
                      <Link
                        href="/trends"
                        className="font-medium text-zinc-600 underline-offset-2 transition-colors duration-200 hover:text-zinc-900 hover:underline dark:text-zinc-400 dark:hover:text-zinc-200"
                      >
                        View Trends
                      </Link>
                    </div>
                  </>
                ) : (
                  <div className="mx-auto w-full max-w-md">
                    <button
                      type="button"
                      onClick={resetAll}
                      data-testid="imports-reset-button"
                      className="flex w-full items-center justify-center rounded-lg border border-stone-200/85 bg-white px-6 py-3 text-sm font-semibold text-zinc-800 shadow-sm transition-[transform,background-color] duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] hover:bg-zinc-50 active:scale-[0.97] dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
                    >
                      Reset imports
                    </button>
                  </div>
                )}
              </div>
                </>
              ) : null}
            </Card>
          </motion.div>

            {(orderFilesPresentButUnmapped || summaryFilesPresentButUnmapped) && hasFiles ? (
              <div className="mt-2 space-y-2.5">
                <details className="rounded-lg border border-amber-200/90 bg-amber-50/90 px-3 py-2 text-amber-950 dark:border-amber-800/45 dark:bg-amber-950/25 dark:text-amber-100">
                  <summary className="cursor-pointer text-[0.8125rem] font-semibold outline-none">Column detail</summary>
                  <div className="mt-2 space-y-1 text-[0.8125rem] leading-relaxed opacity-95">
                    {UNMAPPED_COLUMN_WARNING_LINES.map((line) => (
                      <p key={line}>{line}</p>
                    ))}
                  </div>
                </details>
              </div>
            ) : null}
          </section>
          </>
        ) : null}

        {savedBatchesSection}

        {sessionCombinedTotalsPanel}

      </div>
    </PageShell>
  );
}
