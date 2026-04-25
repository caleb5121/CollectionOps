"use client";

import type { AuthChangeEvent, Session, User } from "@supabase/supabase-js";
import React, { createContext, useCallback, useContext, useEffect, useState } from "react";

import { ACCOUNT_PREFS_STORAGE_KEY } from "../lib/accountPreferences";
import { CARDOPS_IMPORT_STORAGE_KEY } from "./DataProvider";
import { DEV_ACCESS_STORAGE_KEY, type DevAccessKind, isLocalDevelopmentClient } from "../lib/devAccess";
import { getSupabaseBrowserClient, isSupabaseConfigured } from "../lib/supabase/client";

/** Single identity: header, Account, and exports all read from this shape. */
export type AppUser = {
  storeName: string;
  email: string;
  avatarDataUrl: string | null;
  /** ISO date for “Member since” on Account. */
  joinedAtIso: string;
};

export const USER_PROFILE_STORAGE_KEY = "cardops-user-profile-v1";
/** Legacy local session key — cleared when Supabase session is active. */
export const AUTH_SESSION_STORAGE_KEY = "cardops-auth-session-v1";
const LEGACY_LOCAL_PROFILE_KEY = "cardops-local-profile-v1";

/** Former `DEFAULT_APP_USER` seed — remove so it is not treated as a real profile. */
const LEGACY_DEMO_STORE = "Sophia Card Shop";
const LEGACY_DEMO_EMAIL = "sophia.martinez@northridgecards.example";

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

function clearLegacyAuthSession(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(AUTH_SESSION_STORAGE_KEY);
  } catch {
    /* ignore */
  }
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
      if (data.storeName === LEGACY_DEMO_STORE && data.email === LEGACY_DEMO_EMAIL) {
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

function mergeProfileWithSupabaseUser(sbUser: User): AppUser {
  const email = (sbUser.email ?? "").trim();
  const profile = loadUserProfileFromStorage();
  const profileEmail = profile?.email?.trim().toLowerCase() ?? "";
  const sameAccount = !profileEmail || profileEmail === email.toLowerCase();

  const storeName = sameAccount
    ? (profile?.storeName?.trim() ?? "")
    : typeof sbUser.user_metadata?.store_name === "string"
      ? String(sbUser.user_metadata.store_name).trim()
      : "";

  const avatarDataUrl = sameAccount ? (profile?.avatarDataUrl ?? null) : null;

  const joinedAtIso =
    (sameAccount && profile?.joinedAtIso?.trim()) || sbUser.created_at || new Date().toISOString();

  return {
    storeName,
    email,
    avatarDataUrl,
    joinedAtIso,
  };
}

type AuthCtx = {
  user: AppUser | null;
  setUser: (next: AppUser | null) => void | Promise<void>;
  /** Sends a Supabase magic link / OTP email. `login` does not create new users; `signup` allows new users. */
  sendMagicLink: (email: string, kind: "login" | "signup") => Promise<{ error: string | null }>;
  /** Localhost-only developer shortcut auth (development only). */
  devLogin: (kind: DevAccessKind) => Promise<{ error: string | null }>;
  updateProfile: (patch: Partial<Pick<AppUser, "storeName" | "email" | "avatarDataUrl">>) => void;
};

const AuthContext = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUserState] = useState<AppUser | null>(null);

  const loadDevAccessUser = useCallback((): AppUser | null => {
    if (!isLocalDevelopmentClient()) return null;
    try {
      const raw = localStorage.getItem(DEV_ACCESS_STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as Record<string, unknown>;
      return normalizeUserRecord(parsed);
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    if (!isLocalDevelopmentClient()) return;
    let cancelled = false;
    void fetch("/api/dev-access/status")
      .then(async (res) => {
        if (!res.ok) return { active: false };
        return (await res.json()) as { active?: boolean };
      })
      .then((data) => {
        if (cancelled) return;
        const active = Boolean(data.active);
        if (!active) {
          try {
            localStorage.removeItem(DEV_ACCESS_STORAGE_KEY);
          } catch {
            /* ignore */
          }
          return;
        }
        const devUser = loadDevAccessUser();
        if (devUser) {
          setUserState(devUser);
          return;
        }
        void fetch("/api/dev-access/logout", { method: "POST" }).catch(() => {
          /* ignore */
        });
      })
      .catch(() => {
        if (cancelled) return;
      });
    return () => {
      cancelled = true;
    };
  }, [loadDevAccessUser]);

  useEffect(() => {
    const sb = getSupabaseBrowserClient();
    if (!sb) {
      setUserState(loadDevAccessUser());
      return;
    }

    void sb.auth.getSession().then(({ data }: { data: { session: Session | null } }) => {
      const { session } = data;
      if (session?.user) {
        clearLegacyAuthSession();
        const next = mergeProfileWithSupabaseUser(session.user);
        setUserState(next);
        persistUserProfile(next);
      } else {
        setUserState(loadDevAccessUser());
      }
    });

    const {
      data: { subscription },
    } = sb.auth.onAuthStateChange((_event: AuthChangeEvent, session: Session | null) => {
      if (session?.user) {
        clearLegacyAuthSession();
        const next = mergeProfileWithSupabaseUser(session.user);
        setUserState(next);
        persistUserProfile(next);
      } else {
        setUserState(loadDevAccessUser());
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [loadDevAccessUser]);

  useEffect(() => {
    if (!isSupabaseConfigured()) return;

    function onStorage(e: StorageEvent) {
      if (e.key !== USER_PROFILE_STORAGE_KEY) return;
      const sb = getSupabaseBrowserClient();
      if (!sb) return;
      void sb.auth.getSession().then(({ data }: { data: { session: Session | null } }) => {
        const { session } = data;
        if (session?.user) {
          setUserState(mergeProfileWithSupabaseUser(session.user));
        }
      });
    }

    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const setUser = useCallback(async (next: AppUser | null) => {
    if (next === null) {
      const sb = getSupabaseBrowserClient();
      if (sb) {
        await sb.auth.signOut();
      }
      if (isLocalDevelopmentClient()) {
        try {
          localStorage.removeItem(DEV_ACCESS_STORAGE_KEY);
        } catch {
          /* ignore */
        }
        try {
          await fetch("/api/dev-access/logout", { method: "POST" });
        } catch {
          /* ignore */
        }
      }
      clearLegacyAuthSession();
      setUserState(null);
      return;
    }
    setUserState(next);
    persistUserProfile(next);
  }, []);

  const sendMagicLink = useCallback(async (emailRaw: string, kind: "login" | "signup") => {
    const sb = getSupabaseBrowserClient();
    if (!sb) {
      return {
        error:
          "Supabase is not configured. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to your environment.",
      };
    }
    const email = emailRaw.trim();
    const { error } = await sb.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
        shouldCreateUser: kind === "signup",
      },
    });
    if (!error) return { error: null };
    return { error: mapMagicLinkError(error.message ?? "Could not send magic link.", kind) };
  }, []);

  const devLogin = useCallback(async (kind: DevAccessKind) => {
    if (!isLocalDevelopmentClient()) {
      return { error: "Developer access is only available on localhost in development." };
    }

    const profiles: Record<DevAccessKind, AppUser> = {
      caleb: {
        storeName: "Caleb Card Ops",
        email: "caleb.firebaugh@gmail.com",
        avatarDataUrl: null,
        joinedAtIso: new Date().toISOString(),
      },
      empty: {
        storeName: "New Test Store",
        email: "dev-empty-user@localhost.test",
        avatarDataUrl: null,
        joinedAtIso: new Date().toISOString(),
      },
      demo: {
        storeName: "Demo Data Store",
        email: "dev-demo-user@localhost.test",
        avatarDataUrl: null,
        joinedAtIso: new Date().toISOString(),
      },
    };

    try {
      const res = await fetch("/api/dev-access/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind }),
      });
      if (!res.ok) {
        return { error: "Could not start dev access session." };
      }
      const profile = profiles[kind];
      if (kind === "empty") {
        localStorage.removeItem(CARDOPS_IMPORT_STORAGE_KEY);
      }
      setUserState(profile);
      persistUserProfile(profile);
      localStorage.setItem(DEV_ACCESS_STORAGE_KEY, JSON.stringify(profile));
      return { error: null };
    } catch {
      return { error: "Could not start dev access session." };
    }
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
            email: trimmed || prev.email.trim() || "",
          };
        }
        persistUserProfile(next);
        return next;
      });
    },
    [],
  );

  return (
    <AuthContext.Provider value={{ user, setUser, sendMagicLink, devLogin, updateProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

function mapMagicLinkError(message: string, kind: "login" | "signup"): string {
  const m = message.toLowerCase();

  if (m.includes("too many") || m.includes("rate limit") || m.includes("security purposes")) {
    return "Too many emails sent. Please wait a few minutes and try again.";
  }

  if (kind === "login" && m.includes("signups not allowed for otp")) {
    return "No account found. Create an account first.";
  }

  return message;
}
