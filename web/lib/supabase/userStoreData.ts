"use client";

import { getSupabaseBrowserClient } from "./client";

export type UserStoreDataRow = {
  user_id: string;
  total_revenue: number;
  total_orders: number;
  total_costs: number;
  total_profit: number;
};

function safeNumber(v: number): number {
  return Number.isFinite(v) ? v : 0;
}

function logSupabaseError(prefix: string, error: unknown) {
  if (!error) {
    console.error(prefix, "Unknown error (empty error object).");
    return;
  }
  const e = error as { message?: string; code?: string; details?: string; hint?: string };
  console.error(prefix, {
    message: e.message ?? String(error),
    code: e.code ?? null,
    details: e.details ?? null,
    hint: e.hint ?? null,
    raw: error,
  });
}

export async function upsertCurrentUserStoreData(input: Omit<UserStoreDataRow, "user_id">): Promise<boolean> {
  const sb = getSupabaseBrowserClient();
  if (!sb) return false;

  const {
    data: { user },
    error: userError,
  } = await sb.auth.getUser();
  if (userError || !user) {
    console.error("Could not resolve authenticated user for store data upsert.", userError);
    return false;
  }

  const payload = {
    user_id: user.id,
    total_revenue: safeNumber(input.total_revenue),
    total_orders: safeNumber(input.total_orders),
    total_costs: safeNumber(input.total_costs),
    total_profit: safeNumber(input.total_profit),
  };

  const { data: existing, error: existingError } = await sb
    .from("user_store_data")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (existingError) {
    logSupabaseError("Failed checking existing user_store_data row.", existingError);
    return false;
  }

  if (existing) {
    const { error: updateError } = await sb.from("user_store_data").update(payload).eq("user_id", user.id);
    if (updateError) {
      logSupabaseError("Failed to update user_store_data.", updateError);
      return false;
    }
    return true;
  }

  const { error: insertError } = await sb.from("user_store_data").insert(payload);
  if (insertError) {
    logSupabaseError("Failed to insert user_store_data.", insertError);
    return false;
  }
  return true;
}

export async function fetchCurrentUserStoreData(): Promise<UserStoreDataRow | null> {
  const sb = getSupabaseBrowserClient();
  if (!sb) return null;

  const {
    data: { user },
    error: userError,
  } = await sb.auth.getUser();
  if (userError || !user) {
    if (userError) console.error("Could not resolve authenticated user for store data fetch.", userError);
    return null;
  }

  const { data, error } = await sb
    .from("user_store_data")
    .select("user_id,total_revenue,total_orders,total_costs,total_profit")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    logSupabaseError("Failed to fetch user_store_data.", error);
    return null;
  }

  return data as UserStoreDataRow | null;
}

