import type { CsvData } from "./csvData";

/** Parse full CSV text into headers + row objects (RFC-style quotes). */
export function parseCsvText(text: string): CsvData {
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
