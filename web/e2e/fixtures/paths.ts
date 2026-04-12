import path from "path";

/**
 * Committed CSV fixtures (`web/e2e/fixtures`).
 * Uses `process.cwd()` so paths resolve when Playwright loads TS outside the fixtures folder.
 */
export const FIXTURES_DIR = path.join(process.cwd(), "e2e", "fixtures");

export const ORDER_VALID = path.join(FIXTURES_DIR, "orders-valid.csv");
/** Two June 2024 dates in the same Monday-start week — one weekly bucket for Trends WoW empty state. */
export const ORDER_VALID_SINGLE_WEEK = path.join(FIXTURES_DIR, "orders-valid-single-week.csv");
/** Jun 3 + Jun 9 (same ISO week) and Jun 10 (next week) — exactly two weekly buckets for WoW e2e. */
export const ORDER_WOW_TWO_WEEKS = path.join(FIXTURES_DIR, "orders-wow-two-weeks.csv");
export const ORDER_UNMAPPED = path.join(FIXTURES_DIR, "orders-unmapped.csv");
export const ORDER_MIXED_POKEMON = path.join(FIXTURES_DIR, "orders-mixed-pokemon.csv");
export const ORDER_MIXED_ONEPIECE = path.join(FIXTURES_DIR, "orders-mixed-onepiece.csv");
export const SUMMARY_VALID = path.join(FIXTURES_DIR, "summary-valid.csv");
/** Filename encodes June 2024 — aligns with `orders-valid.csv` for a fully “ready” batch in e2e. */
export const SUMMARY_JUNE_2024 = path.join(FIXTURES_DIR, "summary-june-2024.csv");
/** Matches `orders-valid-single-week.csv` (2 orders, $60 gross). */
export const SUMMARY_JUNE_2ORDERS = path.join(FIXTURES_DIR, "summary-june-2orders.csv");
/** Filename encodes April 2024 — used for time-alignment mismatch vs June order dates. */
export const SUMMARY_APRIL_2024 = path.join(FIXTURES_DIR, "summary-april-2024.csv");
