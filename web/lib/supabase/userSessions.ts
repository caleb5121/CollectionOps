/**
 * Visit tracking for `user_sessions` (see `supabase/migrations/*_user_sessions.sql`).
 * `recordUserSessionVisit` calls a DB RPC: insert on first visit, otherwise updates
 * `last_visit`, increments `visit_count`, sets `is_returning`. Call from the server
 * with the user’s Supabase client; use `void` in layouts so page render is not blocked.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

import { createSupabaseServiceRoleClient } from "./serviceRoleClient";
function logCountError(context: string, error: unknown) {
  if (process.env.NODE_ENV === "development") {
    console.error(`[user_sessions] ${context}`, error);
  }
}

function isMissingSessionError(error: unknown): boolean {
  const maybe = error as { name?: string; message?: string; code?: string } | null;
  const message = (maybe?.message ?? "").toLowerCase();
  const name = (maybe?.name ?? "").toLowerCase();
  const code = (maybe?.code ?? "").toLowerCase();
  return (
    message.includes("auth session missing") ||
    name.includes("authsessionmissingerror") ||
    code === "auth_session_missing"
  );
}

function logVisitError(error: unknown) {
  if (process.env.NODE_ENV !== "development") return;
  if (isMissingSessionError(error)) return;
  console.error("[user_sessions] record_user_session_visit failed", error);
}

/**
 * Records an app visit for the current user (JWT on `supabase`).
 * First load: new row with visit_count = 1, is_returning = false.
 * Later loads: last_visit = now(), visit_count += 1, is_returning = true.
 * Does not throw; safe to fire-and-forget from Server Components.
 */
export async function recordUserSessionVisit(supabase: SupabaseClient): Promise<void> {
  try {
    const { error } = await supabase.rpc("record_user_session_visit");
    if (error) logVisitError(error);
  } catch (e) {
    logVisitError(e);
  }
}

/** Non-blocking: schedules `recordUserSessionVisit` without awaiting (no unhandled rejections). */
export function scheduleRecordUserSessionVisit(supabase: SupabaseClient): void {
  void recordUserSessionVisit(supabase);
}

/** All rows in `user_sessions` (unique tracked users). */
export async function getTotalUsers(): Promise<number> {
  const client = createSupabaseServiceRoleClient();
  if (!client) return 0;
  const { count, error } = await client.from("user_sessions").select("*", { count: "exact", head: true });
  if (error) {
    logCountError("getTotalUsers failed", error);
    return 0;
  }
  return count ?? 0;
}

/** Users with is_returning = true (second visit or later). */
export async function getReturningUsers(): Promise<number> {
  const client = createSupabaseServiceRoleClient();
  if (!client) return 0;
  const { count, error } = await client
    .from("user_sessions")
    .select("*", { count: "exact", head: true })
    .eq("is_returning", true);
  if (error) {
    logCountError("getReturningUsers failed", error);
    return 0;
  }
  return count ?? 0;
}

/** Users who only ever had one tracked visit (visit_count = 1). */
export async function getOneTimeUsers(): Promise<number> {
  const client = createSupabaseServiceRoleClient();
  if (!client) return 0;
  const { count, error } = await client
    .from("user_sessions")
    .select("*", { count: "exact", head: true })
    .eq("visit_count", 1);
  if (error) {
    logCountError("getOneTimeUsers failed", error);
    return 0;
  }
  return count ?? 0;
}

/** Returning users / total users, 0–100. Returns 0 if total is 0. */
export async function getRetentionPercentage(): Promise<number> {
  const [total, returning] = await Promise.all([getTotalUsers(), getReturningUsers()]);
  if (total === 0) return 0;
  return Math.round((returning / total) * 10000) / 100;
}
