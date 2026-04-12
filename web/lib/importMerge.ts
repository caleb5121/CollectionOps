import type { CsvData } from "./csvData";

/** Per-file validation outcome (persisted). */
export type ImportValidationStatus = "accepted" | "accepted_warnings" | "partial" | "rejected";

export type DetectedImportKind = "order_list" | "sales_summary" | "unknown";

export type ImportCheck = {
  detectedType: DetectedImportKind;
  rowsRead: number;
  rowsAccepted: number;
  rowsSkipped: number;
  requiredFound: number;
  requiredTotal: number;
  dateRangeLabel: string | null;
  warningCount: number;
};

/** Legacy upload flags (overlap / unmapped); prefer validationStatus. */
export type ImportFileStatus = "loaded" | "warning" | "overlap" | "unmapped";

/** Parsed / validation metadata (persisted so Imports UI stays honest after reload). */
export type ImportMappingMeta = {
  kind: "order" | "summary";
  mapped: boolean;
  rowCount: number;
  missingRequired: string[];
  detectedHeaders: string[];
};

export type ImportChunk = {
  id: string;
  fileName: string;
  data: CsvData;
  /** Game label chosen in Imports before upload */
  gameLabel?: string;
  /** When this file was added to this browser session */
  importedAtIso?: string;
  dateFromIso?: string | null;
  dateToIso?: string | null;
  status?: ImportFileStatus;
  statusNote?: string;
  importMapping?: ImportMappingMeta;
  validationStatus?: ImportValidationStatus;
  /** Single-line summary for file row (e.g. "Accepted - 84 rows processed") */
  validationReasonLine?: string;
  importCheck?: ImportCheck;
  /** Fast fingerprint of raw CSV text (duplicate detection). */
  contentFingerprint?: string;
  /** Duplicate content / overlap / integrity messages (non-blocking unless rejected elsewhere). */
  integrityWarning?: string;
};

/** Max files per type (order lists / sales summaries). High cap for “lifetime” style history. */
export const MAX_IMPORT_FILES_PER_TYPE = 500;

export function newImportId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `imp-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

/** True when this file’s rows are merged into workspace CSVs. */
export function importChunkContributesToMergedWorkspace(c: ImportChunk): boolean {
  if (c.validationStatus === "rejected") return false;
  return c.data.rows.length > 0;
}

/** Concatenate rows from accepted / contributing chunks only (rejected files excluded). */
export function mergeImportChunks(chunks: ImportChunk[]): CsvData | null {
  const contributing = chunks.filter(importChunkContributesToMergedWorkspace);
  if (contributing.length === 0) return null;
  if (contributing.length === 1) return contributing[0].data;

  const headers: string[] = [];
  const seen = new Set<string>();
  for (const c of contributing) {
    for (const h of c.data.headers) {
      const t = h.trim();
      if (!seen.has(t)) {
        seen.add(t);
        headers.push(h);
      }
    }
  }

  const rows: Record<string, string>[] = [];
  for (const c of contributing) {
    for (const row of c.data.rows) {
      const out: Record<string, string> = {};
      for (const h of headers) {
        out[h] = row[h] ?? "";
      }
      rows.push(out);
    }
  }
  return { headers, rows };
}
