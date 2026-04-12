/**
 * User-facing copy for supported TCGplayer imports and unmapped files.
 * CardOps does not auto-fix or guess unknown formats - messaging stays explicit.
 */

export const TCGPLAYER_SUPPORTED_FORMATS_LINE =
  "Supports standard TCGplayer Order List and Sales Summary exports.";

export const UNMAPPED_COLUMN_WARNING_LINES = [
  "File loaded, but required columns were not recognized.",
  "This format is not supported for calculations.",
  "Please upload standard TCGplayer exports.",
] as const;

/** Single string for tooltips / titles (native title shows newlines on some browsers). */
export function unmappedColumnWarningTitle(): string {
  return UNMAPPED_COLUMN_WARNING_LINES.join("\n");
}

/**
 * Single-line status for rejected imports (card row + Import check). Keeps wording consistent.
 */
export function formatImportFileRejectionMessage(reasonLine: string): string {
  const r = reasonLine.trim();
  if (!r) return "File rejected";
  const low = r.toLowerCase();
  if (low.includes("no data rows")) return "File rejected — no data rows";
  if (low.startsWith("wrong slot")) return "File rejected — wrong file type for this slot";
  if (low.includes("unrecognized headers")) return "File rejected — invalid format";
  if (low.includes("no valid rows")) return "File rejected — invalid data in rows";
  if (low.startsWith("missing required column")) {
    const detail = r.replace(/^missing required column:?\s*/i, "").trim();
    return detail
      ? `File rejected — missing required column: ${detail}`
      : "File rejected — missing required column";
  }
  if (r.length > 120) return `File rejected — ${r.slice(0, 117)}…`;
  return `File rejected — ${r}`;
}

/** Tooltip: what to upload (no auto-remap promise). */
export const IMPORT_FILE_TYPES_HELP_TOOLTIP = `Order List CSV - TCGplayer's Order List export (one row per order with dates and amounts). Upload it here for Trends, date coverage, and order-value mix.

Sales Summary CSV - TCGplayer's Sales Summary export (period rollups: gross, fees, net). Upload it here for dashboard totals and fees.

Upload label: Pick the label that matches the TCGplayer filter you used before export. Real Order List CSVs do not include a reliable game or product-line column in each row - CardOps keeps the label you choose with each file, not values parsed from the sheet.

Other spreadsheets are not converted or guessed yet; use the standard TCGplayer CSVs above for calculations.`;
