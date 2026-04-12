"use client";

import React, { createContext, useCallback, useContext, useEffect, useLayoutEffect, useState } from "react";
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
export const AUTH_SESSION_STORAGE_KEY = "cardops-auth-session-v1";
const LEGACY_LOCAL_PROFILE_KEY = "cardops-local-profile-v1";

/** Former `DEFAULT_APP_USER` seed — remove so it is not treated as a real profile. */
const LEGACY_DEMO_STORE = "Sophia Card Shop";
const LEGACY_DEMO_EMAIL = "sophia.martinez@northridgecards.example";

export type AuthSessionV1 = {
  authEmail: string;
  signedInAtIso: string;
};

/** Human-readable label from the email local-part when no store name is set. */
export function accountDisplayName(user: AppUser): string {
  const name = user.storeName.trim();
  if (name) return name;
  return fallbackLabelFromEmail(user.email);
}

export function fallbackLabelFromEmail(email: string): string {
  const t = email.trim();
  if (!t) return "Account";
  const local = t.split("@")[0]?.trim();
  if (!local) return "Account";
  const spaced = local.replace(/[._-]+/g, " ").replace(/\s+/g, " ").trim();
  return spaced || "Account";
}

function loadAuthSession(): AuthSessionV1 | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(AUTH_SESSION_STORAGE_KEY);
    if (!raw) return null;
    const o = JSON.parse(raw) as Record<string, unknown>;
    const authEmail = typeof o.authEmail === "string" ? o.authEmail.trim() : "";
    const signedInAtIso = typeof o.signedInAtIso === "string" ? o.signedInAtIso : "";
    if (!authEmail || !signedInAtIso) return null;
    return { authEmail, signedInAtIso };
  } catch {
    return null;
  }
}

function persistAuthSession(session: AuthSessionV1): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(AUTH_SESSION_STORAGE_KEY, JSON.stringify(session));
  } catch {
    /* quota or privacy mode */
  }
}

function clearAuthSession(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(AUTH_SESSION_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

function mergeSessionWithProfile(session: AuthSessionV1, profile: AppUser | null): AppUser {
  const email = session.authEmail.trim();
  return {
    storeName: profile?.storeName?.trim() ?? "",
    email,
    avatarDataUrl: profile?.avatarDataUrl ?? null,
    joinedAtIso: profile?.joinedAtIso?.trim() || session.signedInAtIso,
  };
}

/** Accept stored JSON; map legacy `displayName` to `storeName`. */
function normalizeUserRecord(raw: Record<string, unknown>): AppUser | null {
  const storeName =
    typeof raw.storeName === "string" && raw.storeName.trim()
      ? raw.storeName.trim()
      : typeof raw.displayName === "string" && raw.displayName.trim()
        ? raw.displayName.trim()
        : "";
  const email = typeof raw.email === "string" ? raw.email.trim() : "";
  const avatarDataUrl =
    raw.avatarDataUrl === null
      ? null
      : typeof raw.avatarDataUrl === "string"
        ? raw.avatarDataUrl
        : null;
  const joinedAtIso =
    typeof raw.joinedAtIso === "string" && raw.joinedAtIso.trim()
      ? raw.joinedAtIso.trim()
      : new Date().toISOString();
  if (!storeName && !email) return null;
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
      const data = JSON.parse(rawUser) as Record<string, unknown>;
      if (
        data.storeName === LEGACY_DEMO_STORE &&
        data.email === LEGACY_DEMO_EMAIL
      ) {
        localStorage.removeItem(USER_PROFILE_STORAGE_KEY);
      } else {
        const parsed = normalizeUserRecord(data);
        if (parsed) return parsed;
      }
    }

    const leg = localStorage.getItem(LEGACY_LOCAL_PROFILE_KEY);
    if (leg) {
      const p = JSON.parse(leg) as Record<string, unknown>;
      const migrated: AppUser = {
        storeName:
          typeof p.displayName === "string" && p.displayName.trim() ? p.displayName.trim() : "",
        email: typeof p.email === "string" ? p.email.trim() : "",
        avatarDataUrl: typeof p.avatarDataUrl === "string" ? p.avatarDataUrl : null,
        joinedAtIso: new Date().toISOString(),
      };
      localStorage.removeItem(LEGACY_LOCAL_PROFILE_KEY);
      if (!migrated.storeName && !migrated.email) return null;
      persistUserProfile(migrated);
      return migrated;
    }

    const prefsRaw = localStorage.getItem(ACCOUNT_PREFS_STORAGE_KEY);
    if (prefsRaw) {
      const prefs = JSON.parse(prefsRaw) as Record<string, unknown>;
      const nick = prefs.storeNickname;
      if (typeof nick === "string" && nick.trim()) {
        const migrated: AppUser = {
          storeName: nick.trim(),
          email: "",
          avatarDataUrl: null,
          joinedAtIso: new Date().toISOString(),
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

function hydrateUserFromStorage(): AppUser | null {
  const session = loadAuthSession();
  if (!session) return null;
  const profile = loadUserProfileFromStorage();
  return mergeSessionWithProfile(session, profile);
}

type AuthCtx = {
  user: AppUser | null;
  setUser: (user: AppUser | null) => void;
  signInWithEmail: (email: string) => void;
  updateProfile: (patch: Partial<Pick<AppUser, "storeName" | "email" | "avatarDataUrl">>) => void;
};

const AuthContext = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUserState] = useState<AppUser | null>(null);

  useLayoutEffect(() => {
    const hydrated = hydrateUserFromStorage();
    /* eslint-disable react-hooks/set-state-in-effect -- restore session + profile before paint */
    setUserState(hydrated);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  useEffect(() => {
    function onStorage(e: StorageEvent) {
      if (!e.newValue) {
        if (e.key === AUTH_SESSION_STORAGE_KEY || e.key === USER_PROFILE_STORAGE_KEY) {
          setUserState(hydrateUserFromStorage());
        }
        return;
      }
      if (e.key === USER_PROFILE_STORAGE_KEY) {
        try {
          const session = loadAuthSession();
          if (!session) return;
          const parsed = normalizeUserRecord(JSON.parse(e.newValue) as Record<string, unknown>);
          setUserState(mergeSessionWithProfile(session, parsed));
        } catch {
          /* ignore */
        }
        return;
      }
      if (e.key === AUTH_SESSION_STORAGE_KEY) {
        try {
          const o = JSON.parse(e.newValue) as Record<string, unknown>;
          const authEmail = typeof o.authEmail === "string" ? o.authEmail.trim() : "";
          const signedInAtIso = typeof o.signedInAtIso === "string" ? o.signedInAtIso : "";
          if (!authEmail || !signedInAtIso) {
            setUserState(null);
            return;
          }
          const session: AuthSessionV1 = { authEmail, signedInAtIso };
          const profile = loadUserProfileFromStorage();
          setUserState(mergeSessionWithProfile(session, profile));
        } catch {
          /* ignore */
        }
      }
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const setUser = useCallback((next: AppUser | null) => {
    setUserState(next);
    if (next) {
      const prev = loadAuthSession();
      const signedInAtIso = prev?.signedInAtIso ?? new Date().toISOString();
      persistAuthSession({ authEmail: next.email.trim(), signedInAtIso });
      persistUserProfile(next);
    } else {
      clearAuthSession();
    }
  }, []);

  const signInWithEmail = useCallback((emailRaw: string) => {
    const authEmail = emailRaw.trim();
    if (!authEmail) return;
    const prev = loadAuthSession();
    const signedInAtIso =
      prev && prev.authEmail === authEmail ? prev.signedInAtIso : new Date().toISOString();
    const session: AuthSessionV1 = { authEmail, signedInAtIso };
    persistAuthSession(session);
    const profile = loadUserProfileFromStorage();
    const next = mergeSessionWithProfile(session, profile);
    setUserState(next);
    persistUserProfile(next);
  }, []);

  const updateProfile = useCallback(
    (patch: Partial<Pick<AppUser, "storeName" | "email" | "avatarDataUrl">>) => {
      setUserState((prev) => {
        if (!prev) return prev;
        let next: AppUser = { ...prev, ...patch };
        if (typeof patch.email === "string") {
          const trimmed = patch.email.trim();
          next = {
            ...next,
            email: trimmed || prev.email.trim() || loadAuthSession()?.authEmail.trim() || "",
          };
        }
        persistUserProfile(next);
        const sess = loadAuthSession();
        if (sess && next.email.trim()) {
          persistAuthSession({ authEmail: next.email.trim(), signedInAtIso: sess.signedInAtIso });
        }
        return next;
      });
    },
    [],
  );

  return (
    <AuthContext.Provider value={{ user, setUser, signInWithEmail, updateProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
