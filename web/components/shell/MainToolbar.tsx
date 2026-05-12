"use client";

import { useMemo, useRef, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { accountDisplayName, useAuth } from "../AuthProvider";
import { useData } from "../DataProvider";
import { formatToolbarDate, getPageTitle } from "../../lib/pageTitles";
import { IconDiscord, IconHelp, IconSettings } from "./NavIcons";
import ThemeToggle from "./ThemeToggle";

const toolbarIconLinkClass =
  "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-button)] border border-[color:color-mix(in_oklab,var(--border-warm)_90%,transparent)] bg-[var(--surface-raised)] text-[color:var(--foreground-muted)] shadow-[var(--shadow-card)] transition-app hover:border-[color:color-mix(in_oklab,var(--accent)_22%,var(--border-warm))] hover:bg-[var(--surface-muted)] hover:text-[color:var(--foreground)] active:scale-[0.98] dark:border-slate-700/90 dark:bg-slate-900/75 dark:text-slate-300 dark:hover:border-slate-600 dark:hover:bg-slate-800/90 dark:hover:text-slate-100 sm:h-10 sm:w-10";

function menuRowClass() {
  return "flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm text-slate-700 transition-app hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800/90";
}

/** Transparent PNG in web/public - replace the file to update artwork. */
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
    <header className="sticky top-0 z-50 flex w-full min-h-0 shrink-0 items-center justify-between gap-2 border-b border-[color:color-mix(in_oklab,var(--border-warm)_78%,transparent)] bg-[color:color-mix(in_oklab,var(--surface-raised)_96%,var(--background))] px-3 py-2 shadow-[0_1px_0_rgba(255,255,255,0.65)_inset,var(--shadow-card)] backdrop-blur-xl dark:border-[color-mix(in_oklab,var(--border-warm)_60%,transparent)] dark:bg-[color-mix(in_oklab,var(--surface-raised)_90%,transparent)] dark:shadow-[0_1px_0_rgba(255,255,255,0.05)_inset,0_10px_36px_-18px_rgba(0,0,0,0.48)] sm:gap-3 sm:px-6 sm:py-2.5 lg:px-10">
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
          <h1 className="font-display min-w-0 truncate text-xl font-semibold leading-tight tracking-[-0.02em] text-[color:var(--foreground)] sm:text-[1.65rem]">
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
            className="inline-flex items-center justify-center rounded-[var(--radius-button)] bg-[color:var(--accent)] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_2px_6px_rgba(26,155,127,0.28),0_8px_20px_-6px_var(--accent-glow)] transition-[transform,background-color,box-shadow] duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] hover:bg-[color:var(--accent-hover)] hover:shadow-[0_4px_12px_rgba(26,155,127,0.22),0_12px_28px_-8px_var(--accent-glow)] active:scale-[0.98] dark:text-stone-950 dark:shadow-[0_2px_8px_rgba(0,0,0,0.35)] dark:hover:shadow-[0_4px_14px_rgba(0,0,0,0.4)]"
          >
            {dashboardCta.label}
          </Link>
        ) : null}
        <a
          href="https://discord.gg/ZJrehxKRH"
          target="_blank"
          rel="noopener noreferrer"
          className={toolbarIconLinkClass}
          aria-label="Join our Discord community"
          title="Discord"
        >
          <IconDiscord className="h-[1.125rem] w-[1.125rem] shrink-0" />
        </a>
        <Link
          href="/help/getting-your-csvs"
          className={toolbarIconLinkClass}
          aria-label="Help: how to get your TCGplayer CSVs"
          title="Help — getting your CSVs"
        >
          <IconHelp className="h-[1.125rem] w-[1.125rem] shrink-0" strokeWidth={2} aria-hidden />
        </Link>
        {!user ? (
          <Link
            href="/settings/shipping"
            className={toolbarIconLinkClass}
            aria-label="Shipping Settings"
            title="Shipping Settings"
          >
            <IconSettings className="h-[1.125rem] w-[1.125rem] shrink-0" strokeWidth={2} aria-hidden />
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
                  {user.email.trim() || "-"}
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
              <div className="absolute right-0 top-full z-50 mt-2 min-w-[13.5rem] overflow-hidden rounded-xl border border-slate-200/90 bg-white py-1.5 shadow-[0_1px_0_rgba(255,255,255,0.95)_inset,0_18px_48px_-8px_rgba(15,23,42,0.2),0_8px_24px_-6px_rgba(15,23,42,0.12)] ring-1 ring-slate-900/5 dark:border-slate-700/90 dark:bg-slate-900/95 dark:shadow-[0_24px_64px_-12px_rgba(0,0,0,0.65)]">
                <Link href="/settings/shipping" className={menuRowClass()} onClick={() => setDropdownOpen(false)}>
                  <IconSettings className="h-4 w-4 shrink-0 text-slate-500 dark:text-slate-400" strokeWidth={2} aria-hidden />
                  Shipping Settings
                </Link>
                <Link href="/help" className={menuRowClass()} onClick={() => setDropdownOpen(false)}>
                  <IconHelp className="h-4 w-4 shrink-0 text-slate-500 dark:text-slate-400" strokeWidth={2} aria-hidden />
                  Help Center
                </Link>
                <Link href="/account" className={menuRowClass()} onClick={() => setDropdownOpen(false)}>
                  <span className="w-4 shrink-0" aria-hidden />
                  Account
                </Link>
                <Link href="/account#logo-editor" className={menuRowClass()} onClick={() => setDropdownOpen(false)}>
                  <span className="w-4 shrink-0" aria-hidden />
                  Logo editor
                </Link>
                <div className="my-1 border-t border-slate-200/80 dark:border-slate-700/80" role="separator" />
                <button
                  type="button"
                  onClick={() => {
                    void setUser(null);
                    setDropdownOpen(false);
                  }}
                  className={`${menuRowClass()} text-slate-800 dark:text-slate-100`}
                >
                  Sign out
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
