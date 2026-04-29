"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import Card from "../../../components/Card";
import PageShell from "../../../components/PageShell";

const SUPPORT_EMAIL = "support@collectionops.com";

const SECTION_SCROLL_HIGHLIGHT_MS = 2000;
const SECTION_SCROLL_HIGHLIGHT_DELAY_MS = 600;

function BrowseTopicPill({
  sectionId,
  children,
  onJump,
}: {
  sectionId: string;
  children: React.ReactNode;
  onJump: (sectionId: string) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onJump(sectionId)}
      className="inline-flex items-center rounded-full bg-[color:var(--accent)] px-3.5 py-2 text-xs font-semibold text-white shadow-md transition hover:brightness-110 hover:shadow-lg"
    >
      {children}
    </button>
  );
}

function CommonQuestionPill({
  sectionId,
  icon,
  label,
  onJump,
}: {
  sectionId: string;
  icon: string;
  label: string;
  onJump: (sectionId: string) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onJump(sectionId)}
      className="inline-flex items-center gap-1.5 rounded-full border border-slate-200/90 bg-white/40 px-2.5 py-1 text-[11px] font-medium text-slate-600 transition hover:border-slate-300 hover:bg-white hover:text-slate-800 dark:border-slate-600/70 dark:bg-slate-900/30 dark:text-slate-400 dark:hover:border-slate-500 dark:hover:bg-slate-900/60 dark:hover:text-slate-200 sm:px-3 sm:py-1.5 sm:text-xs"
    >
      <span className="inline-flex h-[1em] w-[1em] shrink-0 select-none items-center justify-center text-[0.95rem] leading-none opacity-85" aria-hidden>
        {icon}
      </span>
      <span>{label}</span>
    </button>
  );
}

function FaqAnswer({ lead, children }: { lead: React.ReactNode; children?: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <div className="text-sm font-semibold leading-snug text-slate-900 dark:text-slate-100">{lead}</div>
      {children ? (
        <div className="text-xs leading-relaxed text-slate-500 dark:text-slate-400 sm:text-sm">{children}</div>
      ) : null}
    </div>
  );
}

function FaqActions({ items }: { items: { label: string; href: string }[] }) {
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

function FaqAccordion({
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
  children: React.ReactNode;
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

function Section({
  id,
  title,
  isHighlighted,
  children,
}: {
  id: string;
  title: string;
  isHighlighted?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section
      id={id}
      className={`app-section-surface scroll-mt-24 space-y-4 rounded-2xl p-6 transition-[box-shadow,ring] duration-500 sm:p-8 ${
        isHighlighted
          ? "ring-2 ring-teal-500/55 shadow-[0_0_0_1px_rgba(20,184,166,0.2),0_12px_40px_-12px_rgba(20,184,166,0.25)] dark:ring-teal-400/45 dark:shadow-[0_0_0_1px_rgba(45,212,191,0.15),0_12px_40px_-12px_rgba(45,212,191,0.12)]"
          : ""
      }`}
    >
      <h2 className="text-xl font-bold tracking-tight text-slate-950 dark:text-slate-50">{title}</h2>
      <div className="flex flex-col gap-4">{children}</div>
    </section>
  );
}

export default function HelpPage() {
  const [openFaqId, setOpenFaqId] = useState<string | null>(null);
  const [emailCopied, setEmailCopied] = useState(false);
  const [highlightedSectionId, setHighlightedSectionId] = useState<string | null>(null);

  const jumpToSection = useCallback((sectionId: string) => {
    const el = document.getElementById(sectionId);
    if (!el) return;
    setHighlightedSectionId(null);
    el.scrollIntoView({ behavior: "smooth", block: "start" });
    window.setTimeout(() => {
      setHighlightedSectionId(sectionId);
      window.setTimeout(() => setHighlightedSectionId(null), SECTION_SCROLL_HIGHLIGHT_MS);
    }, SECTION_SCROLL_HIGHLIGHT_DELAY_MS);
  }, []);

  const toggleFaq = useCallback((id: string) => {
    setOpenFaqId((prev) => (prev === id ? null : id));
  }, []);

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
      <div className="rounded-2xl border border-slate-200/80 bg-white/90 p-5 dark:border-slate-700/70 dark:bg-slate-900/50 sm:p-6">
        <h2 className="text-sm font-bold tracking-tight text-slate-900 dark:text-slate-50">Browse topics</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          <BrowseTopicPill sectionId="getting-started" onJump={jumpToSection}>
            Getting Started
          </BrowseTopicPill>
          <BrowseTopicPill sectionId="profit-fees" onJump={jumpToSection}>
            Profit &amp; Fees
          </BrowseTopicPill>
          <BrowseTopicPill sectionId="using-app" onJump={jumpToSection}>
            Using the App
          </BrowseTopicPill>
          <BrowseTopicPill sectionId="privacy" onJump={jumpToSection}>
            Privacy
          </BrowseTopicPill>
        </div>

        <div className="mt-8 border-t border-slate-200/70 pt-8 dark:border-slate-700/60">
          <h2 className="text-sm font-bold tracking-tight text-slate-900 dark:text-slate-50">Common questions</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            <CommonQuestionPill sectionId="getting-started" icon="📁" label="Uploading files" onJump={jumpToSection} />
            <CommonQuestionPill sectionId="profit-fees" icon="💰" label="Understanding profit" onJump={jumpToSection} />
            <CommonQuestionPill sectionId="profit-fees" icon="🔧" label="Fixing numbers" onJump={jumpToSection} />
            <CommonQuestionPill sectionId="using-app" icon="📊" label="Using dashboard" onJump={jumpToSection} />
          </div>
        </div>
      </div>

      <Card className="mt-8 p-6 sm:p-8">
        <h2 className="text-xl font-bold tracking-tight text-slate-950 dark:text-slate-50">Get profit in three steps</h2>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">Export from TCGplayer → import → read the dashboard.</p>
        <ol className="mt-5 list-inside list-decimal space-y-3 text-sm leading-relaxed text-slate-700 marker:font-semibold dark:text-slate-300">
          <li>
            <span className="font-medium text-slate-900 dark:text-slate-100">Import.</span> On{" "}
            <Link href="/data" className="font-semibold text-teal-700 underline-offset-2 hover:underline dark:text-teal-400">
              Imports
            </Link>
            , pick a label, add Order List + Sales Summary.
          </li>
          <li>
            <span className="font-medium text-slate-900 dark:text-slate-100">Review.</span> Open the{" "}
            <Link
              href="/dashboard"
              className="font-semibold text-teal-700 underline-offset-2 hover:underline dark:text-teal-400"
            >
              Dashboard
            </Link>{" "}
            for net and patterns.
          </li>
          <li>
            <span className="font-medium text-slate-900 dark:text-slate-100">Tune.</span>{" "}
            <Link
              href="/settings"
              className="font-semibold text-teal-700 underline-offset-2 hover:underline dark:text-teal-400"
            >
              Settings
            </Link>{" "}
            for shipping assumptions.
          </li>
        </ol>
        <div className="mt-6 flex flex-wrap gap-2">
          <Link
            href="/data"
            className="inline-flex rounded-xl bg-[color:var(--accent)] px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:brightness-110"
          >
            Go to Imports
          </Link>
          <Link
            href="/dashboard"
            className="inline-flex rounded-xl border border-slate-200/90 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 shadow-sm hover:bg-slate-50 dark:border-slate-600/80 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
          >
            Open Dashboard
          </Link>
        </div>
      </Card>

      <div className="mt-8 flex flex-col gap-8 sm:mt-10 sm:gap-10">
        <Section id="getting-started" title="Getting started" isHighlighted={highlightedSectionId === "getting-started"}>
          <FaqAccordion
            faqId="gs-upload"
            question="What do I upload?"
            isOpen={openFaqId === "gs-upload"}
            onToggle={toggleFaq}
            actions={[{ label: "Go to Imports", href: "/data" }]}
          >
            <FaqAnswer lead="Upload 2 TCGplayer exports:">
              <>
                <ul className="list-inside list-disc space-y-0.5">
                  <li>Order List</li>
                  <li>Sales Summary</li>
                </ul>
                <p className="mt-1">Merged in your browser.</p>
              </>
            </FaqAnswer>
          </FaqAccordion>
          <FaqAccordion
            faqId="gs-why-two"
            question="Why two files?"
            isOpen={openFaqId === "gs-why-two"}
            onToggle={toggleFaq}
          >
            <FaqAnswer lead="Each file covers different fields.">
              <ul className="list-inside list-disc space-y-0.5">
                <li>Order List → daily patterns &amp; basket size</li>
                <li>Sales Summary → fees &amp; period totals</li>
              </ul>
            </FaqAnswer>
          </FaqAccordion>
          <FaqAccordion
            faqId="gs-period"
            question="What time period am I looking at?"
            isOpen={openFaqId === "gs-period"}
            onToggle={toggleFaq}
          >
            <FaqAnswer lead="Whatever dates are in the files you imported.">
              Short windows mean softer conclusions; the app calls that out.
            </FaqAnswer>
          </FaqAccordion>
          <FaqAccordion
            faqId="gs-replace"
            question="Does this replace TCGplayer?"
            isOpen={openFaqId === "gs-replace"}
            onToggle={toggleFaq}
          >
            <FaqAnswer lead="No.">CardOps doesn’t list, charge, or run your store. It only reads your exports.</FaqAnswer>
          </FaqAccordion>
        </Section>

        <Section id="profit-fees" title="Profit &amp; fees" isHighlighted={highlightedSectionId === "profit-fees"}>
          <FaqAccordion
            faqId="pf-earned"
            question='How is "total earned" calculated?'
            isOpen={openFaqId === "pf-earned"}
            onToggle={toggleFaq}
          >
            <FaqAnswer lead="Gross sales − TCGplayer fees − your shipping estimate (per order).">
              <>
                Turn shipping off in{" "}
                <Link
                  href="/account"
                  className="font-semibold text-teal-700 underline-offset-2 hover:underline dark:text-teal-400"
                >
                  Account
                </Link>{" "}
                if it doesn’t apply.
                <p className="mt-1">Pack-and-ship isn’t in the CSV. That’s why we say “estimated.”</p>
              </>
            </FaqAnswer>
          </FaqAccordion>
          <FaqAccordion
            faqId="pf-lower"
            question="Why does my profit seem lower than expected?"
            isOpen={openFaqId === "pf-lower"}
            onToggle={toggleFaq}
          >
            <FaqAnswer
              lead={
                <>
                  Check{" "}
                  <Link
                    href="/settings"
                    className="font-semibold text-teal-700 underline-offset-2 hover:underline dark:text-teal-400"
                  >
                    Settings
                  </Link>{" "}
                  shipping. Higher assumptions pull net down.
                </>
              }
            >
              Refunds in exports can also be incomplete. Your CSV is the accuracy ceiling.
            </FaqAnswer>
          </FaqAccordion>
          <FaqAccordion
            faqId="pf-match"
            question="Why don't my numbers match TCGplayer exactly?"
            isOpen={openFaqId === "pf-match"}
            onToggle={toggleFaq}
          >
            <FaqAnswer lead="TCGplayer uses its own rollups.">
              We add your shipping model and order-level views. Gaps usually mean assumptions or missing refund rows, not a
              bug.
            </FaqAnswer>
          </FaqAccordion>
          <FaqAccordion
            faqId="pf-small"
            question="Why do small orders hurt more?"
            isOpen={openFaqId === "pf-small"}
            onToggle={toggleFaq}
          >
            <FaqAnswer lead="Flat per-order fees don’t shrink on small sales.">
              Same fee on $6 vs $60. That’s marketplace mechanics, not something you fix card-by-card here.
            </FaqAnswer>
          </FaqAccordion>
          <FaqAccordion
            faqId="pf-lowvalue"
            question="Should I stop selling low-value cards?"
            isOpen={openFaqId === "pf-lowvalue"}
            onToggle={toggleFaq}
          >
            <FaqAnswer lead="We don’t tell you what to stock.">
              Use CardOps to see how fees and mix affect outcomes, then you decide.
            </FaqAnswer>
          </FaqAccordion>
          <FaqAccordion
            faqId="pf-improve"
            question="What is CardOps helping me improve?"
            isOpen={openFaqId === "pf-improve"}
            onToggle={toggleFaq}
          >
            <FaqAnswer lead="Clarity on order mix, fee load, and estimated net.">
              A lens on results, not a listing optimizer.
            </FaqAnswer>
          </FaqAccordion>
          <FaqAccordion
            faqId="pf-buyer-ship"
            question="What does buyer-paid shipping mean here?"
            isOpen={openFaqId === "pf-buyer-ship"}
            onToggle={toggleFaq}
          >
            <FaqAnswer lead="What buyers paid for shipping on the export.">
              Not the same as your envelope/stamp assumptions in Settings.
            </FaqAnswer>
          </FaqAccordion>
        </Section>

        <Section id="using-app" title="Using the app" isHighlighted={highlightedSectionId === "using-app"}>
          <FaqAccordion
            faqId="ua-dash"
            question="What will I see on the Dashboard and Trends?"
            isOpen={openFaqId === "ua-dash"}
            onToggle={toggleFaq}
          >
            <FaqAnswer lead="Dashboard: estimated net, insights, and patterns from uploads.">
              <p>
                Trends: daily rhythm from Order List and checkout clusters, not card-level profit. Open{" "}
                <Link
                  href="/trends"
                  className="font-semibold text-teal-700 underline-offset-2 hover:underline dark:text-teal-400"
                >
                  Trends
                </Link>
                .
              </p>
            </FaqAnswer>
          </FaqAccordion>
          <FaqAccordion
            faqId="ua-games"
            question="Can I use this for multiple games?"
            isOpen={openFaqId === "ua-games"}
            onToggle={toggleFaq}
          >
            <FaqAnswer lead="Yes. Pick an upload label that matches your TCGplayer filter (or Mixed).">
              Order List rows don’t include game per row. You set the game at upload.
            </FaqAnswer>
          </FaqAccordion>
          <FaqAccordion
            faqId="ua-inventory"
            question="Does this track inventory?"
            isOpen={openFaqId === "ua-inventory"}
            onToggle={toggleFaq}
          >
            <FaqAnswer lead="No.">Orders from exports only, not on-hand stock or sourcing.</FaqAnswer>
          </FaqAccordion>
          <FaqAccordion
            faqId="ua-more"
            question="Can I add new exports later?"
            isOpen={openFaqId === "ua-more"}
            onToggle={toggleFaq}
          >
            <FaqAnswer lead="Yes. Import anytime; totals combine.">
              Same label + overlapping dates → warning so you don’t double-count.
            </FaqAnswer>
          </FaqAccordion>
        </Section>

        <Section id="privacy" title="Privacy" isHighlighted={highlightedSectionId === "privacy"}>
          <FaqAccordion
            faqId="pr-private"
            question="Is my data private?"
            isOpen={openFaqId === "pr-private"}
            onToggle={toggleFaq}
          >
            <FaqAnswer lead="Processing runs in this browser.">
              CSVs and preferences stay on your device until you clear them. No cloud crunch in this build.
            </FaqAnswer>
          </FaqAccordion>
        </Section>

        <section className="scroll-mt-24 border-t border-slate-200/80 pt-8 dark:border-slate-700/80 sm:pt-10">
          <h2 className="text-xl font-bold tracking-tight text-slate-950 dark:text-slate-50">Still stuck?</h2>
          <div className="mt-4 flex flex-wrap items-center gap-2 text-sm leading-relaxed">
            <p className="font-semibold text-slate-900 dark:text-slate-100">{SUPPORT_EMAIL}</p>
            <button
              type="button"
              onClick={copySupportEmail}
              className="inline-flex h-9 shrink-0 items-center justify-center rounded-lg border border-slate-200/90 bg-white px-3 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-slate-600/80 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              {emailCopied ? "Copied!" : "Copy email"}
            </button>
          </div>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">We usually respond within 24 hours.</p>
        </section>
      </div>
    </PageShell>
  );
}
