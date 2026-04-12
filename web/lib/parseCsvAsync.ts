import type { CsvData } from "./csvData";
import { parseCsvText } from "./parseCsvText";
import { IMPORT_WORKER_PARSE_MIN_BYTES } from "./importPerformanceConstants";
import { logImportPerf } from "./importPerfLog";

let worker: Worker | null = null;
let nextId = 1;

function getParseWorker(): Worker | null {
  if (typeof window === "undefined") return null;
  try {
    if (!worker) {
      worker = new Worker(new URL("../workers/parseCsv.worker.ts", import.meta.url));
    }
    return worker;
  } catch {
    return null;
  }
}

/**
 * Parse CSV off the main thread when the payload is large enough and workers are available.
 */
export function parseCsvTextAsync(text: string): Promise<CsvData> {
  const t0 = typeof performance !== "undefined" ? performance.now() : Date.now();
  const useWorker = text.length >= IMPORT_WORKER_PARSE_MIN_BYTES;
  const w = useWorker ? getParseWorker() : null;

  if (!w) {
    const data = parseCsvText(text);
    logImportPerf("parse_sync", (typeof performance !== "undefined" ? performance.now() : Date.now()) - t0, {
      bytes: text.length,
      rows: data.rows.length,
    });
    return Promise.resolve(data);
  }

  const id = nextId++;
  return new Promise((resolve, reject) => {
    const onMessage = (ev: MessageEvent) => {
      const m = ev.data as { type: string; id: number; data?: CsvData; message?: string };
      if (m.id !== id) return;
      w.removeEventListener("message", onMessage);
      if (m.type === "parsed" && m.data) {
        logImportPerf("parse_worker", (typeof performance !== "undefined" ? performance.now() : Date.now()) - t0, {
          bytes: text.length,
          rows: m.data.rows.length,
        });
        resolve(m.data);
      } else {
        reject(new Error(m.message ?? "Worker parse failed"));
      }
    };
    w.addEventListener("message", onMessage);
    w.postMessage({ type: "parse", id, text });
  });
}
