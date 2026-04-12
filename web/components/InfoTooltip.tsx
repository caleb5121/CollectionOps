"use client";

import React, { useState, useRef, useEffect, useLayoutEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";

type Props = {
  /** Plain string (preserves newlines). Ignored when `children` is set. */
  text?: string;
  children?: ReactNode;
  "aria-label"?: string;
  /** Replaces the default circle-“i” SVG (e.g. pass ⓘ). */
  marker?: ReactNode;
};

export default function InfoTooltip({ text, children, "aria-label": ariaLabel, marker }: Props) {
  const body = children ?? text ?? "";
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const leaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [panelStyle, setPanelStyle] = useState<React.CSSProperties>({
    position: "fixed",
    top: 0,
    left: 0,
    width: 320,
    zIndex: 200,
  });

  const clearLeaveTimer = () => {
    if (leaveTimer.current != null) {
      clearTimeout(leaveTimer.current);
      leaveTimer.current = null;
    }
  };

  const scheduleClose = () => {
    clearLeaveTimer();
    leaveTimer.current = setTimeout(() => setOpen(false), 120);
  };

  const updatePosition = () => {
    const btn = triggerRef.current;
    const panel = panelRef.current;
    if (!btn) return;
    const rect = btn.getBoundingClientRect();
    const margin = 8;
    const maxW = Math.min(320, window.innerWidth - margin * 2);
    let left = rect.left + rect.width / 2 - maxW / 2;
    left = Math.max(margin, Math.min(left, window.innerWidth - maxW - margin));

    let top = rect.bottom + margin;
    const estHeight = panel?.offsetHeight ?? 280;
    if (top + estHeight > window.innerHeight - margin) {
      const above = rect.top - margin - estHeight;
      if (above >= margin) {
        top = above;
      }
    }

    setPanelStyle((s) => ({ ...s, top, left, width: maxW }));
  };

  useLayoutEffect(() => {
    if (!open) return;
    const ro = new ResizeObserver(() => updatePosition());
    updatePosition();
    const id = requestAnimationFrame(() => {
      updatePosition();
      if (panelRef.current) ro.observe(panelRef.current);
    });
    window.addEventListener("scroll", updatePosition, true);
    window.addEventListener("resize", updatePosition);
    return () => {
      cancelAnimationFrame(id);
      ro.disconnect();
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("resize", updatePosition);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      const t = e.target as Node;
      if (triggerRef.current?.contains(t)) return;
      if (panelRef.current?.contains(t)) return;
      setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  useEffect(
    () => () => {
      clearLeaveTimer();
    },
    [],
  );

  const onEnter = () => {
    clearLeaveTimer();
    setOpen(true);
  };
  const onLeave = () => {
    scheduleClose();
  };

  const panel = open ? (
    <div
      ref={panelRef}
      role="tooltip"
      style={panelStyle}
      className={`fixed max-h-[min(70vh,calc(100vh-2rem))] overflow-y-auto rounded-lg border border-slate-200/90 bg-white p-3 text-left text-xs leading-relaxed text-slate-700 shadow-lg dark:border-slate-600/90 dark:bg-slate-800 dark:text-slate-100 ${children == null ? "whitespace-pre-line" : ""}`}
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
    >
      {body}
    </div>
  ) : null;

  return (
    <>
      <div className="relative inline-flex">
        <button
          ref={triggerRef}
          type="button"
          onClick={() => setOpen((o) => !o)}
          onMouseEnter={onEnter}
          onMouseLeave={onLeave}
          className="cursor-help text-slate-400 transition-colors hover:text-[var(--accent)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]/35 dark:text-slate-500 dark:hover:text-[var(--accent)]"
          aria-label={ariaLabel ?? "Help: more information"}
          aria-expanded={open}
        >
          {marker ?? (
            <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 20 20" aria-hidden>
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                clipRule="evenodd"
              />
            </svg>
          )}
        </button>
      </div>
      {typeof document !== "undefined" && panel ? createPortal(panel, document.body) : null}
    </>
  );
}
