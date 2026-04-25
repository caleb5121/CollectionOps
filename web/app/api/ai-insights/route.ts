/**
 * POST /api/ai-insights
 * Requires `OPENAI_API_KEY` (server-only). Optional: `OPENAI_MODEL` (default gpt-4o-mini).
 */
import { NextResponse } from "next/server";
import type { AiInsightsSummaryPayload } from "../../../lib/aiInsightsSummary";

function devLog(message: string, ...args: unknown[]) {
  if (process.env.NODE_ENV !== "production") {
    console.error(`[ai-insights] ${message}`, ...args);
  }
}

function stripJsonFence(text: string): string {
  const t = text.trim();
  const fence = /^```(?:json)?\s*([\s\S]*?)\s*```$/m.exec(t);
  if (fence) return fence[1].trim();
  return t;
}

function parseInsightsJson(content: string): string[] | null {
  const raw = stripJsonFence(content);
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (Array.isArray(parsed)) {
      const out = parsed.filter((x): x is string => typeof x === "string" && x.trim().length > 0);
      return out.length ? out : null;
    }
    if (parsed && typeof parsed === "object" && "insights" in parsed) {
      const ins = (parsed as { insights: unknown }).insights;
      if (Array.isArray(ins)) {
        const out = ins.filter((x): x is string => typeof x === "string" && x.trim().length > 0);
        return out.length ? out : null;
      }
    }
  } catch (e) {
    devLog("parseInsightsJson failed", e);
  }
  return null;
}

const MAX_WORDS = 52;

function clampWords(s: string, maxWords: number): string {
  const t = s.trim();
  const words = t.split(/\s+/).filter(Boolean);
  if (words.length <= maxWords) return t;
  const clipped = words.slice(0, maxWords).join(" ");
  return /[.!?]$/.test(clipped) ? clipped : `${clipped}.`;
}

function normalizeInsightLine(raw: string): string {
  let s = raw.trim();
  s = s.replace(/\s+/g, " ").trim();
  s = clampWords(s, MAX_WORDS);
  return s.trim();
}

function dedupeInsights(list: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const s of list) {
    const key = s.toLowerCase().replace(/\s+/g, " ");
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(s);
  }
  return out;
}

const SYSTEM_PROMPT = `You are a concise coach for trading card marketplace sellers (TCGplayer-style).
Output only the JSON the user message specifies.
Write in plain, friendly language that sounds human.
Never give generic ecommerce advice.
Never suggest bundles, BOGO, cross-sell funnels, upsell funnels, cart minimums, or "focus on expensive cards only."
Respect marketplace constraints: buyers often search exact cards and sellers cannot force basket size.
Prefer these angles: order size, average cart value, many small orders vs fewer larger orders, set-completion behavior, inventory depth, shipping pressure, fee pressure, and repeatability checks.
Each insight should follow this internal flow:
1) what happened
2) why it matters
3) smart next move
But do NOT always print those exact labels. Prefer natural short heading style, then 1-3 short sentences.
Example style:
"Small orders added up. Buyers likely found exact cards they needed, including cheap singles. Good signal, but thin orders can get eaten by fees and shipping. Keep listing set-filler cards and watch net left after shipping."
Use only numbers and fields from the provided JSON summary.`;

function userPrompt(summary: AiInsightsSummaryPayload): string {
  return `Data summary (JSON):
${JSON.stringify(summary)}

Return ONLY valid JSON (no markdown, no prose outside JSON):
{"insights":["...", "..."]}

Strict rules for each string in "insights":
- 1 to 3 items total, never more than 3.
- Each item starts with a natural short heading sentence (3-8 words), then brief plain-language coaching.
- Keep the internal flow: what happened -> why it matters -> smart next move.
- Do not always print the literal labels "What happened", "Why it matters", "Smart next move".
- Max ${MAX_WORDS} words per sentence (count every word).
- Keep tone simple and human.
- Keep each segment short and specific.
- Do not restate the same dollar amount or percentage in more than one item.
- Avoid filler ("it appears", "based on the data", "great job", "overall").
- Never imply direct control of buyer carts or demand.
- Do not suggest bundles, BOGO, cross-sell, upsell, or cart minimum tactics.

Only reference numbers and categories that appear in the JSON summary (dashboard-era rollups). Do not invent metrics.

Prioritize when the data supports them (skip repeats):
1) Many small orders vs fewer larger carts
2) Average order value with shipping/fee pressure
3) Set-completion behavior signals and inventory depth opportunities
4) Net per order (avgNetPerOrder) as decision threshold
5) Repeatability check (verify across date ranges/imports)
6) Concentration (topProductsByRevenue) or refunds if material

If the data is thin, stay specific and do not invent trends.`;
}

export async function POST(req: Request) {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    devLog("OPENAI_API_KEY missing; client should use fallback insights");
    return NextResponse.json({ error: "missing_api_key" }, { status: 503 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch (e) {
    devLog("Request JSON parse failed", e);
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  if (!body || typeof body !== "object" || !("summary" in body)) {
    return NextResponse.json({ error: "missing_summary" }, { status: 400 });
  }

  const summary = (body as { summary: unknown }).summary;
  if (!summary || typeof summary !== "object") {
    return NextResponse.json({ error: "invalid_summary" }, { status: 400 });
  }

  const model = process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini";

  try {
    const openaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        temperature: 0.22,
        max_tokens: 320,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userPrompt(summary as AiInsightsSummaryPayload) },
        ],
      }),
    });

    if (!openaiRes.ok) {
      const errText = await openaiRes.text().catch(() => "");
      devLog("OpenAI HTTP error", openaiRes.status, errText.slice(0, 500));
      return NextResponse.json({ error: "openai_failed" }, { status: 502 });
    }

    const data = (await openaiRes.json()) as {
      choices?: { message?: { content?: string | null } }[];
    };
    const content = data.choices?.[0]?.message?.content;
    if (typeof content !== "string" || !content.trim()) {
      devLog("OpenAI empty message content");
      return NextResponse.json({ error: "empty_response" }, { status: 502 });
    }

    const insights = parseInsightsJson(content);
    if (!insights) {
      devLog("Could not parse model JSON from content snippet:", content.slice(0, 200));
      return NextResponse.json({ error: "parse_failed" }, { status: 502 });
    }

    const normalized = dedupeInsights(
      insights.map((s) => normalizeInsightLine(s)).filter((s) => s.length > 0),
    ).slice(0, 3);
    if (normalized.length < 1) {
      devLog("No insights after normalize");
      return NextResponse.json({ error: "too_few_insights" }, { status: 502 });
    }

    return NextResponse.json({ insights: normalized });
  } catch (e) {
    devLog("Route exception", e);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
