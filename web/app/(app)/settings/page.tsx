"use client";

import { useState } from "react";
import PageShell from "../../../components/PageShell";
import { useSettings, type ShippingItem } from "../../../components/SettingsProvider";

const PLACEHOLDER_CUSTOM = "Add custom item (e.g. Shipping Shield, Label, Insurance)";
const PLACEHOLDER_CUSTOM_FOCUSED = "Enter item name...";

const TYPICAL_RANGE_LABEL = "Typical range: $0.70 – $1.20";
const RANGE_COMPACT = "$0.70–$1.20";

function ValueWarning() {
  return (
    <div className="mt-2 space-y-0.5 text-slate-700 dark:text-slate-300">
      <p className="text-xs font-medium leading-snug">
        <span aria-hidden>⚠️</span> This will distort your profit estimates
      </p>
      <p className="text-[11px] leading-snug text-slate-600 dark:text-slate-400">
        Most sellers are between {RANGE_COMPACT}
      </p>
    </div>
  );
}

function isLineExtreme(cost: number): boolean {
  if (cost <= 0) return false;
  return cost > 1.35 || cost < 0.02;
}

function isTotalExtreme(total: number): boolean {
  return total > 2.75 || (total > 0 && total < 0.35);
}

export default function SettingsPage() {
  const {
    shippingItems,
    addShippingItem,
    resetShippingDefaults,
    removeShippingItem,
    updateShippingItem,
    estimatedShippingCostPerOrder,
  } = useSettings();

  const [draftName, setDraftName] = useState("");
  const [draftCost, setDraftCost] = useState(0);
  const [draftNameFocused, setDraftNameFocused] = useState(false);

  const totalExtreme = isTotalExtreme(estimatedShippingCostPerOrder);

  const totalFormatted = estimatedShippingCostPerOrder.toLocaleString(undefined, {
    style: "currency",
    currency: "USD",
  });

  function handleAddItem() {
    if (draftName.trim() !== "" || draftCost > 0) {
      addShippingItem({ name: draftName.trim(), cost: draftCost });
      setDraftName("");
      setDraftCost(0);
    } else {
      addShippingItem();
    }
  }

  function handleReset() {
    resetShippingDefaults();
    setDraftName("");
    setDraftCost(0);
  }

  const inputClass =
    "app-inset-well rounded-lg border border-slate-200/90 bg-white px-3 py-2 text-sm text-slate-900 transition-[box-shadow,border-color] placeholder:text-slate-400 focus:border-[color:var(--accent)] focus:outline-none focus:ring-2 focus:ring-[color:var(--accent)]/25 dark:border-slate-600/90 dark:bg-slate-950/80 dark:text-slate-100 dark:placeholder:text-slate-500";

  const rowBase =
    "app-panel-3d flex flex-wrap items-center gap-2 rounded-xl border p-2.5 sm:flex-nowrap sm:gap-3 sm:p-3";

  function rowClass(extreme: boolean) {
    if (extreme) {
      return `${rowBase} border-amber-400/70 bg-amber-50/60 ring-1 ring-amber-500/20 dark:border-amber-800/50 dark:bg-amber-950/25 dark:ring-amber-500/15`;
    }
    return `${rowBase} border-slate-200/85 bg-white/95 dark:border-slate-700/70 dark:bg-slate-900/75`;
  }

  return (
    <PageShell maxWidth="wide" contentClassName="px-6 pt-5 pb-8 sm:px-8 sm:pt-6 sm:pb-10 lg:px-10">
      <div className="rounded-2xl border border-[color:var(--accent)]/25 bg-gradient-to-br from-[color:var(--accent-soft)] via-white to-emerald-50/40 p-4 shadow-[0_1px_0_rgba(255,255,255,0.8)_inset,0_8px_32px_-12px_rgba(13,148,136,0.12)] dark:border-teal-800/45 dark:from-teal-950/50 dark:via-slate-900/70 dark:to-slate-950/90 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_12px_40px_-16px_rgba(0,0,0,0.35)] sm:p-5">
        <div className="space-y-2">
          <h2 className="text-2xl font-bold tracking-tight text-[color:var(--accent)] sm:text-3xl dark:text-teal-300">
            Base costs
          </h2>
          {shippingItems.map((item: ShippingItem) => {
            const extreme = isLineExtreme(item.cost);
            return (
              <div key={item.id}>
                <div className={rowClass(extreme)}>
                  <input
                    type="text"
                    value={item.name}
                    onChange={(e) => updateShippingItem(item.id, { name: e.target.value })}
                    placeholder="Name"
                    className={`min-w-0 flex-1 ${inputClass}`}
                  />
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={item.cost || ""}
                    onChange={(e) => updateShippingItem(item.id, { cost: Number(e.target.value) || 0 })}
                    placeholder="0.00"
                    className={`w-24 shrink-0 tabular-nums ${inputClass}`}
                  />
                  <button
                    type="button"
                    onClick={() => removeShippingItem(item.id)}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-[color:var(--accent)] transition-colors hover:bg-[color:var(--accent-soft)] dark:hover:bg-teal-950/40"
                    aria-label="Remove item"
                  >
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                {extreme ? (
                  <div className="mt-1.5 pl-0.5">
                    <ValueWarning />
                  </div>
                ) : null}
              </div>
            );
          })}

        <div className="app-panel-3d flex flex-wrap items-center gap-2 rounded-xl border border-dashed border-[color:var(--accent)]/35 bg-white/90 p-2.5 sm:flex-nowrap sm:gap-3 sm:p-3 dark:border-teal-700/45 dark:bg-slate-900/55">
          <input
            type="text"
            value={draftName}
            onChange={(e) => setDraftName(e.target.value)}
            onFocus={() => setDraftNameFocused(true)}
            onBlur={() => setDraftNameFocused(false)}
            placeholder={draftNameFocused ? PLACEHOLDER_CUSTOM_FOCUSED : PLACEHOLDER_CUSTOM}
            className={`min-w-0 flex-1 ${inputClass}`}
          />
          <input
            type="number"
            step="0.01"
            min="0"
            value={draftCost || ""}
            onChange={(e) => setDraftCost(Number(e.target.value) || 0)}
            placeholder="0.00"
            className={`w-24 shrink-0 tabular-nums ${inputClass}`}
          />
          <div className="h-9 w-9 shrink-0" aria-hidden />
        </div>
        </div>
      </div>

      <div
        className={`mt-5 rounded-2xl border px-5 py-6 shadow-sm sm:px-6 sm:py-7 ${
          totalExtreme
            ? "border-amber-400/70 bg-gradient-to-b from-amber-50 to-amber-100/90 dark:border-amber-800/50 dark:from-amber-950/40 dark:to-slate-950/90"
            : "border-[color:var(--accent)]/25 bg-gradient-to-b from-[color:var(--accent-soft)] to-white dark:to-slate-900/90 dark:ring-1 dark:ring-[color:var(--accent)]/15"
        }`}
      >
        <p className="text-4xl font-bold tabular-nums tracking-tight text-slate-900 dark:text-slate-50 sm:text-5xl md:text-6xl">
          {totalFormatted}
        </p>
        <p className="mt-2 text-sm font-semibold text-slate-600 dark:text-slate-400">Shipping per order</p>
        <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-500">Used in all profit calculations</p>
        <p className="mt-1 text-[11px] leading-snug text-slate-400 dark:text-slate-500">{TYPICAL_RANGE_LABEL}</p>
        {totalExtreme ? (
          <div className="mt-3">
            <ValueWarning />
          </div>
        ) : null}
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
        <button
          type="button"
          onClick={handleReset}
          className="app-panel-3d inline-flex items-center gap-2 rounded-lg border border-slate-200/90 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition-[transform,background-color] hover:bg-slate-50/95 active:translate-y-px dark:border-slate-600/80 dark:bg-slate-900/80 dark:text-slate-200 dark:hover:bg-slate-800/90"
        >
          <svg className="h-4 w-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
          Reset shipping costs
        </button>
        <button
          type="button"
          onClick={handleAddItem}
          className="inline-flex items-center gap-2 rounded-lg bg-[color:var(--accent)] px-3 py-2 text-sm font-semibold text-white shadow-[0_1px_0_rgba(255,255,255,0.2)_inset,0_4px_14px_-2px_var(--accent-glow)] transition-[transform,filter] hover:brightness-110 active:translate-y-px"
        >
          <svg className="h-4 w-4 text-white/90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add item
        </button>
      </div>
    </PageShell>
  );
}
