"use client";

import { useMemo, useRef, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { accountDisplayName, useAuth } from "../AuthProvider";
import { useData } from "../DataProvider";
import { formatToolbarDate, getPageTitle } from "../../lib/pageTitles";
import ThemeToggle from "./ThemeToggle";

/** Transparent PNG in web/public — replace the file to update artwork. */
const HEADER_LOGO_SRC = "/logo.png";

export default function MainToolbar() {
  const pathname = usePathname();
  const isDashboardPage = pathname === "/dashboard";
  const [demoSandboxActive, setDemoSandboxActive] = useState(false);
  const { user, setUser } = useAuth();
  const { hasAnyImport, savedImportBatches, trendsValidBatchCount } = useData();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [isLocalDevHost, setIsLocalDevHost] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const title = useMemo(() => getPageTitle(pathname), [pathname]);
  const dateLabel = useMemo(() => formatToolbarDate(), []);
  const dashboardCta = useMemo(() => {
    if (!isDashboardPage || demoSandboxActive) return null;

    if (!user) {
      return { label: "Try Demo", href: "/data?demo=1" as const };
    }

    const hasMultipleHistory = savedImportBatches.length > 1 || trendsValidBatchCount > 1;
    if (hasMultipleHistory) {
      return { label: "View Trends", href: "/trends" as const };
    }

    if (!hasAnyImport) {
      return { label: "Try Demo", href: "/data?demo=1" as const };
    }

    return { label: "Import Data", href: "/data" as const };
  }, [isDashboardPage, demoSandboxActive, user, savedImportBatches.length, trendsValidBatchCount, hasAnyImport]);

  useEffect(() => {
    try {
      setDemoSandboxActive(sessionStorage.getItem("cardops-demo-sandbox") === "1");
    } catch {
      setDemoSandboxActive(false);
    }
  }, [pathname]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      const t = e.target as Node;
      if (dropdownRef.current && !dropdownRef.current.contains(t)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (process.env.NODE_ENV !== "development") {
      setIsLocalDevHost(false);
      return;
    }
    if (typeof window === "undefined") {
      setIsLocalDevHost(false);
      return;
    }
    const host = window.location.hostname;
    setIsLocalDevHost(host === "localhost" || host === "127.0.0.1");
  }, []);

  return (
    <header className="sticky top-0 z-30 flex min-h-0 shrink-0 items-center justify-between gap-2 border-b border-sky-300/80 bg-gradient-to-r from-cyan-100 via-sky-50 to-indigo-100 px-3 py-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.98),0_3px_14px_-4px_rgba(14,116,144,0.24),0_20px_42px_-20px_rgba(99,102,241,0.35)] dark:border-slate-700/90 dark:from-cyan-950/45 dark:via-slate-900 dark:to-indigo-950/55 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_10px_24px_-10px_rgba(6,182,212,0.28),0_24px_44px_-22px_rgba(99,102,241,0.38)] sm:gap-3 sm:px-5 sm:py-2 lg:px-8">
      <span className="sr-only">{dateLabel}</span>
      <div className="flex min-h-0 min-w-0 flex-1 items-center">
        <div className="flex min-h-0 min-w-0 items-center gap-1 sm:gap-2">
        <Link
          href="/dashboard"
          className="inline-flex shrink-0 items-center self-center outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent)]/40 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-slate-950"
          aria-label="CollectionOps home"
        >
          <Image
            src={HEADER_LOGO_SRC}
            alt="CollectionOps"
            width={480}
            height={480}
            className="h-16 w-auto object-contain sm:h-[4.75rem] lg:h-[5.25rem]"
            sizes="(max-width: 640px) 128px, 148px"
            priority
            unoptimized
          />
        </Link>
        <div className="flex min-h-0 min-w-0 flex-1 flex-nowrap items-center gap-x-2 sm:gap-x-3">
          <h1 className="min-w-0 truncate text-2xl font-bold leading-tight tracking-tight text-slate-900 dark:text-slate-50 sm:text-3xl">
            {title}
          </h1>
        </div>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2 sm:gap-3">
        {isLocalDevHost ? (
          <span className="hidden rounded-lg border border-fuchsia-300/85 bg-fuchsia-50 px-2 py-1 text-[11px] font-bold tracking-wide text-fuchsia-800 dark:border-fuchsia-700/60 dark:bg-fuchsia-950/35 dark:text-fuchsia-200 sm:inline-flex">
            DEV MODE
          </span>
        ) : null}
        {demoSandboxActive ? (
          <>
            <span className="hidden rounded-lg border border-orange-300/80 bg-orange-50 px-2.5 py-1 text-xs font-semibold text-orange-800 dark:border-orange-800/60 dark:bg-orange-950/40 dark:text-orange-300 sm:inline-flex">
              Demo mode
            </span>
            <Link
              href="/data"
              className="inline-flex items-center justify-center rounded-lg border border-orange-300/90 bg-white px-3 py-1.5 text-xs font-semibold text-orange-800 transition hover:bg-orange-50 dark:border-orange-700/70 dark:bg-slate-900 dark:text-orange-300 dark:hover:bg-orange-950/30"
            >
              Exit demo
            </Link>
          </>
        ) : null}
        {dashboardCta ? (
          <Link
            href={dashboardCta.href}
            className="inline-flex items-center justify-center rounded-xl bg-orange-500 px-6 py-3 text-sm font-bold text-white shadow-lg transition-transform hover:scale-[1.02] hover:bg-orange-600 active:scale-[0.99]"
          >
            {dashboardCta.label}
          </Link>
        ) : null}
        <ThemeToggle />
        {user ? (
          <div className="relative" ref={dropdownRef}>
            <button
              type="button"
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="inline-flex min-h-9 min-w-0 max-w-[min(280px,calc(100vw-9rem))] items-center gap-2 rounded-lg border border-slate-200/90 bg-white py-1 pl-1 pr-1.5 shadow-[0_1px_0_rgba(255,255,255,0.95)_inset,0_1px_4px_-1px_rgba(15,23,42,0.08)] ring-1 ring-slate-900/[0.04] transition-app hover:border-slate-300 active:scale-[0.99] dark:border-slate-700/90 dark:bg-slate-900/80 dark:shadow-[0_2px_12px_-2px_rgba(0,0,0,0.4)] sm:min-h-10 sm:gap-2.5 sm:rounded-xl sm:py-1.5 sm:pl-1.5 sm:pr-2"
              title={user.email.trim() ? user.email : accountDisplayName(user)}
            >
              <span className="relative h-8 w-8 shrink-0 overflow-hidden rounded-full bg-slate-200 ring-2 ring-white dark:ring-slate-800 sm:h-9 sm:w-9">
                {user.avatarDataUrl ? (
                  /* eslint-disable-next-line @next/next/no-img-element -- data URL from user upload */
                  <img src={user.avatarDataUrl} alt="" className="h-full w-full object-cover" width={32} height={32} />
                ) : (
                  <Image
                    src="/logo.svg"
                    alt=""
                    width={36}
                    height={36}
                    className="h-full w-full object-contain p-1.5 dark:opacity-90"
                    unoptimized
                  />
                )}
              </span>
              <span className="hidden min-w-0 flex-1 flex-col items-stretch overflow-hidden text-left sm:flex">
                <span className="truncate whitespace-nowrap text-sm font-semibold leading-tight text-slate-900 dark:text-slate-50">
                  {accountDisplayName(user)}
                </span>
                <span
                  className="truncate overflow-hidden text-ellipsis whitespace-nowrap text-xs text-slate-500 dark:text-slate-400"
                  title={user.email.trim() ? user.email : undefined}
                >
                  {user.email.trim() || "—"}
                </span>
              </span>
              <svg
                className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${dropdownOpen ? "rotate-180" : ""}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {dropdownOpen && (
              <div className="absolute right-0 top-full z-50 mt-2 min-w-[200px] overflow-hidden rounded-xl border border-slate-200/90 bg-white py-1.5 shadow-[0_1px_0_rgba(255,255,255,0.95)_inset,0_18px_48px_-8px_rgba(15,23,42,0.2),0_8px_24px_-6px_rgba(15,23,42,0.12)] ring-1 ring-slate-900/5 dark:border-slate-700/90 dark:bg-slate-900/95 dark:shadow-[0_24px_64px_-12px_rgba(0,0,0,0.65)]">
                <Link
                  href="/dashboard"
                  className="block px-4 py-2.5 text-sm text-slate-700 transition-app hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800/90"
                  onClick={() => setDropdownOpen(false)}
                >
                  Dashboard
                </Link>
                <Link
                  href="/account"
                  className="block px-4 py-2.5 text-sm text-slate-700 transition-app hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800/90"
                  onClick={() => setDropdownOpen(false)}
                >
                  Account
                </Link>
                <Link
                  href="/account#logo-editor"
                  className="block px-4 py-2.5 text-sm text-slate-700 transition-app hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800/90"
                  onClick={() => setDropdownOpen(false)}
                >
                  Logo editor
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    void setUser(null);
                    setDropdownOpen(false);
                  }}
                  className="block w-full px-4 py-2.5 text-left text-sm text-slate-700 transition-app hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800/90"
                >
                  Sign Out
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              href="/login"
              className="whitespace-nowrap text-sm font-medium text-slate-600 underline decoration-slate-400/55 underline-offset-[5px] transition hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
            >
              Log in
            </Link>
            <Link
              href="/signup"
              className="whitespace-nowrap rounded-lg border border-teal-600/90 bg-white/95 px-3 py-1.5 text-sm font-semibold text-teal-900 shadow-[0_1px_0_rgba(255,255,255,0.9)_inset,0_1px_3px_-1px_rgba(15,118,110,0.2)] ring-1 ring-teal-900/[0.06] transition hover:bg-teal-50 active:scale-[0.99] dark:border-teal-500/75 dark:bg-teal-950/55 dark:text-teal-100 dark:ring-teal-400/10 dark:hover:bg-teal-950/85 sm:px-3.5 sm:py-2"
            >
              Create account
            </Link>
          </div>
        )}
      </div>
    </header>
  );
}
