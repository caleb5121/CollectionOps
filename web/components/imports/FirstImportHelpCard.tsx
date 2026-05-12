"use client";

import Link from "next/link";
import { useLayoutEffect, useState } from "react";

const STORAGE_KEY = "collectionops-first-import-help-dismissed";

function LightbulbIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path
        d="M9 18h6M10 22h4M12 2a7 7 0 0 0-4 12.74V17a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1v-2.26A7 7 0 0 0 12 2Z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function FirstImportHelpCard({ hasImports }: { hasImports: boolean }) {
  /** When user has imports, respect session dismiss; when empty workspace, always show. */
  const [hiddenBySessionDismiss, setHiddenBySessionDismiss] = useState(false);

  useLayoutEffect(() => {
    if (!hasImports) {
      setHiddenBySessionDismiss(false);
      return;
    }
    try {
      setHiddenBySessionDismiss(sessionStorage.getItem(STORAGE_KEY) === "1");
    } catch {
      setHiddenBySessionDismiss(false);
    }
  }, [hasImports]);

  const show = !hasImports || !hiddenBySessionDismiss;
  if (!show) return null;

  const dismiss = () => {
    if (!hasImports) return;
    try {
      sessionStorage.setItem(STORAGE_KEY, "1");
    } catch {
      /* ignore */
    }
    setHiddenBySessionDismiss(true);
  };

  return (
    <div
      role="region"
      aria-label="First time importing help"
      className="rounded-xl border border-emerald-200/80 bg-[color:color-mix(in_oklab,var(--accent-soft)_72%,white)] p-4 shadow-sm dark:border-emerald-800/40 dark:bg-[color:color-mix(in_oklab,var(--accent-soft)_18%,var(--surface-muted))] sm:p-5"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 gap-3">
          <span className="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-xl border border-emerald-200/90 bg-white text-[color:var(--accent)] shadow-sm dark:border-emerald-800/50 dark:bg-zinc-950/60">
            <LightbulbIcon className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <h3 className="text-base font-semibold tracking-[-0.02em] text-zinc-900 dark:text-zinc-50">First time importing?</h3>
            <p className="mt-1.5 text-[0.8125rem] leading-relaxed text-zinc-700 dark:text-zinc-300">
              You need two CSV files from TCGplayer: an Order List and a Sales Summary (covering the same date range). We have
              a step-by-step guide if you need help getting them.
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Link
                href="/help/getting-your-csvs"
                className="inline-flex items-center justify-center rounded-lg bg-[color:var(--accent)] px-4 py-2 text-sm font-semibold text-white shadow-[0_2px_6px_rgba(26,155,127,0.28)] transition hover:bg-[color:var(--accent-hover)] active:scale-[0.98] dark:text-stone-950"
              >
                View Step-by-Step Guide
              </Link>
              {hasImports ? (
                <button
                  type="button"
                  onClick={dismiss}
                  className="inline-flex items-center justify-center rounded-lg border border-emerald-300/80 bg-white/90 px-3 py-2 text-xs font-semibold text-zinc-700 transition hover:bg-white dark:border-emerald-800/50 dark:bg-zinc-900/80 dark:text-zinc-200 dark:hover:bg-zinc-800"
                >
                  Dismiss
                </button>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
