/// <reference lib="webworker" />

import type { CsvData } from "../lib/csvData";

/** RFC-style CSV parse (same semantics as `parseCsvText` in main thread). */
function parseCsvTextWorker(text: string): CsvData {
  const rows: string[][] = [];
  let cur: string[] = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const next = text[i + 1];
    if (ch === '"' && inQuotes && next === '"') {
      field += '"';
      i++;
      continue;
    }
    if (ch === '"') {
      inQuotes = !inQuotes;
      continue;
    }
    if (!inQuotes && ch === ",") {
      cur.push(field);
      field = "";
      continue;
    }
    if (!inQuotes && (ch === "\n" || ch === "\r")) {
      if (ch === "\r" && next === "\n") i++;
      cur.push(field);
      field = "";
      const isEmpty = cur.every((c) => String(c ?? "").trim() === "");
      if (!isEmpty) rows.push(cur);
      cur = [];
      continue;
    }
    field += ch;
  }
  if (field.length > 0 || cur.length > 0) {
    cur.push(field);
    const isEmpty = cur.every((c) => String(c ?? "").trim() === "");
    if (!isEmpty) rows.push(cur);
  }
  if (rows.length === 0) return { headers: [], rows: [] };
  const headers = rows[0].map((h) => String(h ?? "").trim());
  const dataRows = rows.slice(1);
  const outRows: Record<string, string>[] = dataRows.map((r) => {
    const obj: Record<string, string> = {};
    for (let i = 0; i < headers.length; i++) {
      obj[headers[i]] = (r[i] ?? "").toString();
    }
    return obj;
  });
  return { headers, rows: outRows };
}

export type ParseWorkerInbound = { type: "parse"; id: number; text: string };
export type ParseWorkerOutbound =
  | { type: "parsed"; id: number; data: CsvData }
  | { type: "error"; id: number; message: string };

self.onmessage = (e: MessageEvent<ParseWorkerInbound>) => {
  const msg = e.data;
  if (msg.type !== "parse") return;
  try {
    const data = parseCsvTextWorker(msg.text);
    const out: ParseWorkerOutbound = { type: "parsed", id: msg.id, data };
    (self as unknown as Worker).postMessage(out);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Parse failed";
    const out: ParseWorkerOutbound = { type: "error", id: msg.id, message };
    (self as unknown as Worker).postMessage(out);
  }
};
