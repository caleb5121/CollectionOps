import type { CsvData } from "./csvData";
import { detectCsvImportKind } from "./csvDetect";
import {
  normalizeImportFileName,
  csvOrderDateRange,
  csvSummaryDateRange,
  resolveImportStatusForOrderChunk,
  resolveImportStatusForSummaryChunk,
} from "./importMetadata";
import {
  MAX_IMPORT_FILES_PER_TYPE,
  newImportId,
  type ImportChunk,
} from "./importMerge";
import {
  buildImportCheckFromOrderMap,
  buildImportCheckFromSummaryMap,
  buildImportCheckRejected,
  buildImportCheckOrder,
  buildImportCheckSummary,
  deriveValidationStatus,
  filterOrderRows,
  filterOrderRowsChunked,
  filterSummaryRows,
  filterSummaryRowsChunked,
  fingerprintCsvText,
  formatIntegrityWarnings,
  hasDuplicateContentHash,
  shortRejectedReasonOrder,
  shortRejectedReasonSummary,
  validateSlotAgainstDetection,
  validationReasonLine,
} from "./importHardening";
import { resolveOrderListColumnMap } from "./orderListColumnMap";
import { resolveSalesSummaryColumnMap } from "./salesSummaryColumnMap";
import { parseCsvTextAsync } from "./parseCsvAsync";
import { IMPORT_FILTER_CHUNK_SIZE, IMPORT_LARGE_ROW_THRESHOLD } from "./importPerformanceConstants";
import { logImportPerf, importPerfEnabled } from "./importPerfLog";
import { buildImportPreviewPayload, type ImportPreviewPayload } from "./csvPreview";

export type ImportProgressPayload = {
  phase: "reading" | "parsing" | "validating" | "summarizing";
  fileName: string;
  detail: string;
  processedRows?: number;
  totalRows?: number;
  largeImport?: boolean;
};

type ProgressFn = (p: ImportProgressPayload | null) => void;

function now(): number {
  return typeof performance !== "undefined" ? performance.now() : Date.now();
}

export async function appendOrderImportsFromFiles(
  files: File[],
  startList: ImportChunk[],
  game: string,
  onProgress: ProgressFn,
): Promise<{
  chunks: ImportChunk[];
  previewUpdate: ImportPreviewPayload | null;
  batchDup: number;
  filesAccepted: number;
  filesRejected: number;
  batchAny: number;
  limitHit: boolean;
  filenameDuplicateSkips: number;
}> {
  const tPipe = now();
  let next = [...startList];
  let batchDup = 0;
  let filesAccepted = 0;
  let filesRejected = 0;
  let batchAny = 0;
  let previewUpdate: ImportPreviewPayload | null = null;
  let limitHit = false;
  let filenameDuplicateSkips = 0;

  for (const file of files) {
    if (next.length >= MAX_IMPORT_FILES_PER_TYPE) {
      limitHit = true;
      break;
    }
    const norm = normalizeImportFileName(file.name);
    if (next.some((c) => normalizeImportFileName(c.fileName) === norm)) {
      filenameDuplicateSkips++;
      batchDup++;
      continue;
    }

    const tFile = now();
    try {
      onProgress({
        phase: "reading",
        fileName: file.name,
        detail: "Reading file…",
      });
      const text = await file.text();
      const fp = fingerprintCsvText(text);

      onProgress({
        phase: "parsing",
        fileName: file.name,
        detail: "Parsing CSV…",
      });
      const data = await parseCsvTextAsync(text);

      const rowCount = data.rows.length;
      const large = rowCount >= IMPORT_LARGE_ROW_THRESHOLD;
      onProgress({
        phase: "parsing",
        fileName: file.name,
        detail: large
          ? `Large file (${rowCount.toLocaleString()} rows) — parsing complete`
          : `Parsed ${rowCount.toLocaleString()} rows`,
        totalRows: rowCount,
        largeImport: large,
      });

      if (data.rows.length === 0) {
        const detected = detectCsvImportKind(data);
        next.push({
          id: newImportId(),
          fileName: file.name,
          data,
          gameLabel: game,
          importedAtIso: new Date().toISOString(),
          dateFromIso: null,
          dateToIso: null,
          status: "unmapped",
          validationStatus: "rejected",
          validationReasonLine: "No data rows",
          importCheck: buildImportCheckRejected({ detected, data, target: "order" }),
          contentFingerprint: fp,
          importMapping: {
            kind: "order",
            mapped: false,
            rowCount: 0,
            missingRequired: [],
            detectedHeaders: data.headers,
          },
        });
        filesRejected++;
        batchAny++;
        continue;
      }

      const slot = validateSlotAgainstDetection("order", data);
      if (!slot.ok) {
        const detected = detectCsvImportKind(data);
        next.push({
          id: newImportId(),
          fileName: file.name,
          data,
          gameLabel: game,
          importedAtIso: new Date().toISOString(),
          dateFromIso: null,
          dateToIso: null,
          status: "unmapped",
          validationStatus: "rejected",
          validationReasonLine: slot.message,
          importCheck: buildImportCheckRejected({ detected, data, target: "order" }),
          contentFingerprint: fp,
          importMapping: {
            kind: "order",
            mapped: false,
            rowCount: 0,
            missingRequired: [],
            detectedHeaders: data.headers,
          },
        });
        filesRejected++;
        batchAny++;
        continue;
      }

      const map = resolveOrderListColumnMap(data.headers);
      if (!map.ok) {
        next.push({
          id: newImportId(),
          fileName: file.name,
          data,
          gameLabel: game,
          importedAtIso: new Date().toISOString(),
          dateFromIso: null,
          dateToIso: null,
          status: "unmapped",
          validationStatus: "rejected",
          validationReasonLine: shortRejectedReasonOrder(map),
          importCheck: buildImportCheckFromOrderMap(data, map),
          contentFingerprint: fp,
          importMapping: {
            kind: "order",
            mapped: false,
            rowCount: 0,
            missingRequired: map.missingRequired,
            detectedHeaders: data.headers,
          },
        });
        filesRejected++;
        batchAny++;
        continue;
      }

      onProgress({
        phase: "validating",
        fileName: file.name,
        detail: large ? "Validating orders (large import)…" : "Validating orders…",
        processedRows: 0,
        totalRows: data.rows.length,
        largeImport: large,
      });

      const filteredResult =
        data.rows.length >= IMPORT_FILTER_CHUNK_SIZE
          ? await filterOrderRowsChunked(data, map, {
              onProgress: (processed, total) =>
                onProgress({
                  phase: "validating",
                  fileName: file.name,
                  detail: `Validating orders… ${processed.toLocaleString()}/${total.toLocaleString()}`,
                  processedRows: processed,
                  totalRows: total,
                  largeImport: large,
                }),
            })
          : filterOrderRows(data, map);
      const { filtered, rowsAccepted, rowsSkipped } = filteredResult;
      const rowsRead = data.rows.length;

      if (rowsRead > 0 && rowsAccepted === 0) {
        next.push({
          id: newImportId(),
          fileName: file.name,
          data: filtered,
          gameLabel: game,
          importedAtIso: new Date().toISOString(),
          dateFromIso: null,
          dateToIso: null,
          status: "unmapped",
          validationStatus: "rejected",
          validationReasonLine: "No valid rows (dates / totals)",
          importCheck: buildImportCheckOrder(filtered, map, rowsRead, 0, rowsSkipped, 0),
          contentFingerprint: fp,
          importMapping: {
            kind: "order",
            mapped: true,
            rowCount: 0,
            missingRequired: map.missingRequired,
            detectedHeaders: data.headers,
          },
        });
        filesRejected++;
        batchAny++;
        continue;
      }

      const overlap = resolveImportStatusForOrderChunk(filtered, next, game);
      const dupContent = hasDuplicateContentHash(next, fp);
      let extra = 0;
      if (overlap.status === "overlap") extra++;
      if (dupContent) extra++;
      const integrityWarning = formatIntegrityWarnings({
        duplicateFilename: false,
        duplicateContent: dupContent,
        overlapNote: overlap.status === "overlap" ? overlap.statusNote : undefined,
      });
      const partialOptional = !map.feesKey || !map.payoutKey;
      const vstatus = deriveValidationStatus({
        schemaOk: true,
        rowsAccepted,
        rowsRead,
        rowsSkipped,
        extraWarnings: extra,
        partialOptional,
      });
      const importCheck = buildImportCheckOrder(filtered, map, rowsRead, rowsAccepted, rowsSkipped, extra);
      const reasonDetail = rowsSkipped > 0 ? "invalid dates or values" : undefined;
      const vReason = validationReasonLine(vstatus, importCheck, reasonDetail);
      let legacyStatus: ImportChunk["status"] = overlap.status === "overlap" ? "overlap" : "loaded";
      let statusNote: string | undefined = overlap.statusNote;
      if (vstatus === "accepted_warnings" || vstatus === "partial") {
        legacyStatus = "warning";
      }
      const range = csvOrderDateRange(filtered);
      const chunk: ImportChunk = {
        id: newImportId(),
        fileName: file.name,
        data: filtered,
        gameLabel: game,
        importedAtIso: new Date().toISOString(),
        dateFromIso: range ? range.from.toISOString() : null,
        dateToIso: range ? range.to.toISOString() : null,
        status: legacyStatus,
        statusNote,
        importMapping: {
          kind: "order",
          mapped: true,
          rowCount: rowsAccepted,
          missingRequired: map.missingRequired,
          detectedHeaders: data.headers,
        },
        validationStatus: vstatus,
        validationReasonLine: vReason,
        importCheck,
        contentFingerprint: fp,
        integrityWarning,
      };
      next.push(chunk);
      batchAny++;
      filesAccepted++;
      previewUpdate = buildImportPreviewPayload(`Order List (${file.name})`, filtered);
    } finally {
      onProgress(null);
    }
    if (importPerfEnabled()) {
      logImportPerf("import_order_file", now() - tFile, { name: file.name });
    }
  }

  if (importPerfEnabled()) {
    logImportPerf("import_order_files_batch", now() - tPipe, { files: files.length });
  }

  return {
    chunks: next,
    previewUpdate,
    batchDup,
    filesAccepted,
    filesRejected,
    batchAny,
    limitHit,
    filenameDuplicateSkips,
  };
}

export async function appendSummaryImportsFromFiles(
  files: File[],
  startList: ImportChunk[],
  game: string,
  onProgress: ProgressFn,
): Promise<{
  chunks: ImportChunk[];
  previewUpdate: ImportPreviewPayload | null;
  batchDup: number;
  filesAccepted: number;
  filesRejected: number;
  batchAny: number;
  limitHit: boolean;
  filenameDuplicateSkips: number;
}> {
  const tPipe = now();
  let next = [...startList];
  let batchDup = 0;
  let filesAccepted = 0;
  let filesRejected = 0;
  let batchAny = 0;
  let previewUpdate: ImportPreviewPayload | null = null;
  let limitHit = false;
  let filenameDuplicateSkips = 0;

  for (const file of files) {
    if (next.length >= MAX_IMPORT_FILES_PER_TYPE) {
      limitHit = true;
      break;
    }
    const norm = normalizeImportFileName(file.name);
    if (next.some((c) => normalizeImportFileName(c.fileName) === norm)) {
      filenameDuplicateSkips++;
      batchDup++;
      continue;
    }

    const tFile = now();
    try {
      onProgress({
        phase: "reading",
        fileName: file.name,
        detail: "Reading file…",
      });
      const text = await file.text();
      const fp = fingerprintCsvText(text);

      onProgress({ phase: "parsing", fileName: file.name, detail: "Parsing CSV…" });
      const data = await parseCsvTextAsync(text);

      const rowCount = data.rows.length;
      const large = rowCount >= IMPORT_LARGE_ROW_THRESHOLD;
      onProgress({
        phase: "parsing",
        fileName: file.name,
        detail: large
          ? `Large file (${rowCount.toLocaleString()} rows) — parsing complete`
          : `Parsed ${rowCount.toLocaleString()} rows`,
        totalRows: rowCount,
        largeImport: large,
      });

      if (data.rows.length === 0) {
        const detected = detectCsvImportKind(data);
        next.push({
          id: newImportId(),
          fileName: file.name,
          data,
          gameLabel: game,
          importedAtIso: new Date().toISOString(),
          dateFromIso: null,
          dateToIso: null,
          status: "unmapped",
          validationStatus: "rejected",
          validationReasonLine: "No data rows",
          importCheck: buildImportCheckRejected({ detected, data, target: "summary" }),
          contentFingerprint: fp,
          importMapping: {
            kind: "summary",
            mapped: false,
            rowCount: 0,
            missingRequired: [],
            detectedHeaders: data.headers,
          },
        });
        filesRejected++;
        batchAny++;
        continue;
      }

      const slot = validateSlotAgainstDetection("summary", data);
      if (!slot.ok) {
        const detected = detectCsvImportKind(data);
        next.push({
          id: newImportId(),
          fileName: file.name,
          data,
          gameLabel: game,
          importedAtIso: new Date().toISOString(),
          dateFromIso: null,
          dateToIso: null,
          status: "unmapped",
          validationStatus: "rejected",
          validationReasonLine: slot.message,
          importCheck: buildImportCheckRejected({ detected, data, target: "summary" }),
          contentFingerprint: fp,
          importMapping: {
            kind: "summary",
            mapped: false,
            rowCount: 0,
            missingRequired: [],
            detectedHeaders: data.headers,
          },
        });
        filesRejected++;
        batchAny++;
        continue;
      }

      const map = resolveSalesSummaryColumnMap(data.headers);
      if (!map.ok) {
        next.push({
          id: newImportId(),
          fileName: file.name,
          data,
          gameLabel: game,
          importedAtIso: new Date().toISOString(),
          dateFromIso: null,
          dateToIso: null,
          status: "unmapped",
          validationStatus: "rejected",
          validationReasonLine: shortRejectedReasonSummary(map),
          importCheck: buildImportCheckFromSummaryMap(data, map),
          contentFingerprint: fp,
          importMapping: {
            kind: "summary",
            mapped: false,
            rowCount: 0,
            missingRequired: map.missingRequired,
            detectedHeaders: data.headers,
          },
        });
        filesRejected++;
        batchAny++;
        continue;
      }

      onProgress({
        phase: "validating",
        fileName: file.name,
        detail: large ? "Validating summary rows (large import)…" : "Validating summary rows…",
        processedRows: 0,
        totalRows: data.rows.length,
        largeImport: large,
      });

      const filteredResult =
        data.rows.length >= IMPORT_FILTER_CHUNK_SIZE
          ? await filterSummaryRowsChunked(data, map, {
              onProgress: (processed, total) =>
                onProgress({
                  phase: "validating",
                  fileName: file.name,
                  detail: `Validating rows… ${processed.toLocaleString()}/${total.toLocaleString()}`,
                  processedRows: processed,
                  totalRows: total,
                  largeImport: large,
                }),
            })
          : filterSummaryRows(data, map);
      const { filtered, rowsAccepted, rowsSkipped } = filteredResult;
      const rowsRead = data.rows.length;

      if (rowsRead > 0 && rowsAccepted === 0) {
        next.push({
          id: newImportId(),
          fileName: file.name,
          data: filtered,
          gameLabel: game,
          importedAtIso: new Date().toISOString(),
          dateFromIso: null,
          dateToIso: null,
          status: "unmapped",
          validationStatus: "rejected",
          validationReasonLine: "No valid rows (numeric columns)",
          importCheck: buildImportCheckSummary(filtered, map, rowsRead, 0, rowsSkipped, 0),
          contentFingerprint: fp,
          importMapping: {
            kind: "summary",
            mapped: true,
            rowCount: 0,
            missingRequired: map.missingRequired,
            detectedHeaders: data.headers,
          },
        });
        filesRejected++;
        batchAny++;
        continue;
      }

      const overlap = resolveImportStatusForSummaryChunk(filtered, next);
      const dupContent = hasDuplicateContentHash(next, fp);
      let extra = 0;
      if (overlap.status === "overlap") extra++;
      if (dupContent) extra++;
      const integrityWarning = formatIntegrityWarnings({
        duplicateFilename: false,
        duplicateContent: dupContent,
        overlapNote: overlap.status === "overlap" ? overlap.statusNote : undefined,
      });
      const partialOptional = !map.shippingKey || !map.refundsKey;
      const vstatus = deriveValidationStatus({
        schemaOk: true,
        rowsAccepted,
        rowsRead,
        rowsSkipped,
        extraWarnings: extra,
        partialOptional,
      });
      const importCheck = buildImportCheckSummary(filtered, map, rowsRead, rowsAccepted, rowsSkipped, extra);
      const reasonDetail = rowsSkipped > 0 ? "invalid or non-numeric values" : undefined;
      const vReason = validationReasonLine(vstatus, importCheck, reasonDetail);
      let legacyStatus: ImportChunk["status"] = overlap.status === "overlap" ? "overlap" : "loaded";
      let statusNote: string | undefined = overlap.statusNote;
      if (vstatus === "accepted_warnings" || vstatus === "partial") {
        legacyStatus = "warning";
      }
      const range = csvSummaryDateRange(filtered);
      const chunk: ImportChunk = {
        id: newImportId(),
        fileName: file.name,
        data: filtered,
        gameLabel: game,
        importedAtIso: new Date().toISOString(),
        dateFromIso: range ? range.from.toISOString() : null,
        dateToIso: range ? range.to.toISOString() : null,
        status: legacyStatus,
        statusNote,
        importMapping: {
          kind: "summary",
          mapped: true,
          rowCount: rowsAccepted,
          missingRequired: map.missingRequired,
          detectedHeaders: data.headers,
        },
        validationStatus: vstatus,
        validationReasonLine: vReason,
        importCheck,
        contentFingerprint: fp,
        integrityWarning,
      };
      next.push(chunk);
      batchAny++;
      filesAccepted++;
      previewUpdate = buildImportPreviewPayload(`Sales Summary (${file.name})`, filtered);
    } finally {
      onProgress(null);
    }
    if (importPerfEnabled()) {
      logImportPerf("import_summary_file", now() - tFile, { name: file.name });
    }
  }

  if (importPerfEnabled()) {
    logImportPerf("import_summary_files_batch", now() - tPipe, { files: files.length });
  }

  return {
    chunks: next,
    previewUpdate,
    batchDup,
    filesAccepted,
    filesRejected,
    batchAny,
    limitHit,
    filenameDuplicateSkips,
  };
}
