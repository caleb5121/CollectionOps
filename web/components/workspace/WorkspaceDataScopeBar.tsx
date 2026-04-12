"use client";

import { useData } from "../DataProvider";

/**
 * Shared controls: which batch window and which game feed Dashboard / Trends / Account merges.
 */
export default function WorkspaceDataScopeBar({
  showWhenEmpty = false,
  showGameFilter = true,
  className = "",
}: {
  showWhenEmpty?: boolean;
  /** When false, only import scope is shown (e.g. Trends puts Game on the blue hero). */
  showGameFilter?: boolean;
  className?: string;
}) {
  const {
    savedBatchSummaries,
    dashboardImportScope,
    setDashboardImportScope,
    workspaceGameFilter,
    setWorkspaceGameFilter,
    workspaceGameFilterOptions,
    workspaceIncludesUnsavedDraft,
  } = useData();

  const hasScopeControls = savedBatchSummaries.length > 0 || dashboardImportScope !== "all";
  const nothingToConfigureYet =
    !hasScopeControls && workspaceGameFilterOptions.length === 0 && savedBatchSummaries.length === 0;

  if (!showWhenEmpty && nothingToConfigureYet) {
    return null;
  }

  if (showWhenEmpty && nothingToConfigureYet) {
    return (
      <div
        className={`rounded-xl border border-slate-200/80 bg-slate-50/80 px-4 py-3 text-[11px] leading-relaxed text-slate-600 dark:border-slate-600/60 dark:bg-slate-900/40 dark:text-slate-400 ${className}`}
      >
        Dashboard and Trends use all valid data in this workspace (saved batches and your current uploads). Saving is
        optional for preview; save when you want to start another batch.
      </div>
    );
  }

  return (
    <div
      className={`rounded-xl border border-slate-200/85 bg-white/90 px-4 py-3 dark:border-slate-600/70 dark:bg-slate-900/55 ${className}`}
    >
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          Data scope
        </p>
        {workspaceIncludesUnsavedDraft ? (
          <span className="rounded-full border border-sky-200/90 bg-sky-50 px-2 py-0.5 text-[10px] font-semibold text-sky-900 dark:border-sky-800/60 dark:bg-sky-950/50 dark:text-sky-100">
            Using current upload data
          </span>
        ) : null}
      </div>

      <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
        <label className="flex min-w-[12rem] flex-col gap-1">
          <span className="text-[11px] font-medium text-slate-600 dark:text-slate-400">Import scope</span>
          <select
            data-testid="workspace-import-scope"
            value={dashboardImportScope}
            onChange={(e) => setDashboardImportScope(e.target.value as "all" | string)}
            title="All batches: every valid saved batch plus valid files in your current upload area. Limited window: one saved batch only (unsaved uploads excluded)."
            className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs font-semibold text-slate-900 shadow-sm dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
          >
            <option
              value="all"
              title="Includes all valid saved batches and any valid files still in the upload area (you do not have to save for them to appear here)."
            >
              All imported batches
            </option>
            {savedBatchSummaries
              .filter(({ status }) => status !== "blocked")
              .map(({ batch }) => (
                <option
                  key={batch.id}
                  value={batch.id}
                  title="Limited window: only this saved batch. Current unsaved uploads are excluded."
                >
                  {batch.label} (limited window)
                </option>
              ))}
          </select>
          <span className="text-[10px] leading-snug text-slate-500 dark:text-slate-500">
            Includes all valid saved batches and current uploads in this workspace. Invalid or flagged batches are
            excluded.
          </span>
        </label>

        {showGameFilter ? (
          <label className="flex min-w-[10rem] flex-col gap-1">
            <span className="text-[11px] font-medium text-slate-600 dark:text-slate-400">Game</span>
            <select
              data-testid="workspace-game-filter"
              value={workspaceGameFilter}
              onChange={(e) =>
                setWorkspaceGameFilter((e.target.value === "all" ? "all" : e.target.value) as "all" | string)
              }
              className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs font-semibold text-slate-900 shadow-sm dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
            >
              <option value="all">All games (combined)</option>
              {workspaceGameFilterOptions.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
            <span className="text-[10px] text-slate-500 dark:text-slate-500">Filter totals and Trends to one label.</span>
          </label>
        ) : null}
      </div>
    </div>
  );
}
