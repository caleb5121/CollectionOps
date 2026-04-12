/**
 * Intended scale (browser session, local processing):
 * - Small: under 1k rows — fast path, sync filter
 * - Medium: 1k–10k — worker parse + chunked validation as needed
 * - Super sellers: 10k–50k+ — same pipeline; progress UI; preview capped
 */

/** Rows: above this, row filtering yields to the event loop in chunks (keeps UI responsive). */
export const IMPORT_FILTER_CHUNK_SIZE = 2_000;

/** Parsed row count at/above this triggers “large import” UX (informational). */
export const IMPORT_LARGE_ROW_THRESHOLD = 5_000;

/** Byte size hint for choosing worker parse vs main thread (small files stay sync). */
export const IMPORT_WORKER_PARSE_MIN_BYTES = 512 * 1024;

/** Preview table: first + last slice sizes for capped previews. */
export const IMPORT_PREVIEW_HEAD_ROWS = 10;
export const IMPORT_PREVIEW_TAIL_ROWS = 10;

/** Max validation / issue strings surfaced in dashboard-style alerts. */
export const IMPORT_MAX_ISSUES_DISPLAYED = 10;

/** Max diagnostic lines on a file row (rejection / integrity). */
export const IMPORT_MAX_FILE_DIAGNOSTIC_LINES = 8;
