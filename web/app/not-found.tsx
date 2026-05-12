import Link from "next/link";

import { CollectionOpsIllustration } from "../components/illustrations/CollectionOpsIllustration";

export default function NotFound() {
  return (
    <div className="flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center px-6 py-16 text-center">
      <CollectionOpsIllustration
        src="/illustrations/not-found.svg"
        alt="Illustration of a person discovering a missing page"
        width={860}
        height={571}
        size="empty"
        className="max-w-[min(100%,15rem)] sm:max-w-[min(100%,18.75rem)]"
      />
      <h1 className="mt-6 text-2xl font-bold tracking-tight text-[color:var(--foreground)] sm:text-3xl">Page not found</h1>
      <p className="mt-3 max-w-md text-sm leading-relaxed text-stone-600 dark:text-stone-400">
        This page doesn&apos;t exist. Let&apos;s get you back home.
      </p>
      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
        <Link
          href="/dashboard"
          className="inline-flex items-center justify-center rounded-lg bg-[color:var(--accent)] px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:opacity-95"
        >
          Go to Dashboard
        </Link>
        <Link
          href="/"
          className="inline-flex items-center justify-center rounded-lg border border-stone-200/90 bg-white px-6 py-3 text-sm font-semibold text-stone-800 shadow-sm transition hover:bg-stone-50 dark:border-stone-600 dark:bg-stone-900 dark:text-stone-100 dark:hover:bg-stone-800"
        >
          Back to home
        </Link>
      </div>
    </div>
  );
}
