"use client";

import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { ACCOUNT_PREFS_STORAGE_KEY } from "../lib/accountPreferences";

/** Single identity: header, Account, and exports all read from this shape. */
export type AppUser = {
  storeName: string;
  email: string;
  avatarDataUrl: string | null;
  /** ISO date for “Member since” on Account. */
  joinedAtIso: string;
};

export const USER_PROFILE_STORAGE_KEY = "cardops-user-profile-v1";
const LEGACY_LOCAL_PROFILE_KEY = "cardops-local-profile-v1";

export const DEFAULT_APP_USER: AppUser = {
  storeName: "Sophia Card Shop",
  email: "sophia.martinez@northridgecards.example",
  avatarDataUrl: null,
  joinedAtIso: "2025-06-03T15:00:00.000Z",
};

/** Accept stored JSON; map legacy `displayName` to `storeName`. */
function normalizeUserRecord(raw: Record<string, unknown>): AppUser | null {
  const storeName =
    typeof raw.storeName === "string" && raw.storeName.trim()
      ? raw.storeName.trim()
      : typeof raw.displayName === "string" && raw.displayName.trim()
        ? raw.displayName.trim()
        : null;
  if (!storeName) return null;
  const email = typeof raw.email === "string" ? raw.email : "";
  const avatarDataUrl =
    raw.avatarDataUrl === null
      ? null
      : typeof raw.avatarDataUrl === "string"
        ? raw.avatarDataUrl
        : null;
  const joinedAtIso = typeof raw.joinedAtIso === "string" ? raw.joinedAtIso : DEFAULT_APP_USER.joinedAtIso;
  return { storeName, email, avatarDataUrl, joinedAtIso };
}

export function persistUserProfile(u: AppUser): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(USER_PROFILE_STORAGE_KEY, JSON.stringify(u));
  } catch {
    /* quota or privacy mode */
  }
}

export function loadUserProfileFromStorage(): AppUser | null {
  if (typeof window === "undefined") return null;
  try {
    const rawUser = localStorage.getItem(USER_PROFILE_STORAGE_KEY);
    if (rawUser) {
      const parsed = normalizeUserRecord(JSON.parse(rawUser) as Record<string, unknown>);
      if (parsed) return parsed;
    }

    const leg = localStorage.getItem(LEGACY_LOCAL_PROFILE_KEY);
    if (leg) {
      const p = JSON.parse(leg) as Record<string, unknown>;
      const migrated: AppUser = {
        storeName:
          typeof p.displayName === "string" && p.displayName.trim()
            ? p.displayName.trim()
            : DEFAULT_APP_USER.storeName,
        email: typeof p.email === "string" ? p.email : "",
        avatarDataUrl:
          typeof p.avatarDataUrl === "string" ? p.avatarDataUrl : null,
        joinedAtIso: DEFAULT_APP_USER.joinedAtIso,
      };
      localStorage.removeItem(LEGACY_LOCAL_PROFILE_KEY);
      persistUserProfile(migrated);
      return migrated;
    }

    const prefsRaw = localStorage.getItem(ACCOUNT_PREFS_STORAGE_KEY);
    if (prefsRaw) {
      const prefs = JSON.parse(prefsRaw) as Record<string, unknown>;
      const nick = prefs.storeNickname;
      if (typeof nick === "string" && nick.trim()) {
        const migrated: AppUser = {
          ...DEFAULT_APP_USER,
          storeName: nick.trim(),
        };
        persistUserProfile(migrated);
        return migrated;
      }
    }
  } catch {
    /* ignore */
  }
  return null;
}

type AuthCtx = {
  user: AppUser | null;
  setUser: (user: AppUser | null) => void;
  updateProfile: (patch: Partial<Pick<AppUser, "storeName" | "email" | "avatarDataUrl">>) => void;
};

const AuthContext = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUserState] = useState<AppUser | null>(() => DEFAULT_APP_USER);

  useEffect(() => {
    const loaded = loadUserProfileFromStorage();
    if (loaded) {
      /* eslint-disable react-hooks/set-state-in-effect -- hydrate persisted profile on mount */
      setUserState(loaded);
      /* eslint-enable react-hooks/set-state-in-effect */
    }
  }, []);

  useEffect(() => {
    function onStorage(e: StorageEvent) {
      if (e.key !== USER_PROFILE_STORAGE_KEY || !e.newValue) return;
      try {
        const parsed = normalizeUserRecord(JSON.parse(e.newValue) as Record<string, unknown>);
        if (parsed) {
          setUserState(parsed);
        }
      } catch {
        /* ignore */
      }
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const setUser = useCallback((next: AppUser | null) => {
    setUserState(next);
    if (next) persistUserProfile(next);
  }, []);

  const updateProfile = useCallback((patch: Partial<Pick<AppUser, "storeName" | "email" | "avatarDataUrl">>) => {
    setUserState((prev) => {
      if (!prev) return prev;
      const next = { ...prev, ...patch };
      persistUserProfile(next);
      return next;
    });
  }, []);

  return (
    <AuthContext.Provider value={{ user, setUser, updateProfile }}>{children}</AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
