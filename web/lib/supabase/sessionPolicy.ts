import { parse, serialize, type SerializeOptions } from "cookie";

/** Client-readable flag: sent with magic-link flow so the callback can shape auth cookies. */
export const AUTH_REMEMBER_COOKIE_NAME = "cardops-auth-remember";

export const AUTH_LAST_EMAIL_STORAGE_KEY = "cardops-last-auth-email";

export function rememberDevicePreferred(cookieValue: string | undefined | null): boolean {
  if (cookieValue == null || cookieValue === "") return true;
  return cookieValue !== "0";
}

export function readRememberDeviceFromCookieHeader(cookieHeader: string | null | undefined): boolean {
  if (!cookieHeader) return true;
  const all = parse(cookieHeader);
  return rememberDevicePreferred(all[AUTH_REMEMBER_COOKIE_NAME]);
}

export function readRememberDeviceFromBrowserDocument(): boolean {
  if (typeof document === "undefined") return true;
  return readRememberDeviceFromCookieHeader(document.cookie);
}

export function isSupabaseAuthSessionCookieName(name: string): boolean {
  return name.startsWith("sb-") && name.includes("auth-token");
}

type MutableCookieOpts = SerializeOptions & { maxAge?: number; expires?: Date; name?: string };

/**
 * When "remember this device" is off, persist Supabase session only for the browser session
 * (strip Max-Age / Expires on auth-token cookies). Deletes (empty value / maxAge 0) are unchanged.
 */
export function applyRememberToSetCookieOptions(
  rememberDevice: boolean,
  cookieName: string,
  cookieValue: string,
  options: MutableCookieOpts,
): MutableCookieOpts {
  if (rememberDevice) return options;
  if (!isSupabaseAuthSessionCookieName(cookieName)) return options;
  if (!cookieValue) return options;
  if (options.maxAge === 0) return options;
  const rest = { ...options };
  delete rest.maxAge;
  delete rest.expires;
  delete rest.name;
  return rest;
}

export function writeRememberDevicePreference(rememberDevice: boolean): void {
  if (typeof document === "undefined") return;
  const opts: SerializeOptions = {
    path: "/",
    sameSite: "lax",
    secure: typeof window !== "undefined" && window.location.protocol === "https:",
    ...(rememberDevice ? { maxAge: 60 * 60 * 24 * 400 } : {}),
  };
  document.cookie = serialize(AUTH_REMEMBER_COOKIE_NAME, rememberDevice ? "1" : "0", opts);
}

export function clearRememberDeviceCookie(): void {
  if (typeof document === "undefined") return;
  document.cookie = serialize(AUTH_REMEMBER_COOKIE_NAME, "", {
    path: "/",
    maxAge: 0,
    sameSite: "lax",
    secure: typeof window !== "undefined" && window.location.protocol === "https:",
  });
}
