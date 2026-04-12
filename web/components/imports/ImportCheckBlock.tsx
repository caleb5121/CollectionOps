"use client";

import type { ImportCheck } from "../../lib/importMerge";
import { formatImportFileRejectionMessage } from "../../lib/importFormatCopy";
import { IMPORT_MAX_FILE_DIAGNOSTIC_LINES } from "../../lib/importPerformanceConstants";

function capDiagnosticText(s: string, maxLines: number): string {
  const lines = s.trim().split(/\r?\n/).filter(Boolean);
  if (lines.length <= maxLines) return lines.join("\n");
  const shown = lines.slice(0, maxLines);
  const rest = lines.length - maxLines;
  return `${shown.join("\n")}\n… and ${rest} more line${rest !== 1 ? "s" : ""} (open CSV for full detail).`;
}

function issuesSummary(check: ImportCheck, integrityWarning?: string): { text: string; tone: "ok" | "note" } {
  if (integrityWarning?.trim()) {
    return { text: capDiagnosticText(integrityWarning, IMPORT_MAX_FILE_DIAGNOSTIC_LINES), tone: "note" };
  }
  const parts: string[] = [];
  if (check.rowsSkipped > 0) {
    parts.push(`${check.rowsSkipped.toLocaleString()} row${check.rowsSkipped === 1 ? "" : "s"} skipped`);
  }
  if (check.warningCount > 0) {
    parts.push(`${check.warningCount} warning${check.warningCount === 1 ? "" : "s"}`);
  }
  if (parts.length > 0) {
    return { text: parts.join(" · "), tone: "note" };
  }
  return { text: "No issues detected", tone: "ok" };
}

export function ImportCheckBlock({
  check,
  integrityWarning,
  kind,
  rejected,
  rejectionReason,
}: {
  check: ImportCheck;
  integrityWarning?: string;
  kind: "order" | "summary";
  /** When true, only show rejection copy — never “No issues detected”. */
  rejected?: boolean;
  rejectionReason?: string | null;
}) {
  if (rejected) {
    const raw = formatImportFileRejectionMessage(rejectionReason ?? "");
    const line = raw.length > 480 ? `${raw.slice(0, 480)}…` : raw;
    return (
      <div className="mt-2 space-y-1 text-[10px] leading-relaxed">
        <p className="font-semibold text-red-800 dark:text-red-200">{line}</p>
      </div>
    );
  }

  const isOrder = kind === "order" || check.detectedType === "order_list";
  const { text: issuesLine, tone: issuesTone } = issuesSummary(check, integrityWarning);
  const issuesClass =
    issuesTone === "ok"
      ? "text-emerald-700/80 dark:text-emerald-400/75"
      : "text-amber-900 dark:text-amber-200/95";

  if (isOrder) {
    const dateLine = check.dateRangeLabel ? `Date range: ${check.dateRangeLabel}` : "Date range: not available from this file";
    return (
      <div className="mt-2 space-y-1 text-[10px] leading-relaxed">
        <p className="font-medium text-slate-800 dark:text-slate-200">
          {check.rowsAccepted.toLocaleString()} orders processed
        </p>
        <p className="text-slate-600 dark:text-slate-400">{dateLine}</p>
        <p className={`${issuesClass} ${issuesTone === "ok" ? "font-medium" : ""}`}>{issuesLine}</p>
      </div>
    );
  }

  const rowLabel = `${check.rowsAccepted.toLocaleString()} row${check.rowsAccepted === 1 ? "" : "s"} processed`;
  return (
    <div className="mt-2 space-y-1 text-[10px] leading-relaxed">
      <p className="font-medium text-slate-800 dark:text-slate-200">Summary totals loaded</p>
      <p className="text-slate-600 dark:text-slate-400">{rowLabel}</p>
      <p className={`${issuesClass} ${issuesTone === "ok" ? "font-medium" : ""}`}>{issuesLine}</p>
    </div>
  );
}
