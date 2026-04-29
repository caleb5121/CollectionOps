import { NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const FEEDBACK_TO = "bt2026@brickthread.com";
const DATA_DIR = path.join(process.cwd(), ".local-data");
const DATA_FILE = path.join(DATA_DIR, "feedback-submissions.json");

type FeedbackSubmission = {
  name?: string;
  email: string;
  message: string;
  createdAt: string;
};

let writeQueue: Promise<void> = Promise.resolve();

async function readSubmissions(): Promise<FeedbackSubmission[]> {
  try {
    const raw = await readFile(DATA_FILE, "utf8");
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as FeedbackSubmission[]) : [];
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("Failed to read feedback submissions", error);
    }
    return [];
  }
}

async function saveSubmissions(rows: FeedbackSubmission[]): Promise<void> {
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(DATA_FILE, JSON.stringify(rows, null, 2), "utf8");
}

async function persistSubmission(payload: Omit<FeedbackSubmission, "createdAt">): Promise<void> {
  writeQueue = writeQueue.then(async () => {
    const rows = await readSubmissions();
    rows.push({ ...payload, createdAt: new Date().toISOString() });
    await saveSubmissions(rows);
  });
  await writeQueue;
}

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("Invalid feedback JSON payload", error);
    }
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const { name, email, message } = body as { name?: string; email?: string; message?: string };
  const safeName = (name ?? "").trim();
  const safeEmail = (email ?? "").trim();
  const safeMessage = (message ?? "").trim();
  if (!safeEmail || !safeMessage) {
    return NextResponse.json({ error: "missing_required_fields" }, { status: 400 });
  }

  try {
    await persistSubmission({
      ...(safeName ? { name: safeName } : {}),
      email: safeEmail,
      message: safeMessage,
    });
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("Failed to persist feedback submission", error);
    }
    return NextResponse.json({ ok: false, error: "storage_failed" }, { status: 500 });
  }

  const host = process.env.FEEDBACK_SMTP_HOST?.trim();
  const user = process.env.FEEDBACK_SMTP_USER?.trim();
  const pass = process.env.FEEDBACK_SMTP_PASS?.trim();
  const port = Number(process.env.FEEDBACK_SMTP_PORT ?? "587");
  const from = process.env.FEEDBACK_FROM_EMAIL?.trim() || user || FEEDBACK_TO;
  if (!host || !user || !pass) {
    return NextResponse.json({ ok: true, notificationSent: false, storage: "local_file" });
  }

  const transporter = nodemailer.createTransport({
    host,
    port: Number.isFinite(port) ? port : 587,
    secure: Number(process.env.FEEDBACK_SMTP_PORT ?? "587") === 465,
    auth: { user, pass },
  });

  const text = [
    "New CollectionOps feedback",
    "",
    `Name: ${safeName || "-"}`,
    `Email: ${safeEmail}`,
    "",
    "Message:",
    safeMessage,
  ].join("\n");

  try {
    await transporter.sendMail({
      from,
      to: FEEDBACK_TO,
      replyTo: safeEmail,
      subject: "CollectionOps feedback",
      text,
    });
    return NextResponse.json({ ok: true, notificationSent: true, storage: "local_file" });
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("Feedback email notification failed", error);
    }
    return NextResponse.json({ ok: true, notificationSent: false, storage: "local_file" });
  }
}

