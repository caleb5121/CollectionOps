/**
 * Normalize CSV headers for matching: lowercase, trim, collapse spaces/underscores/punctuation.
 * "Order Date", "order_date", "ORDER DATE" → "orderdate"
 */
export function normalizeHeaderKey(header: string): string {
  return header
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

/** Build a map from normalized key → first original header string (preserves row access key). */
export function buildHeaderLookup(headers: string[]): Map<string, string> {
  const m = new Map<string, string>();
  for (const h of headers) {
    const raw = String(h ?? "").trim();
    if (!raw) continue;
    const k = normalizeHeaderKey(raw);
    if (!m.has(k)) m.set(k, raw);
  }
  return m;
}

export function hasNormalizedHeader(headers: string[], ...candidates: string[]): boolean {
  const lookup = buildHeaderLookup(headers);
  for (const c of candidates) {
    if (lookup.has(normalizeHeaderKey(c))) return true;
  }
  return false;
}

/** First matching original header name, or null. */
export function findHeaderByNormalizedCandidates(headers: string[], candidates: string[]): string | null {
  const lookup = buildHeaderLookup(headers);
  for (const c of candidates) {
    const orig = lookup.get(normalizeHeaderKey(c));
    if (orig) return orig;
  }
  return null;
}
