"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
  ACCOUNT_PREFS_STORAGE_KEY,
  type AccountPreferences,
  DEFAULT_ACCOUNT_PREFERENCES,
  loadAccountPreferences,
  saveAccountPreferences,
} from "../lib/accountPreferences";

type Ctx = {
  prefs: AccountPreferences;
  ready: boolean;
  updatePrefs: (patch: Partial<AccountPreferences>) => void;
  setPrefs: (next: AccountPreferences) => void;
};

const AccountPreferencesContext = createContext<Ctx | null>(null);

export function AccountPreferencesProvider({ children }: { children: React.ReactNode }) {
  const [prefs, setPrefsState] = useState<AccountPreferences>(DEFAULT_ACCOUNT_PREFERENCES);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const id = requestAnimationFrame(() => {
      setPrefsState(loadAccountPreferences());
      setReady(true);
    });
    return () => cancelAnimationFrame(id);
  }, []);

  const setPrefs = useCallback((next: AccountPreferences) => {
    setPrefsState(next);
    saveAccountPreferences(next);
  }, []);

  const updatePrefs = useCallback((patch: Partial<AccountPreferences>) => {
    setPrefsState((prev) => {
      const next = { ...prev, ...patch };
      saveAccountPreferences(next);
      return next;
    });
  }, []);

  useEffect(() => {
    function onStorage(e: StorageEvent) {
      if (e.key !== ACCOUNT_PREFS_STORAGE_KEY) return;
      setPrefsState(loadAccountPreferences());
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const value = useMemo(
    () => ({ prefs, ready, updatePrefs, setPrefs }),
    [prefs, ready, updatePrefs, setPrefs]
  );

  return <AccountPreferencesContext.Provider value={value}>{children}</AccountPreferencesContext.Provider>;
}

export function useAccountPreferences() {
  const ctx = useContext(AccountPreferencesContext);
  if (!ctx) throw new Error("useAccountPreferences must be used within AccountPreferencesProvider");
  return ctx;
}
