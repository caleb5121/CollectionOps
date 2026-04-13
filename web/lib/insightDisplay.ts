/**
 * Split a coaching line into a short bold takeaway + optional supporting sentence.
 * Uses the first ". " boundary when it yields a reasonable first chunk.
 */
export function splitInsightLine(text: string): { takeaway: string; detail: string | null } {
  const t = text.trim();
  if (!t) return { takeaway: "", detail: null };

  const idx = t.indexOf(". ");
  if (idx >= 12 && idx <= 160 && idx < t.length - 4) {
    const first = t.slice(0, idx + 1).trim();
    const rest = t.slice(idx + 2).trim();
    if (rest.length >= 8) {
      return { takeaway: first, detail: rest };
    }
  }

  const mdash = t.match(/^(.+?)\s[—–-]\s(.+)$/);
  if (mdash && mdash[1].length >= 8 && mdash[2].length >= 8) {
    return { takeaway: mdash[1].trim(), detail: mdash[2].trim() };
  }

  return { takeaway: t, detail: null };
}
