import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import nodemailer from "nodemailer";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

type LandingSignup = {
  email: string;
  firstName?: string;
  source: string;
  createdAt: string;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DATA_DIR = path.join(process.cwd(), ".local-data");
const DATA_FILE = path.join(DATA_DIR, "landing-signups.json");
const SUPABASE_TABLE = "landing_signups";
const NOTIFICATION_TO = "bt2026@brickthread.com";
export const runtime = "nodejs";

let writeQueue: Promise<void> = Promise.resolve();

async function readSignups(): Promise<LandingSignup[]> {
  try {
    const raw = await readFile(DATA_FILE, "utf8");
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((item) => item && typeof item === "object")
      .map((item) => {
        const row = item as { email?: unknown; firstName?: unknown; source?: unknown; createdAt?: unknown };
        return {
          email: typeof row.email === "string" ? row.email : "",
          firstName: typeof row.firstName === "string" ? row.firstName : undefined,
          source: typeof row.source === "string" && row.source.trim() ? row.source.trim() : "landing_get_updates",
          createdAt: typeof row.createdAt === "string" ? row.createdAt : "",
        };
      })
      .filter((item) => item.email && item.source && item.createdAt);
  } catch {
    return [];
  }
}

async function saveSignups(signups: LandingSignup[]): Promise<void> {
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(DATA_FILE, JSON.stringify(signups, null, 2), "utf8");
}

function getSupabaseAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !serviceKey) return null;
  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function getSupabaseEnvStatus() {
  return {
    hasUrl: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()),
    hasServiceRoleKey: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()),
  };
}

function getErrorCode(error: unknown): string | null {
  if (!error || typeof error !== "object") return null;
  const e = error as { code?: unknown };
  return typeof e.code === "string" ? e.code : null;
}

function getErrorMessage(error: unknown): string {
  if (!error || typeof error !== "object") return String(error ?? "unknown_error");
  const e = error as { message?: unknown };
  return typeof e.message === "string" ? e.message : JSON.stringify(error);
}

async function saveToSupabase(payload: { email: string; firstName?: string; source: string }): Promise<"ok" | "duplicate"> {
  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    throw new Error("supabase_not_configured");
  }

  const { data: existing, error: readError } = await supabase
    .from(SUPABASE_TABLE)
    .select("email")
    .eq("email", payload.email)
    .maybeSingle();
  if (readError) throw readError;
  if (existing) return "duplicate";

  const insertPayload = {
    email: payload.email,
    ...(payload.firstName ? { first_name: payload.firstName } : {}),
    source: payload.source,
  };
  const { error: insertError } = await supabase.from(SUPABASE_TABLE).insert(insertPayload);
  if (insertError) {
    if (insertError.code === "23505") return "duplicate";
    throw insertError;
  }
  return "ok";
}

async function saveToLocalFile(payload: { email: string; firstName?: string; source: string }): Promise<"ok" | "duplicate"> {
  let result: "ok" | "duplicate" = "ok";
  writeQueue = writeQueue.then(async () => {
    const rows = await readSignups();
    const exists = rows.some((row) => row.email.toLowerCase() === payload.email);
    if (exists) {
      result = "duplicate";
      return;
    }
    rows.push({
      email: payload.email,
      ...(payload.firstName ? { firstName: payload.firstName } : {}),
      source: payload.source,
      createdAt: new Date().toISOString(),
    });
    await saveSignups(rows);
  });
  await writeQueue;
  return result;
}

async function sendSignupNotification(payload: { email: string; firstName?: string; source: string }): Promise<boolean> {
  const host = process.env.FEEDBACK_SMTP_HOST?.trim();
  const user = process.env.FEEDBACK_SMTP_USER?.trim();
  const pass = process.env.FEEDBACK_SMTP_PASS?.trim();
  const port = Number(process.env.FEEDBACK_SMTP_PORT ?? "587");
  const from = process.env.FEEDBACK_FROM_EMAIL?.trim() || user || NOTIFICATION_TO;
  if (!host || !user || !pass) return false;

  const transporter = nodemailer.createTransport({
    host,
    port: Number.isFinite(port) ? port : 587,
    secure: Number(process.env.FEEDBACK_SMTP_PORT ?? "587") === 465,
    auth: { user, pass },
  });

  const text = [
    "New CollectionOps signup",
    "",
    `First name: ${payload.firstName || "-"}`,
    `Email: ${payload.email}`,
    `Source: ${payload.source}`,
    `Submitted at: ${new Date().toISOString()}`,
  ].join("\n");

  await transporter.sendMail({
    from,
    to: NOTIFICATION_TO,
    replyTo: payload.email,
    subject: "New CollectionOps Lead",
    text,
  });
  return true;
}

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const email = String((body as { email?: unknown }).email ?? "").trim().toLowerCase();
  if (!EMAIL_RE.test(email)) {
    return NextResponse.json({ error: "invalid_email" }, { status: 400 });
  }

  const rawName = String((body as { firstName?: unknown }).firstName ?? "").trim();
  const firstName = rawName.slice(0, 120) || undefined;
  const rawSource = String((body as { source?: unknown }).source ?? "").trim().toLowerCase();
  const source = rawSource.slice(0, 80) || "landing_get_updates";
  const payload = { email, source, ...(firstName ? { firstName } : {}) };
  let storage: "supabase" | "local-file" = "local-file";
  let duplicate = false;
  let storageReason = "fallback_local";
  const supabaseEnv = getSupabaseEnvStatus();
  const requestId = `signup_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  try {
    const dbResult = await saveToSupabase(payload);
    storage = "supabase";
    storageReason = "supabase_insert_or_duplicate";
    duplicate = dbResult === "duplicate";
    console.info(`[landing-signups][${requestId}] storage=supabase duplicate=${duplicate} email=${email}`);
  } catch (supabaseError) {
    const code = getErrorCode(supabaseError);
    const message = getErrorMessage(supabaseError);
    storageReason = supabaseEnv.hasServiceRoleKey ? `supabase_error:${code ?? "unknown"}` : "missing_service_role_key";
    console.warn(
      `[landing-signups][${requestId}] storage=local-file reason=${storageReason} code=${code ?? "none"} message=${message}`,
    );
    if (message.toLowerCase().includes("row-level security")) {
      console.warn(`[landing-signups][${requestId}] Supabase error suggests RLS policy blocked access.`);
    }
    const fileResult = await saveToLocalFile(payload);
    duplicate = fileResult === "duplicate";
    console.info(`[landing-signups][${requestId}] local-file save complete duplicate=${duplicate} email=${email}`);
  }

  let notificationSent = false;
  try {
    notificationSent = await sendSignupNotification(payload);
  } catch (emailError) {
    console.warn(`[landing-signups][${requestId}] notification email failed`, emailError);
  }

  return NextResponse.json({
    ok: true,
    duplicate,
    storage,
    storageReason,
    notificationSent,
    supabaseEnv,
  });
}
