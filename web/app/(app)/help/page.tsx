"use client";

import Link from "next/link";
import { useCallback, useState } from "react";

import Card from "../../../components/Card";
import { CollectionOpsIllustration } from "../../../components/illustrations/CollectionOpsIllustration";
import PageShell from "../../../components/PageShell";

const SUPPORT_EMAIL = "support@collectionops.com";
const DISCORD_HREF = "https://discord.gg/ZJrehxKRH";

export default function HelpPage() {
  const [emailCopied, setEmailCopied] = useState(false);

  const copySupportEmail = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(SUPPORT_EMAIL);
      setEmailCopied(true);
      window.setTimeout(() => setEmailCopied(false), 2000);
    } catch {
      /* ignore */
    }
  }, []);

  return (
    <PageShell maxWidth="wide">
      <div className="relative flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0 flex-1">
          <h2 className="text-2xl font-bold tracking-tight text-[color:var(--foreground)] sm:text-3xl">Help Center</h2>
          <p className="mt-3 max-w-2xl text-base leading-relaxed text-stone-600 dark:text-stone-400">
            Find guides, FAQs, and support for CollectionOps.
          </p>
        </div>
        <div className="pointer-events-none flex shrink-0 justify-center md:mt-0 md:justify-end md:pl-4">
          <CollectionOpsIllustration
            src="/illustrations/help-hero.svg"
            alt="Illustration of online support and messaging"
            width={652}
            height={551}
            size="hero"
            className="opacity-90"
          />
        </div>
      </div>

      <div className="mt-8 grid gap-4 sm:gap-6 md:grid-cols-2">
        <Link
          href="/help/getting-your-csvs"
          className="group block rounded-[var(--radius-card)] outline-none transition focus-visible:ring-2 focus-visible:ring-[color:var(--accent)]/40 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)]"
        >
          <Card className="flex h-full flex-col p-6 transition-[transform,border-color,box-shadow] duration-200 ease-out group-hover:-translate-y-0.5 group-hover:border-[color:color-mix(in_oklab,var(--accent)_28%,var(--border-warm))] group-hover:shadow-[var(--shadow-card-glow-accent)] sm:p-8">
            <h3 className="text-lg font-bold leading-snug tracking-tight text-slate-950 dark:text-slate-50 sm:text-xl">
              Getting Started: How to Get Your CSVs from TCGplayer
            </h3>
            <p className="mt-2 flex-1 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
              Step-by-step screenshots: Orders, filters, Sales Summary, then upload both files in Imports.
            </p>
            <span className="mt-5 inline-flex items-center gap-1 text-sm font-semibold text-[color:var(--accent)]">
              Open guide
              <span aria-hidden className="transition-transform group-hover:translate-x-0.5">
                →
              </span>
            </span>
          </Card>
        </Link>

        <Link
          href="/help/faq"
          className="group block rounded-[var(--radius-card)] outline-none transition focus-visible:ring-2 focus-visible:ring-[color:var(--accent)]/40 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)]"
        >
          <Card className="flex h-full flex-col p-6 transition-[transform,border-color,box-shadow] duration-200 ease-out group-hover:-translate-y-0.5 group-hover:border-[color:color-mix(in_oklab,var(--accent)_28%,var(--border-warm))] group-hover:shadow-[var(--shadow-card-glow-accent)] sm:p-8">
            <h3 className="text-lg font-bold leading-snug tracking-tight text-slate-950 dark:text-slate-50 sm:text-xl">
              Frequently Asked Questions
            </h3>
            <p className="mt-2 flex-1 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
              Imports, date ranges, export buttons, columns, demos, and more — the full list in one place.
            </p>
            <span className="mt-5 inline-flex items-center gap-1 text-sm font-semibold text-[color:var(--accent)]">
              Open FAQ
              <span aria-hidden className="transition-transform group-hover:translate-x-0.5">
                →
              </span>
            </span>
          </Card>
        </Link>
      </div>

      <Card className="mt-8 border-stone-200/90 p-5 sm:p-6 dark:border-stone-700/70">
        <h3 className="text-sm font-bold uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400">Common issues</h3>
        <ul className="mt-3 list-inside list-disc space-y-2 text-sm leading-relaxed text-slate-700 dark:text-slate-300">
          <li>
            Files won&apos;t pair? Usually mismatched date ranges — see the{" "}
            <Link href="/help/faq" className="font-semibold text-[color:var(--accent)] underline-offset-2 hover:underline">
              FAQ
            </Link>
            .
          </li>
          <li>
            No Export Orders button? You need See Results first —{" "}
            <Link
              href="/help/getting-your-csvs#troubleshooting"
              className="font-semibold text-[color:var(--accent)] underline-offset-2 hover:underline"
            >
              troubleshooting
            </Link>{" "}
            in the guide.
          </li>
        </ul>
      </Card>

      <Card className="mt-8 p-6 sm:p-8">
        <h3 className="text-lg font-bold tracking-tight text-slate-950 dark:text-slate-50">Still need help?</h3>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600 dark:text-slate-400">
          Join the community on Discord or email us — we usually reply within 24 hours.
        </p>
        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
          <a
            href={DISCORD_HREF}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center rounded-lg bg-[color:var(--accent)] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[color:var(--accent-hover)] dark:text-stone-950"
          >
            Join Discord
          </a>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <a
              href={`mailto:${SUPPORT_EMAIL}`}
              className="font-semibold text-[color:var(--accent)] underline-offset-2 hover:underline"
            >
              {SUPPORT_EMAIL}
            </a>
            <button
              type="button"
              onClick={copySupportEmail}
              className="inline-flex h-9 shrink-0 items-center justify-center rounded-lg border border-slate-200/90 bg-white px-3 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-slate-600/80 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              {emailCopied ? "Copied!" : "Copy email"}
            </button>
          </div>
        </div>
      </Card>
    </PageShell>
  );
}
