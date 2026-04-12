"use client";

import { animate, useReducedMotion } from "framer-motion";
import { startTransition, useEffect, useRef, useState } from "react";

function formatUsd(n: number) {
  return n.toLocaleString(undefined, { style: "currency", currency: "USD" });
}

/** Smooth count-up for currency; respects reduced motion. */
export function AnimatedCurrency({ value }: { value: number | null | undefined }) {
  const reduce = useReducedMotion();
  const [display, setDisplay] = useState(0);
  const fromRef = useRef(0);

  useEffect(() => {
    if (value == null || Number.isNaN(value)) {
      return;
    }
    if (reduce) {
      startTransition(() => {
        setDisplay(value);
      });
      fromRef.current = value;
      return;
    }
    const from = fromRef.current;
    fromRef.current = value;
    const controls = animate(from, value, {
      duration: 0.75,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (v) => setDisplay(v),
    });
    return () => controls.stop();
  }, [value, reduce]);

  if (value == null || Number.isNaN(value)) {
    return <span className="tabular-nums">-</span>;
  }

  return <span className="tabular-nums">{formatUsd(display)}</span>;
}

/** Integer / decimal count-up for non-currency metrics. */
export function AnimatedMetric({
  value,
  decimals = 0,
  suffix = "",
}: {
  value: number | null | undefined;
  decimals?: number;
  suffix?: string;
}) {
  const reduce = useReducedMotion();
  const [display, setDisplay] = useState(0);
  const fromRef = useRef(0);

  useEffect(() => {
    if (value == null || Number.isNaN(value)) return;
    if (reduce) {
      startTransition(() => {
        setDisplay(value);
      });
      fromRef.current = value;
      return;
    }
    const from = fromRef.current;
    fromRef.current = value;
    const controls = animate(from, value, {
      duration: 0.7,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (v) => setDisplay(v),
    });
    return () => controls.stop();
  }, [value, reduce]);

  if (value == null || Number.isNaN(value)) {
    return <span className="tabular-nums">-</span>;
  }

  return (
    <span className="tabular-nums">
      {display.toFixed(decimals)}
      {suffix}
    </span>
  );
}
