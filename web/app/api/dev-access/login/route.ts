import { NextResponse } from "next/server";

import { DEV_ACCESS_COOKIE, type DevAccessKind, isLocalDevelopmentRequestHost } from "@/lib/devAccess";

export const runtime = "nodejs";

const allowedKinds = new Set<DevAccessKind>(["caleb", "empty", "demo"]);

export async function POST(req: Request) {
  const host = req.headers.get("host");
  if (!isLocalDevelopmentRequestHost(host)) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const kind = String((body as { kind?: unknown })?.kind ?? "") as DevAccessKind;
  if (!allowedKinds.has(kind)) {
    return NextResponse.json({ error: "invalid_kind" }, { status: 400 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(DEV_ACCESS_COOKIE, kind, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: false,
    maxAge: 60 * 60 * 12,
  });
  return res;
}
