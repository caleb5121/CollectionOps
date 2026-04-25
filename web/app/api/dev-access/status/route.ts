import { NextResponse } from "next/server";

import { DEV_ACCESS_COOKIE, isLocalDevelopmentRequestHost } from "@/lib/devAccess";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const host = req.headers.get("host");
  if (!isLocalDevelopmentRequestHost(host)) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const cookieHeader = req.headers.get("cookie") ?? "";
  const hasCookie = cookieHeader.includes(`${DEV_ACCESS_COOKIE}=`);
  return NextResponse.json({ active: hasCookie });
}
