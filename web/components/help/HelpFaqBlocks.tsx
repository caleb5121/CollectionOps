"use client";

import Link from "next/link";
import type { ReactNode } from "react";

export function FaqAnswer({ lead, children }: { lead: ReactNode; children?: ReactNode }) {
  return (
    <div className="space-y-2">
      <div className="text-sm font-semibold leading-snug text-slate-900 dark:text-slate-100">{lead}</div>
      {children ? (
        <div className="text-xs leading-relaxed text-slate-500 dark:text-slate-400 sm:text-sm">{children}</div>
      ) : null}
    </div>
  );
}

export function FaqActions({ items }: { items: { label: string; href: string }[] }) {
  if (items.length === 0) return null;
  const base =
    "inline-flex items-center justify-center rounded-lg border border-slate-200/90 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-600/80 dark:bg-slate-900/80 dark:text-slate-200 dark:hover:bg-slate-800/90";
  return (
    <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-4 dark:border-slate-800/80">
      {items.map(({ label, href }) => (
        <Link key={href + label} href={href} className={base}>
          {label}
        </Link>
      ))}
    </div>
  );
}

export function FaqAccordion({
  faqId,
  question,
  isOpen,
  onToggle,
  actions,
  children,
}: {
  faqId: string;
  question: string;
  isOpen: boolean;
  onToggle: (id: string) => void;
  actions?: { label: string; href: string }[];
  children: ReactNode;
}) {
  const panelId = `faq-panel-${faqId}`;
  const triggerId = `faq-trigger-${faqId}`;
  return (
    <div className="app-card-3d rounded-2xl border border-slate-200/85 bg-white/95 dark:border-slate-700/80 dark:bg-slate-900/80">
      <button
        type="button"
        id={triggerId}
        aria-expanded={isOpen}
        aria-controls={panelId}
        onClick={() => onToggle(faqId)}
        className="flex w-full items-start justify-between gap-3 rounded-2xl p-5 text-left transition hover:bg-slate-50/80 dark:hover:bg-slate-800/40 sm:p-6"
      >
        <h3 className="text-base font-bold leading-snug text-slate-900 dark:text-slate-50">{question}</h3>
        <span
          aria-hidden
          className={`mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-200/80 bg-white text-slate-500 transition duration-200 ease-out motion-reduce:duration-0 dark:border-slate-600/80 dark:bg-slate-900 dark:text-slate-400 ${
            isOpen ? "rotate-180" : "rotate-0"
          }`}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      </button>
      <div
        className={`grid overflow-hidden transition-[grid-template-rows] duration-200 ease-out motion-reduce:duration-0 ${
          isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        }`}
      >
        <div className="min-h-0">
          <div
            id={panelId}
            role="region"
            aria-labelledby={triggerId}
            className="space-y-2 border-t border-slate-100/90 px-5 pb-5 pt-0 dark:border-slate-800/80 sm:px-6 sm:pb-6"
          >
            <div className="pt-3">{children}</div>
            {actions?.length ? <FaqActions items={actions} /> : null}
          </div>
        </div>
      </div>
    </div>
  );
}
