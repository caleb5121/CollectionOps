import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";

import HelpGuideScreenshot from "@/components/help/HelpGuideScreenshot";
import Card from "@/components/Card";
import PageShell from "@/components/PageShell";

export const metadata: Metadata = {
  title: "How to Get Your CSVs from TCGplayer | CollectionOps",
  description:
    "Step-by-step: export your Order List and Sales Summary from TCGplayer for the same dates, then upload both to CollectionOps.",
};

const DISCORD_HREF = "https://discord.gg/ZJrehxKRH";

function TipBox({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="my-5 rounded-r-lg border-l-4 border-amber-500 bg-amber-50/95 px-5 py-4 text-[15px] leading-relaxed text-zinc-800 dark:border-amber-600 dark:bg-amber-950/30 dark:text-amber-50">
      <span className="font-bold text-amber-900 dark:text-amber-200">{label}</span>{" "}
      <span className="text-zinc-800 dark:text-zinc-200">{children}</span>
    </div>
  );
}

function TroubleItem({ q, a }: { q: string; a: string }) {
  return (
    <div className="mb-3 rounded-r-lg border-l-4 border-rose-600 bg-rose-50/95 px-5 py-4 last:mb-0 dark:border-rose-700 dark:bg-rose-950/35">
      <p className="font-semibold text-rose-900 dark:text-rose-100">{q}</p>
      <p className="mt-1.5 text-[15px] leading-relaxed text-zinc-800 dark:text-zinc-200">{a}</p>
    </div>
  );
}

function StepList({ items }: { items: ReactNode[] }) {
  return (
    <ol className="mt-3 list-none space-y-2.5">
      {items.map((child, idx) => (
        <li key={idx} className="relative pl-10 text-[15px] leading-relaxed text-zinc-800 dark:text-zinc-200">
          <span
            className="absolute left-0 top-0 flex size-[26px] items-center justify-center rounded-full bg-[color:color-mix(in_oklab,var(--accent-soft)_100%,transparent)] text-xs font-bold text-[color:var(--accent)] ring-1 ring-[color:color-mix(in_oklab,var(--accent)_22%,transparent)] dark:bg-emerald-950/50 dark:text-emerald-200"
            aria-hidden
          >
            {idx + 1}
          </span>
          {child}
        </li>
      ))}
    </ol>
  );
}

export default function GettingYourCsvsPage() {
  return (
    <PageShell
      maxWidth="wide"
      description="A step-by-step visual guide — about five minutes, no technical skills required."
      descriptionClassName="text-sm leading-relaxed text-stone-600 dark:text-stone-400"
    >
      <div className="mb-6 flex flex-wrap gap-2 text-sm">
        <Link href="/help" className="font-semibold text-[color:var(--accent)] underline-offset-2 hover:underline">
          ← Help home
        </Link>
        <span className="text-stone-400" aria-hidden>
          ·
        </span>
        <Link href="/help/faq" className="font-semibold text-[color:var(--accent)] underline-offset-2 hover:underline">
          FAQ
        </Link>
        <span className="text-stone-400" aria-hidden>
          ·
        </span>
        <Link href="/data" className="font-semibold text-[color:var(--accent)] underline-offset-2 hover:underline">
          Imports
        </Link>
      </div>

      <div className="rounded-2xl bg-gradient-to-br from-emerald-900 via-emerald-800 to-emerald-700 px-6 py-10 text-center text-white shadow-lg sm:px-10 sm:py-12">
        <p className="text-3xl font-bold tracking-tight sm:text-4xl">How to Get Your CSVs from TCGplayer</p>
        <p className="mt-3 text-lg text-white/95">A step-by-step visual guide</p>
        <p className="mt-5 text-sm text-white/85">
          Takes about 5 minutes · No technical skills needed
        </p>
      </div>

      <Card className="mt-6 p-6 sm:p-8">
        <h2 className="text-base font-bold text-[color:var(--foreground)]">What&apos;s in this guide</h2>
        <ul className="mt-3 space-y-2 text-sm font-medium text-[color:var(--accent)]">
          <li>
            <a href="#part1" className="underline-offset-2 hover:underline">
              1 · Export Your Order List
            </a>
          </li>
          <li>
            <a href="#part2" className="underline-offset-2 hover:underline">
              2 · Export Your Sales Summary
            </a>
          </li>
          <li>
            <a href="#part3" className="underline-offset-2 hover:underline">
              3 · Upload to CollectionOps
            </a>
          </li>
          <li>
            <a href="#troubleshooting" className="underline-offset-2 hover:underline">
              ? · Troubleshooting
            </a>
          </li>
          <li>
            <a href="/help/faq" className="underline-offset-2 hover:underline">
              ? · Full FAQ list
            </a>
          </li>
        </ul>
      </Card>

      <Card className="mt-6 p-6 sm:p-8">
        <h2 className="text-xl font-bold text-[color:var(--accent)] sm:text-[22px]">What You&apos;ll Need</h2>
        <p className="mt-3 text-base leading-relaxed text-zinc-700 dark:text-zinc-300">
          To use CollectionOps, you&apos;ll export two files from TCGplayer and upload them to your CollectionOps dashboard.
          That&apos;s it.
        </p>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <div className="rounded-lg border-l-4 border-[color:var(--accent)] bg-[color:color-mix(in_oklab,var(--accent-soft)_55%,white)] px-4 py-4 dark:bg-[color:color-mix(in_oklab,var(--accent-soft)_14%,var(--surface-muted))]">
            <strong className="block text-[color:var(--accent)]">Order List</strong>
            <small className="mt-1 block text-sm text-zinc-600 dark:text-zinc-400">Your line-by-line order history (what you sold)</small>
          </div>
          <div className="rounded-lg border-l-4 border-[color:var(--accent)] bg-[color:color-mix(in_oklab,var(--accent-soft)_55%,white)] px-4 py-4 dark:bg-[color:color-mix(in_oklab,var(--accent-soft)_14%,var(--surface-muted))]">
            <strong className="block text-[color:var(--accent)]">Sales Summary</strong>
            <small className="mt-1 block text-sm text-zinc-600 dark:text-zinc-400">Your totals report (fees, refunds, net sales)</small>
          </div>
        </div>
        <TipBox label="Important:">
          Both files must cover the <strong>same date range</strong>. If your Order List is April 1–7, your Sales Summary must also
          be April 1–7.
        </TipBox>
      </Card>

      <Card id="part1" className="scroll-mt-24 mt-6 p-6 sm:p-8">
        <div className="flex flex-col gap-4 border-b border-stone-200/90 pb-6 dark:border-stone-700/70 sm:flex-row sm:items-center">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-[color:var(--accent)] text-xl font-bold text-white">
            1
          </div>
          <div>
            <h2 className="text-2xl font-bold text-[color:var(--accent)] sm:text-[26px]">Export Your Order List</h2>
            <p className="mt-1 text-[15px] text-zinc-600 dark:text-zinc-400">Your detailed order history from TCGplayer</p>
          </div>
        </div>

        <div className="mt-8">
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Step 1: Open the Orders tab</h3>
          <StepList
            items={[
              <>
                Log in to <strong>TCGplayer Seller Portal</strong> (store.tcgplayer.com)
              </>,
              <>
                Click the <strong>Orders</strong> tab in the top navigation
              </>,
              <>
                Click the <strong>Filters</strong> button (shown circled in red below)
              </>,
            ]}
          />
          <HelpGuideScreenshot
            src="/images/help/screenshot_1_orders_page.png"
            alt="TCGplayer Orders with Filters highlighted"
            caption="Click the Filters button to open date and channel options"
            priority
          />
        </div>

        <div className="mt-10">
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Step 2: Set Your Date Range</h3>
          <StepList
            items={[
              <>
                In the Filter panel, choose <strong>Custom</strong> from the Order Date dropdown
              </>,
              <>
                Set your <strong>From</strong> and <strong>To</strong> dates (example: April 1 to April 7)
              </>,
              <>Make sure your channels are checked (TCGplayer Marketplace, etc.)</>,
              <>
                Click <strong>See Results</strong> (the blue button at the bottom)
              </>,
            ]}
          />
          <HelpGuideScreenshot
            src="/images/help/screenshot_2_filter_panel.png"
            alt="TCGplayer filter panel with date range"
            caption="Set your date range, then click See Results"
          />
          <TipBox label="Remember:">Write down your date range — you&apos;ll need to use the same dates for the Sales Summary file.</TipBox>
        </div>

        <div className="mt-10">
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Step 3: Export the Orders</h3>
          <StepList
            items={[
              <>
                Once results load, click the <strong>Export Orders</strong> button in the top right
              </>,
              <>
                A CSV file downloads automatically (named <code className="rounded bg-zinc-100 px-1 dark:bg-zinc-800">TCGplayer_OrderList_YYYYMMDD.csv</code>)
              </>,
              <>Save this file — you&apos;ll upload it to CollectionOps later</>,
            ]}
          />
        </div>
      </Card>

      <Card id="part2" className="scroll-mt-24 mt-6 p-6 sm:p-8">
        <div className="flex flex-col gap-4 border-b border-stone-200/90 pb-6 dark:border-stone-700/70 sm:flex-row sm:items-center">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-[color:var(--accent)] text-xl font-bold text-white">
            2
          </div>
          <div>
            <h2 className="text-2xl font-bold text-[color:var(--accent)] sm:text-[26px]">Export Your Sales Summary</h2>
            <p className="mt-1 text-[15px] text-zinc-600 dark:text-zinc-400">Your totals report showing fees, refunds, and net sales</p>
          </div>
        </div>

        <div className="mt-8">
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Step 1: Open the Reports tab</h3>
          <StepList
            items={[
              <>
                From any page in the Seller Portal, click the <strong>Reports</strong> tab
              </>,
              <>
                Click the <strong>Sales Summary Report</strong> link (shown circled in green below)
              </>,
            ]}
          />
          <HelpGuideScreenshot
            src="/images/help/screenshot_3_reports_page.png"
            alt="TCGplayer Reports with Sales Summary Report highlighted"
            caption="Click Sales Summary Report — NOT Audit Reports or the others"
          />
        </div>

        <div className="mt-10">
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Step 2: Configure and Download</h3>
          <StepList
            items={[
              <>
                Set the <strong>same date range</strong> you used for your Order List
              </>,
              <>
                Select <strong>All Sales</strong> (not Sales in My State)
              </>,
              <>
                Keep <strong>all 4 checkboxes checked</strong> (shown circled in green)
              </>,
              <>
                Click <strong>Download Report</strong> (shown circled in red)
              </>,
            ]}
          />
          <HelpGuideScreenshot
            src="/images/help/screenshot_4_sales_summary.png"
            alt="Sales Summary report download options"
            caption="Keep all 4 boxes checked, then click Download Report"
          />
          <TipBox label="Why all 4 boxes?">
            Each box represents a sales channel. Keeping them all checked makes sure CollectionOps sees every order, regardless of
            how it was sold.
          </TipBox>
        </div>
      </Card>

      <Card id="part3" className="scroll-mt-24 mt-6 p-6 sm:p-8">
        <div className="flex flex-col gap-4 border-b border-stone-200/90 pb-6 dark:border-stone-700/70 sm:flex-row sm:items-center">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-[color:var(--accent)] text-xl font-bold text-white">
            3
          </div>
          <div>
            <h2 className="text-2xl font-bold text-[color:var(--accent)] sm:text-[26px]">Upload to CollectionOps</h2>
            <p className="mt-1 text-[15px] text-zinc-600 dark:text-zinc-400">Both files in, dashboard out</p>
          </div>
        </div>

        <div className="mt-8">
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Step 1: Open the Imports Page</h3>
          <StepList
            items={[
              <>
                Go to <Link className="font-semibold text-[color:var(--accent)] underline-offset-2 hover:underline" href="/">collectionops.com</Link> and log in
              </>,
              <>
                Click <strong>Imports</strong> in the left sidebar
              </>,
              <>
                Choose a <strong>label</strong> for this batch (example: &quot;June 2026&quot; or &quot;Pokémon&quot;)
              </>,
            ]}
          />
        </div>

        <div className="mt-10">
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Step 2: Upload Both Files</h3>
          <StepList
            items={[
              <>
                On the <strong>LEFT</strong> side (Order list): click <strong>Add CSV</strong> and select your Order List file
              </>,
              <>
                On the <strong>RIGHT</strong> side (Sales summary): click <strong>Add CSV</strong> and select your Sales Summary file
              </>,
            ]}
          />
          <HelpGuideScreenshot
            src="/images/help/screenshot_5_collectionops_import.png"
            alt="CollectionOps Imports with Order list and Sales summary slots"
            caption="Order list goes on the left, Sales summary on the right"
          />
        </div>

        <div className="mt-10">
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Step 3: View Your Dashboard</h3>
          <StepList
            items={[
              <>Scroll down — you&apos;ll see a green confirmation that you&apos;re ready to go</>,
              <>
                Click <strong>View Dashboard</strong>
              </>,
              <>Done! Your operational snapshot is ready.</>,
            ]}
          />
        </div>
      </Card>

      <Card id="troubleshooting" className="scroll-mt-24 mt-6 p-6 sm:p-8">
        <div className="flex flex-col gap-4 border-b border-stone-200/90 pb-6 dark:border-stone-700/70 sm:flex-row sm:items-center">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-rose-600 text-xl font-bold text-white">
            ?
          </div>
          <div>
            <h2 className="text-2xl font-bold text-rose-900 dark:text-rose-100 sm:text-[26px]">Troubleshooting</h2>
            <p className="mt-1 text-[15px] text-zinc-600 dark:text-zinc-400">Common issues and quick fixes</p>
          </div>
        </div>
        <div className="mt-6 space-y-0">
          <TroubleItem
            q={"My files won't import together"}
            a="This usually means your Order List and Sales Summary cover different date ranges. Re-export both files using the exact same start and end dates."
          />
          <TroubleItem
            q={"I can't find the Export Orders button"}
            a={"The Export Orders button only appears AFTER you click See Results. Make sure you've: (1) opened the Orders page, (2) clicked Filters, (3) set your date range, (4) clicked See Results."}
          />
          <TroubleItem
            q={"My Sales Summary shows $0 for everything"}
            a="Make sure TCGplayer Marketplace Orders is checked. If you sell across multiple channels, keep all 4 boxes checked to include them all."
          />
          <TroubleItem
            q={"I can't find the Sales Summary Report link"}
            a={"It's on the Reports page (NOT Orders). The link is third in the list, below Audit Reports and Price Differential Report."}
          />
          <TroubleItem
            q="Can I try it first without my real data?"
            a='Yes! Click "Try Demo" on CollectionOps to see how everything works with sample data.'
          />
        </div>
      </Card>

      <div className="mt-8 rounded-xl border border-stone-200/80 bg-white/90 px-5 py-6 text-center text-sm text-zinc-600 shadow-sm dark:border-stone-700/70 dark:bg-zinc-900/50 dark:text-zinc-400">
        <p>
          More answers in the{" "}
          <Link href="/help/faq" className="font-semibold text-[color:var(--accent)] underline-offset-2 hover:underline">
            FAQ
          </Link>
          . Need more help? Visit{" "}
          <Link href="/" className="font-semibold text-[color:var(--accent)] underline-offset-2 hover:underline">
            collectionops.com
          </Link>{" "}
          or{" "}
          <a href={DISCORD_HREF} className="font-semibold text-[color:var(--accent)] underline-offset-2 hover:underline" target="_blank" rel="noopener noreferrer">
            join our Discord
          </a>
          .
        </p>
        <div className="mt-5 flex flex-wrap justify-center gap-3">
          <Link
            href="/data"
            className="inline-flex items-center justify-center rounded-lg bg-[color:var(--accent)] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[color:var(--accent-hover)] dark:text-stone-950"
          >
            Open Imports
          </Link>
          <Link
            href="/help/faq"
            className="inline-flex items-center justify-center rounded-lg border border-stone-200/90 bg-white px-5 py-2.5 text-sm font-semibold text-zinc-800 shadow-sm transition hover:bg-stone-50 dark:border-stone-600 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
          >
            Open FAQ
          </Link>
        </div>
      </div>
    </PageShell>
  );
}
