import { createBrowserClient } from "@supabase/ssr";
import { parse, serialize } from "cookie";

import {
  applyRememberToSetCookieOptions,
  readRememberDeviceFromBrowserDocument,
} from "./sessionPolicy";

let browserClient: ReturnType<typeof createBrowserClient> | null = null;

export function isSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return Boolean(url && key && /^https?:\/\//.test(url.trim()));
}

/** Browser Supabase client (singleton). Returns null if env is missing. */
export function getSupabaseBrowserClient() {
  if (typeof window === "undefined") return null;
  if (!isSupabaseConfigured()) return null;
  if (!browserClient) {
    browserClient = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            const parsed = parse(document.cookie);
            return Object.keys(parsed).map((name) => ({
              name,
              value: parsed[name] ?? "",
            }));
          },
          setAll(cookiesToSet, headers) {
            const remember = readRememberDeviceFromBrowserDocument();
            void headers;
            cookiesToSet.forEach(({ name, value, options }) => {
              const opts = applyRememberToSetCookieOptions(remember, name, value, {
                ...options,
              });
              document.cookie = serialize(name, value ?? "", opts);
            });
          },
        },
        auth: {
          persistSession: true,
          autoRefreshToken: true,
        },
      },
    );
  }
  return browserClient;
}
