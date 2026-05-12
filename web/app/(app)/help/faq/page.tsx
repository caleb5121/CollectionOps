"use client";

import Link from "next/link";
import { useCallback, useState } from "react";

import { FaqAccordion } from "@/components/help/HelpFaqBlocks";
import Card from "@/components/Card";
import PageShell from "@/components/PageShell";

const SUPPORT_EMAIL = "support@collectionops.com";

/** Q&As from `FAQ_CopyPaste_Ready.txt` (Desktop / how to CO). */
const FAQ_ENTRIES: { id: string; question: string; answer: string }[] = [
  {
    id: "order-list-csv",
    question: "Where do I find my Order List CSV?",
    answer:
      "Go to TCGplayer Seller Portal > Orders > Click Filters > Set your date range > Click See Results > Click Export Orders. The CSV downloads automatically.",
  },
  {
    id: "sales-summary-csv",
    question: "Where do I find my Sales Summary CSV?",
    answer:
      "Go to TCGplayer Seller Portal > Reports > Click Sales Summary Report > Keep all 4 boxes checked > Set the SAME date range as your Order List > Click Download Report.",
  },
  {
    id: "why-two-files",
    question: "Why do I need two files?",
    answer:
      "The Order List shows line-by-line details of each order (product amount, shipping). The Sales Summary shows totals, fees, and refunds. Together, they give CollectionOps everything needed to calculate your actual profit after all costs.",
  },
  {
    id: "files-wont-match",
    question: "My files won't match or import together. What's wrong?",
    answer:
      "Both CSVs must cover the exact same date range. If your Order List is April 1-7 but your Sales Summary is April 1-8, they won't match. Re-export both files using identical start and end dates.",
  },
  {
    id: "date-range",
    question: "What date range should I use?",
    answer:
      "That's up to you. Some sellers export weekly, some monthly. Just pick a date range and use the same range for BOTH files. If you want April 1-7, export both files for April 1-7.",
  },
  {
    id: "multi-account",
    question: "Can I import data from multiple seller accounts?",
    answer:
      "Right now, CollectionOps is set up for one seller account. If you have multiple seller accounts, you'd need separate CollectionOps accounts for each one. Let us know if multi-account support is important to you.",
  },
  {
    id: "how-often-import",
    question: "How often should I import new data?",
    answer:
      "That's entirely your choice. Many sellers import weekly or monthly. You can create separate batches for each time period, or replace old data. Whenever you need a fresh operational snapshot, just export and import.",
  },
  {
    id: "sales-summary-zero",
    question: "What if my Sales Summary shows $0 for everything?",
    answer:
      'Check that "TCGplayer Marketplace Orders" is checked. If you sell in-store or on specific channels, make sure those checkboxes are also checked. Or keep all 4 boxes checked to include all sales channels.',
  },
  {
    id: "export-orders-button",
    question: "I can't find the Export Orders button",
    answer:
      'The Export Orders button only appears after you click "See Results" on the Orders page. Make sure you\'ve: (1) opened Orders, (2) clicked Filters, (3) set your date range, (4) clicked See Results. The button should then appear in the top right.',
  },
  {
    id: "try-demo",
    question: "Can I try it with sample data first?",
    answer:
      'Yes! Click "Try Demo" on our site to see how CollectionOps works with fake June 2026 data. No need to upload your real files — play around first and get comfortable.',
  },
  {
    id: "order-list-columns",
    question: "What columns are in the Order List CSV?",
    answer:
      "Order Date (when sold), Product Amt (card price), Shipping Amt (shipping fee), and Total Amt (product + shipping before TCGplayer fees). That's all you need.",
  },
  {
    id: "sales-summary-columns",
    question: "What columns are in the Sales Summary CSV?",
    answer:
      "OrderCount (number of orders), GrossSales (total before fees), TotalFees (what TCGplayer took), RefundAmount (money you refunded), and Net (what you kept after fees).",
  },
];

export default function HelpFaqPage() {
  const [openFaqId, setOpenFaqId] = useState<string | null>(null);
  const [emailCopied, setEmailCopied] = useState(false);

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
    <PageShell
      maxWidth="wide"
      description="Answers straight from our FAQ doc—same wording you approved for the site."
      descriptionClassName="text-sm leading-relaxed text-stone-600 dark:text-stone-400"
    >
      <div className="mb-6 flex flex-wrap gap-2 text-sm">
        <Link href="/help" className="font-semibold text-[color:var(--accent)] underline-offset-2 hover:underline">
          ← Help home
        </Link>
        <span className="text-stone-400" aria-hidden>
          ·
        </span>
        <Link
          href="/help/getting-your-csvs"
          className="font-semibold text-[color:var(--accent)] underline-offset-2 hover:underline"
        >
          How to get your CSVs
        </Link>
        <span className="text-stone-400" aria-hidden>
          ·
        </span>
        <Link href="/data" className="font-semibold text-[color:var(--accent)] underline-offset-2 hover:underline">
          Imports
        </Link>
      </div>

      <Card className="space-y-3 p-6 sm:p-8">
        {FAQ_ENTRIES.map(({ id, question, answer }) => (
          <FaqAccordion key={id} faqId={id} question={question} isOpen={openFaqId === id} onToggle={toggleFaq}>
            <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-400">{answer}</p>
          </FaqAccordion>
        ))}
      </Card>

      <section className="scroll-mt-24 mt-8 border-t border-slate-200/80 pt-8 dark:border-slate-700/80 sm:pt-10">
        <h2 className="text-lg font-bold tracking-tight text-slate-950 dark:text-slate-50 sm:text-xl">Still stuck?</h2>
        <div className="mt-3 flex flex-wrap items-center gap-2 text-sm leading-relaxed">
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
    </PageShell>
  );
}
