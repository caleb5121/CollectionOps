"use client";

import type { ReactNode } from "react";

type SnapshotNums = {
  gross: number | null;
  net: number | null;
  fees: number | null;
  orders: number;
  shipping: number | null;
};

function IconGross(props: { className?: string }) {
  return (
    <svg className={props.className} viewBox="0 0 20 20" fill="none" stroke="currentColor" aria-hidden>
      <path
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M10 4.5v11M7.5 7c0-1.5 1.75-2 2.5-2s2.5.5 2.5 2-2 2.25-2.5 2.5S7 11.5 7 13s1.25 2 2.5 2 2.5-.75 2.5-2.5"
      />
    </svg>
  );
}

function IconNet(props: { className?: string }) {
  return (
    <svg className={props.className} viewBox="0 0 20 20" fill="none" stroke="currentColor" aria-hidden>
      <path strokeWidth={1.5} strokeLinecap="round" d="M4 14l4-8 4 5 4-6" />
      <path strokeWidth={1.5} strokeLinecap="round" d="M4 17h12" />
    </svg>
  );
}

function IconFees(props: { className?: string }) {
  return (
    <svg className={props.className} viewBox="0 0 20 20" fill="none" stroke="currentColor" aria-hidden>
      <path
        strokeWidth={1.5}
        strokeLinejoin="round"
        d="M5.5 4.5h9l-1 12h-7l-1-12zM8 8.5h4M8 11.5h3"
      />
    </svg>
  );
}

function IconOrders(props: { className?: string }) {
  return (
    <svg className={props.className} viewBox="0 0 20 20" fill="none" stroke="currentColor" aria-hidden>
      <path
        strokeWidth={1.5}
        strokeLinejoin="round"
        d="M4.5 7.5h11L14 16.5H6L4.5 7.5zm0 0L5.5 4h9l1 3.5"
      />
    </svg>
  );
}

function IconShipping(props: { className?: string }) {
  return (
    <svg className={props.className} viewBox="0 0 20 20" fill="none" stroke="currentColor" aria-hidden>
      <path
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3.5 13h2.5l1.5-6h7l1.2 4H6.5M14 11h2l1.5 2.5V16H14M5 16h1.5a1.5 1.5 0 003 0H14"
      />
    </svg>
  );
}

function formatSnapshotCurrency(n: number | null | undefined) {
  if (n === null || n === undefined || Number.isNaN(n)) return "-";
  return n.toLocaleString(undefined, { style: "currency", currency: "USD" });
}

function formatOrders(n: number, emptyWorkspace: boolean) {
  if (emptyWorkspace) return "-";
  return n.toLocaleString();
}

const cell =
  "flex min-w-0 flex-col gap-0.5 rounded-lg border border-zinc-200/90 bg-white px-2.5 py-2 shadow-sm dark:border-zinc-800/75 dark:bg-zinc-900/55";

function Subhint({ children }: { children: ReactNode }) {
  return <p className="truncate text-[0.625rem] font-normal leading-tight text-zinc-500 dark:text-zinc-400">{children}</p>;
}

/**
 * Compact KPI row for Imports - keep in view with uploads for quick scanning.
 */
export function ImportsSnapshotStrip({
  gross,
  net,
  fees,
  orders,
  shipping,
  emptyWorkspace,
  className = "",
}: SnapshotNums & { emptyWorkspace: boolean; className?: string }) {
  return (
    <section
      data-testid="imports-snapshot-strip"
      aria-label="Import snapshot"
      className={`rounded-lg border border-zinc-200/90 bg-zinc-50/80 p-2.5 dark:border-zinc-800/80 dark:bg-zinc-950/40 sm:p-3 ${className}`}
    >
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-5 sm:gap-2.5">
        <div className={cell}>
          <div className="flex items-center gap-1.5 text-[0.625rem] font-medium uppercase tracking-[0.1em] text-zinc-500 dark:text-zinc-400">
            <IconGross className="h-3.5 w-3.5 shrink-0 text-zinc-400 dark:text-zinc-500" />
            <span className="truncate">Gross sales</span>
          </div>
          <p className="truncate text-sm font-semibold tabular-nums tracking-[-0.02em] text-zinc-900 dark:text-zinc-50">
            {emptyWorkspace ? "-" : formatSnapshotCurrency(gross)}
          </p>
        </div>
        <div className={cell}>
          <div className="flex items-center gap-1.5 text-[0.625rem] font-medium uppercase tracking-[0.1em] text-zinc-500 dark:text-zinc-400">
            <IconNet className="h-3.5 w-3.5 shrink-0 text-zinc-400 dark:text-zinc-500" />
            <span className="truncate">Net sales</span>
          </div>
          <p className="truncate text-sm font-semibold tabular-nums tracking-[-0.02em] text-zinc-900 dark:text-zinc-50">
            {emptyWorkspace ? "-" : formatSnapshotCurrency(net)}
          </p>
          {!emptyWorkspace ? <Subhint>after fees</Subhint> : null}
        </div>
        <div className={cell}>
          <div className="flex items-center gap-1.5 text-[0.625rem] font-medium uppercase tracking-[0.1em] text-zinc-500 dark:text-zinc-400">
            <IconFees className="h-3.5 w-3.5 shrink-0 text-zinc-400 dark:text-zinc-500" />
            <span className="truncate">Fees paid</span>
          </div>
          <p className="truncate text-sm font-semibold tabular-nums tracking-[-0.02em] text-zinc-900 dark:text-zinc-50">
            {emptyWorkspace ? "-" : formatSnapshotCurrency(fees)}
          </p>
          {!emptyWorkspace ? <Subhint>TCG fees</Subhint> : null}
        </div>
        <div className={cell}>
          <div className="flex items-center gap-1.5 text-[0.625rem] font-medium uppercase tracking-[0.1em] text-zinc-500 dark:text-zinc-400">
            <IconOrders className="h-3.5 w-3.5 shrink-0 text-zinc-400 dark:text-zinc-500" />
            <span className="truncate">Orders</span>
          </div>
          <p className="truncate text-sm font-semibold tabular-nums tracking-[-0.02em] text-zinc-900 dark:text-zinc-50">
            {formatOrders(orders, emptyWorkspace)}
          </p>
        </div>
        <div className={`${cell} col-span-2 sm:col-span-1`}>
          <div className="flex items-center gap-1.5 text-[0.625rem] font-medium uppercase tracking-[0.1em] text-zinc-500 dark:text-zinc-400">
            <IconShipping className="h-3.5 w-3.5 shrink-0 text-zinc-400 dark:text-zinc-500" />
            <span className="truncate">Shipping collected</span>
          </div>
          <p className="truncate text-sm font-semibold tabular-nums tracking-[-0.02em] text-zinc-900 dark:text-zinc-50">
            {emptyWorkspace ? "-" : formatSnapshotCurrency(shipping)}
          </p>
          {!emptyWorkspace ? <Subhint>from buyers</Subhint> : null}
        </div>
      </div>
    </section>
  );
}
