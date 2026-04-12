"use client";

import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

/** Space between ⓘ trigger and popover edge (px). */
const GAP_PX = 5;
const VIEW_PAD = 8;

function PopoverArrow({ placement }: { placement: "right" | "top" }) {
  if (placement === "right") {
    return (
      <svg
        aria-hidden
        className="pointer-events-none absolute top-1/2 z-[1] h-[11px] w-[6px] -translate-y-1/2 text-slate-200/95 dark:text-slate-600/90"
        style={{ left: -5 }}
        viewBox="0 0 6 11"
        fill="none"
      >
        <path
          d="M6 0.5v10L0.5 5.5 6 0.5z"
          className="fill-white dark:fill-slate-900"
          stroke="currentColor"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  return (
    <svg
      aria-hidden
      className="pointer-events-none absolute left-1/2 z-[1] h-[6px] w-[11px] -translate-x-1/2 text-slate-200/95 dark:text-slate-600/90"
      style={{ bottom: -5 }}
      viewBox="0 0 11 6"
      fill="none"
    >
      <path
        d="M0.5 0h10L5.5 5.5 0.5 0z"
        className="fill-white dark:fill-slate-900"
        stroke="currentColor"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function PopoverBody() {
  return (
    <div className="w-[11rem] shrink-0 px-3.5 py-3 font-mono text-[11px] tabular-nums leading-snug">
      <p className="mb-2 text-slate-800 dark:text-slate-100">$10 sale</p>
      <div className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-1">
        <span className="text-slate-500 dark:text-slate-400">Fees</span>
        <span className="text-right">−$1.50</span>
        <span className="text-slate-500 dark:text-slate-400">Shipping</span>
        <span className="text-right">−$1.00</span>
      </div>
      <div className="mt-2 space-y-1 border-t border-slate-200/85 pt-2 dark:border-slate-600/80">
        <div className="grid grid-cols-[1fr_auto] gap-x-4 font-semibold text-[color:var(--accent)] dark:text-teal-300">
          <span>After</span>
          <span className="text-right">$7.50</span>
        </div>
        <div className="grid grid-cols-[1fr_auto] gap-x-4 text-slate-600 dark:text-slate-400">
          <span>Before</span>
          <span className="text-right">$8.50</span>
        </div>
      </div>
    </div>
  );
}

/**
 * Compact explainer: opens to the right of the trigger when possible (above if narrow).
 * Portaled so it never stacks over the Calculations card content below.
 */
export default function ShippingProfitPopover() {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const [placement, setPlacement] = useState<"right" | "top">("right");

  const measureAndPlace = useCallback(() => {
    const trigger = triggerRef.current;
    const panel = popoverRef.current;
    if (!trigger || !panel) return;

    const tr = trigger.getBoundingClientRect();
    const w = panel.offsetWidth;
    const h = panel.offsetHeight;
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    const fitsRight = tr.right + GAP_PX + w <= vw - VIEW_PAD;
    const place: "right" | "top" = fitsRight ? "right" : "top";

    let left: number;
    let top: number;
    if (place === "right") {
      left = tr.right + GAP_PX;
      top = tr.top + tr.height / 2 - h / 2;
    } else {
      left = tr.left + tr.width / 2 - w / 2;
      top = tr.top - h - GAP_PX;
    }

    left = Math.min(Math.max(VIEW_PAD, left), vw - w - VIEW_PAD);
    top = Math.min(Math.max(VIEW_PAD, top), vh - h - VIEW_PAD);

    setCoords({ top, left });
    setPlacement(place);
  }, []);

  useLayoutEffect(() => {
    if (!open) return;

    const run = () => measureAndPlace();
    run();
    const rafId = requestAnimationFrame(run);
    const ro = new ResizeObserver(run);
    if (popoverRef.current) ro.observe(popoverRef.current);
    window.addEventListener("resize", run);
    window.addEventListener("scroll", run, true);
    return () => {
      cancelAnimationFrame(rafId);
      ro.disconnect();
      window.removeEventListener("resize", run);
      window.removeEventListener("scroll", run, true);
    };
  }, [open, measureAndPlace]);

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      const t = e.target as Node;
      if (triggerRef.current?.contains(t)) return;
      if (popoverRef.current?.contains(t)) return;
      setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const portal =
    open && typeof document !== "undefined"
      ? createPortal(
          <div
            ref={popoverRef}
            className="fixed z-[200] overflow-visible rounded-xl border border-slate-200/90 bg-white text-left shadow-[0_12px_42px_-10px_rgba(15,23,42,0.32),0_4px_14px_-4px_rgba(15,23,42,0.14)] dark:border-slate-600/90 dark:bg-slate-900 dark:shadow-[0_18px_52px_-14px_rgba(0,0,0,0.58)]"
            style={{ top: coords.top, left: coords.left }}
            role="region"
            aria-label="Example: shipping in profit calculation"
          >
            <PopoverArrow placement={placement} />
            <PopoverBody />
          </div>,
          document.body
        )
      : null;

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="inline-flex cursor-help text-slate-400 transition-colors hover:text-[color:var(--accent)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent)]/35 dark:text-slate-500 dark:hover:text-[color:var(--accent)]"
        aria-label="Example: how shipping affects profit"
        aria-expanded={open}
      >
        <span className="select-none text-[11px] leading-none">ⓘ</span>
      </button>
      {portal}
    </>
  );
}
