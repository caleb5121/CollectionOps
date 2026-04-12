/** Short, decision-oriented copy for the Dashboard - pure functions. */

export function dominantOrderBand(
  rows: { label: string; count: number }[],
  total: number
): { label: string; sharePct: number } | null {
  if (total <= 0 || rows.length === 0) return null;
  let best = rows[0]!;
  let bestShare = best.count / total;
  for (const r of rows) {
    const s = r.count / total;
    if (s > bestShare) {
      best = r;
      bestShare = s;
    }
  }
  return { label: best.label, sharePct: bestShare * 100 };
}

export function orderBandHeadline(dominant: { label: string; sharePct: number } | null): string {
  if (!dominant || dominant.sharePct < 30) return "Order mix is spread across checkout sizes.";
  if (dominant.label === "Under $5") return "Most of your orders are under $5.";
  if (dominant.label === "$5–10") return "Most of your orders are in the $5–10 range.";
  if (dominant.label === "$10–20") return "Most of your orders are in the $10–20 range.";
  return "A large share of orders are $20+ checkouts.";
}

export function orderBandImplication(dominant: { label: string; sharePct: number } | null): string {
  if (!dominant || dominant.sharePct < 30) {
    return "No single checkout band dominates - buyers are buying at varied price points.";
  }
  if (dominant.label === "Under $5") {
    return "Low-ticket volume often means more packs per dollar of headline revenue - watch fees and shipping assumptions.";
  }
  if (dominant.label === "$5–10" || dominant.label === "$10–20") {
    return "This range is driving most of your order volume - your store behaves like a mid-checkout seller in this export.";
  }
  return "Higher checkouts are carrying a large share of orders - fewer boxes, larger baskets.";
}

export function buildHalfPeriodStory(
  revPct: number | null,
  ordPct: number | null,
  shipPct: number | null
): { lead: string; implication: string } {
  const sig = (p: number | null) => p != null && Number.isFinite(p) && Math.abs(p) >= 4;

  const chunks: string[] = [];
  if (sig(ordPct)) {
    chunks.push(
      ordPct! >= 0
        ? `Orders rose about ${Math.abs(ordPct!).toFixed(0)}% in the second half of the period`
        : `Orders fell about ${Math.abs(ordPct!).toFixed(0)}% in the second half of the period`
    );
  }
  if (sig(revPct)) {
    chunks.push(
      revPct! >= 0
        ? `revenue rose about ${Math.abs(revPct!).toFixed(0)}%`
        : `revenue fell about ${Math.abs(revPct!).toFixed(0)}%`
    );
  }
  if (sig(shipPct)) {
    chunks.push(
      shipPct! >= 0
        ? `shipping collected rose about ${Math.abs(shipPct!).toFixed(0)}%`
        : `shipping collected fell about ${Math.abs(shipPct!).toFixed(0)}%`
    );
  }

  if (chunks.length === 0) {
    return {
      lead: "No meaningful shift between the first and second half of this export.",
      implication: "Momentum is steady - neither half stands out as a breakout phase.",
    };
  }

  const lead =
    chunks.length === 1
      ? `${chunks[0]}.`
      : `${chunks[0]}, while ${chunks.slice(1).join(", ")}.`;

  const strongOrder = sig(ordPct) && Math.abs(ordPct!) >= 12;
  const implication = strongOrder
    ? ordPct! > 0
      ? "Momentum picked up later in the window."
      : "Activity cooled in the latter half - worth comparing to your next upload."
    : "Performance is mostly even across the period.";

  return { lead, implication };
}

export function shippingNetInterpretation(net: number | null): string {
  if (net == null || Number.isNaN(net)) return "Add order and shipping totals to judge shipping here.";
  if (net > 20) return "Shipping collected is covering your estimated fulfillment cost with room left.";
  if (net < -20) return "After your per-order cost estimate, shipping is likely eating into margin - tune Settings if needed.";
  return "Shipping collected and estimated cost look roughly balanced.";
}

export function buildHeroInterpretationLine(params: {
  momentumScore: number;
  feeEfficiencyScore: number;
  orderStrengthScore: number;
  feeRate: number | null;
  ordersPerDay: number | null;
  avgNetPerOrder: number | null;
  dominantBandLabel: string | null;
}): string {
  const { momentumScore, feeEfficiencyScore, orderStrengthScore, feeRate, ordersPerDay, avgNetPerOrder, dominantBandLabel } =
    params;

  const lowActivity = momentumScore < 45;
  const heavyFees = feeEfficiencyScore < 45;
  const strongBaskets = orderStrengthScore >= 65;
  const midBand = dominantBandLabel === "$5–10" || dominantBandLabel === "$10–20";

  if (lowActivity && strongBaskets) {
    return "Lower day-to-day activity, but healthy checkout totals when orders land.";
  }
  if (heavyFees && strongBaskets && feeRate != null && feeRate > 0.12) {
    return "Strong order value with noticeable fee drag - typical for marketplace selling.";
  }
  if (ordersPerDay != null && ordersPerDay >= 2 && midBand) {
    return "Steady output driven by mid-range checkouts.";
  }
  if (avgNetPerOrder != null && avgNetPerOrder >= 9 && ordersPerDay != null && ordersPerDay < 2) {
    return "Healthy per-order return, but order frequency is modest in this window.";
  }
  if (!heavyFees && orderStrengthScore >= 45 && momentumScore >= 45) {
    return "Balanced fee load with sustainable basket size for this export.";
  }
  return "Here’s how this export averages - upload again to track the next period.";
}

export function buildStoreProfileTakeaway(
  momentumScore: number,
  feeEfficiencyScore: number,
  orderStrengthScore: number
): string {
  const lowMom = momentumScore < 45;
  const highMom = momentumScore >= 70;
  const heavyFee = feeEfficiencyScore < 45;
  const lightFee = feeEfficiencyScore >= 70;
  const smallBasket = orderStrengthScore < 45;
  const largeBasket = orderStrengthScore >= 70;

  if (lowMom && largeBasket) return "Quiet day-to-day flow, but strong baskets when buyers check out.";
  if (heavyFee && smallBasket) return "Fees bite harder when average checkout stays small - watch net per order.";
  if (lightFee && largeBasket) return "Efficient fee relationship alongside larger checkouts.";
  if (highMom && !smallBasket) return "Active stretch with solid order sizes - this window is working.";
  return "Moderate order flow with a mixed fee and basket profile.";
}

export function buildKeyTakeawayBullets(params: {
  avgNetPerOrder: number | null;
  dominantBandHeadline: string | null;
  shippingNet: number | null;
  effectiveFeeRate: number | null;
  /** Order CSV rows present (may still be unmapped). */
  hasOrderImport: boolean;
  /** Order columns recognized for calculations. */
  orderListCalculationReady: boolean;
  hasDashboardImport: boolean;
}): string[] {
  const {
    avgNetPerOrder,
    dominantBandHeadline,
    shippingNet,
    effectiveFeeRate,
    hasOrderImport,
    orderListCalculationReady,
    hasDashboardImport,
  } = params;

  const out: string[] = [];

  if (avgNetPerOrder != null && hasDashboardImport) {
    out.push(
      `You average ${avgNetPerOrder.toLocaleString(undefined, { style: "currency", currency: "USD" })} net per order.`
    );
  }

  if (dominantBandHeadline && orderListCalculationReady) {
    const h = dominantBandHeadline;
    if (!out.includes(h)) out.push(h);
  }

  if (shippingNet != null && hasDashboardImport && orderListCalculationReady) {
    if (shippingNet > 15) out.push("Shipping looks slightly profitable after your cost assumption.");
    else if (shippingNet < -15) out.push("Shipping may be underwater after estimated packing cost.");
    else out.push("Shipping looks roughly neutral against your cost estimate.");

    if (out.length >= 3) return out.slice(0, 3);
  }

  if (effectiveFeeRate != null && hasDashboardImport && out.length < 3) {
    out.push(`Effective fee rate is about ${(effectiveFeeRate * 100).toFixed(1)}% of gross.`);
  }

  if (out.length === 0 && !hasDashboardImport && orderListCalculationReady) {
    out.push("Order mix and trends are live - add a Sales Summary for net and fee context.");
  }
  if (out.length === 0 && hasDashboardImport && !orderListCalculationReady) {
    out.push("Totals and fees are live - add an Order List for checkout mix and day-level patterns.");
  }
  if (out.length === 0 && hasOrderImport && !orderListCalculationReady) {
    out.push(
      "Order file loaded, but columns weren’t recognized for calculations - use standard TCGplayer Order List exports (see Imports)."
    );
  }
  if (out.length === 0) {
    out.push("Import your TCGplayer exports to unlock takeaways for this workspace.");
  }

  return out.slice(0, 3);
}
