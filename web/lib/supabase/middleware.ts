import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { DEV_ACCESS_COOKIE, isLocalDevelopmentRequestHost } from "../devAccess";
import { isSupabaseConfigured } from "./client";

const PUBLIC_EXACT_PATHS = new Set(["/", "/login", "/signup", "/privacy", "/terms", "/contact"]);
const PUBLIC_PREFIX_PATHS = ["/auth/callback"];
const DEMO_COOKIE = "cardops_public_demo";
const DEMO_ALLOWED_PATHS = new Set(["/data", "/dashboard"]);

function normalizePathname(pathname: string): string {
  if (!pathname) return "/";
  if (pathname === "/") return "/";
  return pathname.replace(/\/+$/, "") || "/";
}

function isTruthyDemoParam(value: string | null): boolean {
  if (!value) return false;
  const v = value.trim().toLowerCase();
  return v === "1" || v === "true" || v === "yes";
}

function isPublicPath(pathname: string): boolean {
  if (PUBLIC_EXACT_PATHS.has(pathname)) return true;
  return PUBLIC_PREFIX_PATHS.some((prefix) => pathname.startsWith(prefix));
}

function isBypassedPath(pathname: string): boolean {
  // Never auth-gate API routes via middleware redirects.
  return pathname.startsWith("/api/");
}

/**
 * Refreshes the Supabase session from cookies and returns the outgoing response.
 * Redirect rules:
 * - Logged in + `/` -> `/dashboard`
 * - Logged out + protected app route -> `/login`
 */
export async function updateSession(request: NextRequest) {
  const pathname = normalizePathname(request.nextUrl.pathname);
  const wantsDemo = isTruthyDemoParam(request.nextUrl.searchParams.get("demo"));
  const demoCookie = request.cookies.get(DEMO_COOKIE)?.value === "1";
  const isDemoPath = DEMO_ALLOWED_PATHS.has(pathname);
  const shouldAllowDemo = isDemoPath && (wantsDemo || demoCookie);
  const withRequestHeaders = (demoAllowed: boolean) => {
    const headers = new Headers(request.headers);
    headers.set("x-cardops-pathname", pathname);
    headers.set("x-cardops-demo-allowed", demoAllowed ? "1" : "0");
    return NextResponse.next({ request: { headers } });
  };

  if (!isSupabaseConfigured()) {
    if (pathname === "/data" && wantsDemo) {
      const res = withRequestHeaders(true);
      res.cookies.set(DEMO_COOKIE, "1", {
        path: "/",
        httpOnly: true,
        sameSite: "lax",
        secure: request.nextUrl.protocol === "https:",
        maxAge: 60 * 60 * 6,
      });
      return res;
    }
    if (pathname === "/dashboard" && demoCookie) {
      return withRequestHeaders(true);
    }
    if (pathname === "/data" && demoCookie && !wantsDemo) {
      const url = request.nextUrl.clone();
      url.searchParams.set("demo", "1");
      return NextResponse.redirect(url);
    }
    if (isDemoPath && !shouldAllowDemo) {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = "/login";
      redirectUrl.search = "";
      return NextResponse.redirect(redirectUrl);
    }
    return withRequestHeaders(false);
  }

  let supabaseResponse = withRequestHeaders(shouldAllowDemo);

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });
          supabaseResponse = withRequestHeaders(shouldAllowDemo);
          cookiesToSet.forEach(({ name, value, options }) => {
            supabaseResponse.cookies.set(name, value, options);
          });
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const host = request.headers.get("host");
  const devCookie = request.cookies.get(DEV_ACCESS_COOKIE)?.value ?? "";
  const isLocalDevBypass = isLocalDevelopmentRequestHost(host) && ["caleb", "empty", "demo"].includes(devCookie);

  if (isBypassedPath(pathname)) {
    return supabaseResponse;
  }

  if ((user || isLocalDevBypass) && pathname === "/") {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/dashboard";
    redirectUrl.search = "";
    const redirectResponse = NextResponse.redirect(redirectUrl);
    supabaseResponse.cookies.getAll().forEach((c) => {
      redirectResponse.cookies.set(c.name, c.value);
    });
    return redirectResponse;
  }

  if (!user && !isLocalDevBypass && isDemoPath) {
    if (pathname === "/data" && demoCookie && !wantsDemo) {
      const url = request.nextUrl.clone();
      url.searchParams.set("demo", "1");
      const redirectResponse = NextResponse.redirect(url);
      supabaseResponse.cookies.getAll().forEach((c) => {
        redirectResponse.cookies.set(c.name, c.value);
      });
      return redirectResponse;
    }

    if (shouldAllowDemo) {
      if (!demoCookie) {
        supabaseResponse.cookies.set(DEMO_COOKIE, "1", {
          path: "/",
          httpOnly: true,
          sameSite: "lax",
          secure: request.nextUrl.protocol === "https:",
          maxAge: 60 * 60 * 6,
        });
      }
      return supabaseResponse;
    }
  }

  const isPublic = isPublicPath(pathname);
  if (!user && !isLocalDevBypass && !isPublic) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/login";
    redirectUrl.search = "";
    const redirectResponse = NextResponse.redirect(redirectUrl);
    supabaseResponse.cookies.getAll().forEach((c) => {
      redirectResponse.cookies.set(c.name, c.value);
    });
    return redirectResponse;
  }

  return supabaseResponse;
}
