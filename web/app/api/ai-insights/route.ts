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

/** One sentence only; drops anything after first . ! ? */
function firstSentenceOnly(s: string): string {
  const t = s.trim().replace(/\s+/g, " ");
  if (!t) return t;
  const cut = t.search(/(?<=[.!?])\s/);
  if (cut === -1) return t;
  return t.slice(0, cut).trim();
}

const MAX_WORDS = 15;

function clampWords(s: string, maxWords: number): string {
  const t = s.trim();
  const words = t.split(/\s+/).filter(Boolean);
  if (words.length <= maxWords) return t;
  const clipped = words.slice(0, maxWords).join(" ");
  return /[.!?]$/.test(clipped) ? clipped : `${clipped}.`;
}

function normalizeInsightLine(raw: string): string {
  let s = firstSentenceOnly(raw);
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

const SYSTEM_PROMPT = `You write terse performance briefings for a small online seller.
Output only what the user asks for in the user message: short, actionable lines.
Tone: direct, neutral, no hype, no filler, no emojis.`;

function userPrompt(summary: AiInsightsSummaryPayload): string {
  return `Data summary (JSON):
${JSON.stringify(summary)}

Return ONLY valid JSON (no markdown, no prose outside JSON):
{"insights":["...", "..."]}

Strict rules for each string in "insights":
- Exactly 3 to 5 items total, never more.
- Exactly one sentence per item.
- Max ${MAX_WORDS} words per sentence (count every word).
- No filler ("it appears", "based on the data", "this means", "you may want to consider").
- No hedging stacks; state the point plainly.
- Be specific using the numbers in the JSON (revenue, profit, fees, shipping, AOV, top products, dates when relevant).

Only reference numbers and categories that appear in the JSON summary (dashboard-era rollups). Do not introduce new metrics or ratios not implied there.

Prioritize topics in this order when the data supports them:
1) Profit issues
2) Fee load vs revenue
3) Shipping cost vs profit or vs fees
4) Order size / mix (e.g. low AOV, concentration)
5) Revenue or trend signal (only if clearly supported)

If the data is thin, still stay specific—do not invent trends.`;
}

export async function POST(req: Request) {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    devLog("OPENAI_API_KEY missing — client should use fallback insights");
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
    ).slice(0, 5);
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
