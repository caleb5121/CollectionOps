import type { ImportChunk } from "./importMerge";

/**
 * Human-readable store context for the current workspace (merged uploads).
 * Uses the upload labels you chose on Imports (metadata per file). TCGplayer Order List
 * exports do not reliably include game/product line per row - CardOps does not infer game
 * from card titles or line items.
 */
export function getWorkspaceStoreLabel(chunks: ImportChunk[]): string {
  const labels = chunks.map((c) => c.gameLabel).filter((x): x is string => Boolean(x?.trim()));
  if (labels.length === 0) return "Unlabeled";
  const unique = new Set(labels);
  if (unique.size === 1) {
    const only = labels[0]!;
    if (only === "All Games" || only === "Mixed") return "Mixed store";
    return only;
  }
  return "Mixed store";
}

/** For sentences like "14 days of Pokémon sales" vs "mixed store data". */
export function describeAnalysisContext(days: number | null, storeLabel: string): string {
  const d =
    days != null && days > 0
      ? days === 1
        ? "1 day"
        : `${days} days`
      : "this period";
  const game =
    storeLabel === "Mixed store" || storeLabel === "All Games"
      ? "mixed store data"
      : storeLabel === "Unlabeled"
        ? "unlabeled store data"
        : `${storeLabel} sales`;
  return `Analyzing ${d} of ${game}`;
}
