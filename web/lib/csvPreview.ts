import type { CsvData } from "./csvData";
import { IMPORT_PREVIEW_HEAD_ROWS, IMPORT_PREVIEW_TAIL_ROWS } from "./importPerformanceConstants";

/** Stored preview after an import (may be capped for large files). */
export type ImportPreviewPayload = {
  title: string;
  data: CsvData;
  sourceRowCount?: number;
  previewLimited?: boolean;
};

export type CsvPreviewResult = {
  data: CsvData;
  /** Full contributing row count before capping preview rows. */
  sourceRowCount: number;
  /** True when preview rows are only a sample. */
  previewLimited: boolean;
};

/**
 * Build a small in-memory preview (first + last rows) for UI / persistence.
 * Full `data` should be retained separately for merges when needed.
 */
export function buildCappedCsvPreview(full: CsvData): CsvPreviewResult {
  const n = full.rows.length;
  const head = IMPORT_PREVIEW_HEAD_ROWS;
  const tail = IMPORT_PREVIEW_TAIL_ROWS;
  if (n <= head + tail) {
    return { data: full, sourceRowCount: n, previewLimited: false };
  }
  return {
    data: {
      headers: full.headers,
      rows: [...full.rows.slice(0, head), ...full.rows.slice(-tail)],
    },
    sourceRowCount: n,
    previewLimited: true,
  };
}

export function buildImportPreviewPayload(title: string, full: CsvData): ImportPreviewPayload {
  const capped = buildCappedCsvPreview(full);
  return {
    title,
    data: capped.data,
    sourceRowCount: capped.sourceRowCount,
    previewLimited: capped.previewLimited,
  };
}
