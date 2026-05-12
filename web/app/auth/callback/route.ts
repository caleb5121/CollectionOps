import { createServerClient } from "@supabase/ssr";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { isSupabaseConfigured } from "@/lib/supabase/client";
import {
  applyRememberToSetCookieOptions,
  AUTH_REMEMBER_COOKIE_NAME,
  rememberDevicePreferred,
} from "@/lib/supabase/sessionPolicy";

function safeInternalPath(next: string | null): string {
  const fallback = "/dashboard";
  if (!next) return fallback;
  const t = next.trim();
  if (!t.startsWith("/") || t.startsWith("//")) return fallback;
  if (t.includes("\\")) return fallback;
  return t;
}

export async function GET(request: NextRequest) {
  const url = request.nextUrl.clone();
  const code = url.searchParams.get("code");
  const nextPath = safeInternalPath(url.searchParams.get("next"));

  if (!isSupabaseConfigured()) {
    return NextResponse.redirect(new URL("/login?error=config", url.origin));
  }

  if (code) {
    const remember = rememberDevicePreferred(request.cookies.get(AUTH_REMEMBER_COOKIE_NAME)?.value);
    const redirectUrl = new URL(nextPath, url.origin);
    const response = NextResponse.redirect(redirectUrl);

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet, headers) {
            cookiesToSet.forEach(({ name, value, options }) => {
              const opts = applyRememberToSetCookieOptions(remember, name, value, { ...options });
              response.cookies.set(name, value, opts);
            });
            Object.entries(headers ?? {}).forEach(([key, val]) => {
              if (typeof val === "string") response.headers.set(key, val);
            });
          },
        },
      },
    );

    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return response;
    }
  }

  return NextResponse.redirect(new URL("/login?error=auth", url.origin));
}
