import { DEFAULT_GAME_FILTER, type GameFilterValue, GAME_FILTER_OPTIONS } from "./games";

/** Same storage key as legacy Account page - extended fields merge safely. */
export const ACCOUNT_PREFS_STORAGE_KEY = "cardops-account-preferences-v1";

export type DateFormatId = "locale" | "mdy" | "dmy" | "ymd";

export type AccountPreferences = {
  timezone: string;
  currency: string;
  dateFormat: DateFormatId;
  /** Primary game focus for labels (not from CSV inference). */
  primaryGame: GameFilterValue;
  /** When true, estimated shipping is subtracted in net (matches dashboard). */
  includeShippingInProfit: boolean;
};

export const DEFAULT_ACCOUNT_PREFERENCES: AccountPreferences = {
  timezone: "America/Los_Angeles",
  currency: "USD",
  dateFormat: "mdy",
  primaryGame: DEFAULT_GAME_FILTER,
  includeShippingInProfit: true,
};

function isGameFilterValue(v: unknown): v is GameFilterValue {
  return typeof v === "string" && (GAME_FILTER_OPTIONS as readonly string[]).includes(v);
}

export function loadAccountPreferences(): AccountPreferences {
  if (typeof window === "undefined") return DEFAULT_ACCOUNT_PREFERENCES;
  try {
    const raw = localStorage.getItem(ACCOUNT_PREFS_STORAGE_KEY);
    if (!raw) return DEFAULT_ACCOUNT_PREFERENCES;
    const p = JSON.parse(raw) as Record<string, unknown>;
    const dateFormat =
      p.dateFormat === "locale" || p.dateFormat === "mdy" || p.dateFormat === "dmy" || p.dateFormat === "ymd"
        ? p.dateFormat
        : DEFAULT_ACCOUNT_PREFERENCES.dateFormat;
    return {
      timezone: typeof p.timezone === "string" ? p.timezone : DEFAULT_ACCOUNT_PREFERENCES.timezone,
      currency: typeof p.currency === "string" ? p.currency : DEFAULT_ACCOUNT_PREFERENCES.currency,
      dateFormat,
      primaryGame: isGameFilterValue(p.primaryGame) ? p.primaryGame : DEFAULT_ACCOUNT_PREFERENCES.primaryGame,
      includeShippingInProfit:
        typeof p.includeShippingInProfit === "boolean"
          ? p.includeShippingInProfit
          : DEFAULT_ACCOUNT_PREFERENCES.includeShippingInProfit,
    };
  } catch {
    return DEFAULT_ACCOUNT_PREFERENCES;
  }
}

export function saveAccountPreferences(p: AccountPreferences): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(ACCOUNT_PREFS_STORAGE_KEY, JSON.stringify(p));
  } catch {
    /* ignore */
  }
}
