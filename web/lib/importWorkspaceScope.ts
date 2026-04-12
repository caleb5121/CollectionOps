import type { ImportChunk } from "./importMerge";
import type { TrendsImportSegment } from "./trendsSeriesFromImports";

export function filterImportChunksByGame(chunks: ImportChunk[], game: "all" | string): ImportChunk[] {
  if (game === "all") return chunks;
  return chunks.filter((c) => (c.gameLabel?.trim() ?? "") === game);
}

export function distinctGameLabelsFromChunks(chunks: ImportChunk[]): string[] {
  const s = new Set<string>();
  for (const c of chunks) {
    const g = c.gameLabel?.trim();
    if (g) s.add(g);
  }
  return [...s].sort((a, b) => a.localeCompare(b));
}

/** Drops segments with no matching order files after filtering by game label. */
export function filterTrendsSegmentByGame(
  segment: TrendsImportSegment,
  game: "all" | string,
): TrendsImportSegment | null {
  if (game === "all") return segment;
  const orderImports = filterImportChunksByGame(segment.orderImports, game);
  const summaryImports = filterImportChunksByGame(segment.summaryImports, game);
  if (orderImports.length === 0) return null;
  return { orderImports, summaryImports };
}
