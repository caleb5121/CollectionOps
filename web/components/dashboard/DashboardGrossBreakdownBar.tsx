"use client";

function formatCurrency(n: number) {
  return n.toLocaleString(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

/**
 * Horizontal allocation bar: net vs costs as a share of gross (Muzli-style “balance snapshot” clarity).
 * Normalizes when components don’t sum to gross due to rounding or definitions.
 */
export default function DashboardGrossBreakdownBar({
  gross,
  net,
  costs,
}: {
  gross: number;
  net: number | null;
  costs: number | null;
}) {
  if (!Number.isFinite(gross) || gross <= 0) return null;

  const n = net != null && Number.isFinite(net) ? Math.max(0, net) : 0;
  const c = costs != null && Number.isFinite(costs) ? Math.max(0, costs) : 0;
  let netFrac = n / gross;
  let costFrac = c / gross;
  if (netFrac + costFrac > 1.0001) {
    const t = netFrac + costFrac;
    netFrac /= t;
    costFrac /= t;
  }
  const otherFrac = Math.max(0, 1 - netFrac - costFrac);
  const netPct = netFrac * 100;
  const costPct = costFrac * 100;
  const otherPct = otherFrac * 100;

  const label = `Gross ${formatCurrency(gross)}: about ${netPct.toFixed(0)}% estimated net, ${costPct.toFixed(0)}% costs${
    otherPct > 0.5 ? `, ${otherPct.toFixed(0)}% other` : ""
  }.`;

  return (
    <div
      className="rounded-[var(--radius-card)] border border-[color:color-mix(in_oklab,var(--border-warm)_70%,transparent)] bg-[color:color-mix(in_oklab,var(--surface-muted)_35%,var(--surface-raised))] p-6 shadow-[0_1px_0_rgba(255,255,255,0.85)_inset] sm:p-7 dark:border-stone-700/60 dark:bg-stone-900/35 dark:shadow-[0_1px_0_rgba(255,255,255,0.04)_inset]"
      data-testid="dashboard-gross-breakdown-bar"
    >
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[color:var(--foreground-muted)]">
          Gross allocation
        </p>
        <p className="mt-1 text-sm font-medium leading-snug text-[color:var(--foreground-muted)]">
          Estimated net vs fees &amp; shipping · same import range
        </p>

        <div
          className="mt-5 flex h-3.5 w-full overflow-hidden rounded-full shadow-[inset_0_1px_2px_rgba(0,0,0,0.06)] ring-1 ring-[color:color-mix(in_oklab,var(--border-warm)_55%,transparent)] sm:h-4"
          role="img"
          aria-label={label}
        >
          {netPct > 0.05 ? (
            <div
              className="h-full shrink-0 bg-gradient-to-r from-[color:var(--metric-positive)] to-[color:var(--accent)] transition-[width] duration-500 ease-[cubic-bezier(0.23,1,0.32,1)]"
              style={{ width: `${netPct}%` }}
              title={`Estimated net ${formatCurrency(n)} (${netPct.toFixed(1)}%)`}
            />
          ) : null}
          {costPct > 0.05 ? (
            <div
              className="h-full shrink-0 bg-gradient-to-r from-[color:var(--metric-negative)] to-[color:var(--cta-orange)] transition-[width] duration-500 ease-[cubic-bezier(0.23,1,0.32,1)]"
              style={{ width: `${costPct}%` }}
              title={`Costs ${formatCurrency(c)} (${costPct.toFixed(1)}%)`}
            />
          ) : null}
          {otherPct > 0.5 ? (
            <div
              className="h-full shrink-0 bg-[color:color-mix(in_oklab,var(--surface-muted)_65%,var(--border-warm))] transition-[width] duration-500 ease-[cubic-bezier(0.23,1,0.32,1)]"
              style={{ width: `${otherPct}%` }}
              title={`Unallocated ${otherPct.toFixed(1)}%`}
            />
          ) : null}
        </div>

        <ul className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-[13px]" aria-label="Breakdown values">
          <li className="flex items-center gap-2">
            <span
              className="size-2.5 shrink-0 rounded-full bg-gradient-to-br from-[color:var(--metric-positive)] to-[color:var(--accent)] shadow-sm"
              aria-hidden
            />
            <span className="font-medium text-[color:var(--foreground-muted)]">Net</span>
            <span className="tabular-nums font-semibold text-[color:var(--foreground)]">{formatCurrency(n)}</span>
          </li>
          <li className="flex items-center gap-2">
            <span
              className="size-2.5 shrink-0 rounded-full bg-gradient-to-br from-[color:var(--metric-negative)] to-[color:var(--cta-orange)] shadow-sm"
              aria-hidden
            />
            <span className="font-medium text-[color:var(--foreground-muted)]">Costs</span>
            <span className="tabular-nums font-semibold text-[color:var(--foreground)]">{formatCurrency(c)}</span>
          </li>
          <li className="flex items-center gap-2">
            <span className="size-2.5 shrink-0 rounded-full bg-[color:var(--border-warm)] shadow-sm" aria-hidden />
            <span className="font-medium text-[color:var(--foreground-muted)]">Gross</span>
            <span className="tabular-nums font-semibold text-[color:var(--foreground)]">{formatCurrency(gross)}</span>
          </li>
        </ul>
      </div>
    </div>
  );
}
