/**
 * Compare Order List rollups to Sales Summary totals (informational only — does not block workspace).
 */

export type FinancialConsistencyLevel = "ok" | "warn" | "severe";

export type CrossFileFinancialConsistency = {
  level: FinancialConsistencyLevel;
  headline: string;
  sublines: string[];
};

function money(n: number): string {
  return n.toLocaleString(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 2 });
}

function scaleRef(a: number, b: number): number {
  return Math.max(Math.abs(a), Math.abs(b), 50);
}

/** Tight band: within this counts as “consistent”. */
function epsilonOk(ref: number): number {
  return Math.max(2.5, ref * 0.006);
}

/** Beyond this (per metric) contributes to “severe” tier. */
function epsilonSevere(ref: number): number {
  return Math.max(50, ref * 0.1);
}

function classifyDiff(diff: number, ref: number): FinancialConsistencyLevel {
  const d = Math.abs(diff) < 0.02 ? 0 : Math.abs(diff);
  if (d <= epsilonOk(ref)) return "ok";
  if (d <= epsilonSevere(ref)) return "warn";
  return "severe";
}

const levelRank: Record<FinancialConsistencyLevel, number> = { ok: 0, warn: 1, severe: 2 };

function maxLevel(a: FinancialConsistencyLevel, b: FinancialConsistencyLevel): FinancialConsistencyLevel {
  return levelRank[b] > levelRank[a] ? b : a;
}

type ComparedMetric = "gross" | "net" | "shipping";

/**
 * @param compareShipping — Only when Sales Summary includes a shipping column; avoids false gaps when summary omits shipping.
 */
export function computeCrossFileFinancialConsistency(input: {
  orderGross: number;
  summaryGross: number;
  orderNet: number | null;
  summaryNet: number;
  orderShipping: number;
  summaryShipping: number;
  compareShipping: boolean;
}): CrossFileFinancialConsistency {
  type Row = {
    metric: ComparedMetric;
    order: number;
    summary: number;
    ref: number;
  };

  const rows: Row[] = [];
  rows.push({
    metric: "gross",
    order: input.orderGross,
    summary: input.summaryGross,
    ref: scaleRef(input.orderGross, input.summaryGross),
  });

  if (input.orderNet != null) {
    rows.push({
      metric: "net",
      order: input.orderNet,
      summary: input.summaryNet,
      ref: scaleRef(input.orderNet, input.summaryNet),
    });
  }

  if (input.compareShipping) {
    rows.push({
      metric: "shipping",
      order: input.orderShipping,
      summary: input.summaryShipping,
      ref: scaleRef(input.orderShipping, input.summaryShipping),
    });
  }

  let worst: FinancialConsistencyLevel = "ok";
  const detailLines: string[] = [];

  for (const c of rows) {
    const diff = c.order - c.summary;
    const lvl = classifyDiff(diff, c.ref);
    worst = maxLevel(worst, lvl);
    if (lvl !== "ok") {
      if (c.metric === "gross") {
        detailLines.push(
          `Orders calculate ${money(c.order)} gross, but Sales Summary reports ${money(c.summary)}.`,
        );
      } else if (c.metric === "net") {
        detailLines.push(
          `Orders calculate ${money(c.order)} net, but Sales Summary reports ${money(c.summary)}.`,
        );
      } else {
        detailLines.push(
          `Orders show ${money(c.order)} shipping collected, but Sales Summary reports ${money(c.summary)}.`,
        );
      }
    }
  }

  if (worst === "ok") {
    return { level: "ok", headline: "Your data is ready", sublines: [] };
  }
  if (worst === "warn") {
    return {
      level: "warn",
      headline: "Something doesn’t match",
      sublines: [
        ...detailLines,
        "These files may cover different portions of the month or different exports.",
      ],
    };
  }
  return {
    level: "severe",
    headline: "Review your data",
    sublines: ["Totals don’t line up between your Order List and Sales Summary.", ...detailLines],
  };
}
