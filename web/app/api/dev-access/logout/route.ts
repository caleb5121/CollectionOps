import { NextResponse } from "next/server";

import { DEV_ACCESS_COOKIE, isLocalDevelopmentRequestHost } from "@/lib/devAccess";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const host = req.headers.get("host");
  if (!isLocalDevelopmentRequestHost(host)) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(DEV_ACCESS_COOKIE, "", {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: false,
    maxAge: 0,
  });
  return res;
}
