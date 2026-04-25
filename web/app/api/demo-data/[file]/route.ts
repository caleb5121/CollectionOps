import { readFile } from "node:fs/promises";
import path from "node:path";

import { NextResponse } from "next/server";

const ALLOWED_DEMO_FILES = new Set([
  "low_orders.csv",
  "low_sales.csv",
  "medium_orders.csv",
  "medium_sales.csv",
  "high_orders.csv",
  "high_sales.csv",
]);

export const runtime = "nodejs";

export async function GET(_req: Request, context: { params: Promise<{ file: string }> }) {
  const params = await context.params;
  const file = (params.file ?? "").trim();
  if (!ALLOWED_DEMO_FILES.has(file)) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const fullPath = path.join(process.cwd(), "public", "demo-data", file);
  try {
    const csv = await readFile(fullPath, "utf8");
    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
}
