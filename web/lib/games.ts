/**
 * Supported trading card games for filtering.
 * Used by Dashboard, Trends, and future game-scoped metrics.
 */
export const GAME_FILTER_OPTIONS = [
  "All Games",
  "Magic",
  "Yu-Gi-Oh!",
  "Pokémon",
  "Disney Lorcana",
  "One Piece",
  "Digimon",
  "Star Wars: Unlimited",
  "Flesh and Blood",
] as const;

export type GameFilterValue = (typeof GAME_FILTER_OPTIONS)[number];

export const DEFAULT_GAME_FILTER: GameFilterValue = "All Games";

/** Games selectable on Import (label files before upload). One label per batch; use separate imports for each game. */
export const IMPORT_GAME_OPTIONS = [
  "Pokémon",
  "Yu-Gi-Oh!",
  "One Piece",
  "Magic",
  "All Games",
  "Disney Lorcana",
  "Digimon",
  "Flesh and Blood",
  "Star Wars: Unlimited",
  /** Optional: only when a single pair of files truly mixes multiple games. Prefer separate batches. */
  "Mixed",
  "Other",
] as const;

export type ImportGameId = (typeof IMPORT_GAME_OPTIONS)[number];
