"use client";

import { useMemo, useRef, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { DEFAULT_APP_USER, loadUserProfileFromStorage, useAuth } from "../AuthProvider";
import { formatToolbarDate, getPageTitle } from "../../lib/pageTitles";
import ThemeToggle from "./ThemeToggle";

export default function MainToolbar() {
  const pathname = usePathname();
  const { user, setUser } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const title = useMemo(() => getPageTitle(pathname), [pathname]);
  const settingsPage = pathname === "/settings";
  const dateLabel = useMemo(() => formatToolbarDate(), []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <header className="sticky top-0 z-30 flex h-[60px] shrink-0 items-center justify-between gap-4 border-b border-slate-200/80 bg-gradient-to-b from-white to-slate-50/90 px-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.98),0_2px_8px_-2px_rgba(15,23,42,0.06),0_12px_40px_-12px_rgba(15,23,42,0.14)] dark:border-slate-800/90 dark:from-slate-950 dark:to-slate-900/95 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.07),0_4px_16px_-4px_rgba(0,0,0,0.45),0_18px_48px_-16px_rgba(0,0,0,0.4)] sm:px-8 lg:px-10">
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-4 gap-y-1">
        <h1
          className={
            settingsPage
              ? "text-[1.65rem] font-bold tracking-tight text-[color:var(--accent)] sm:text-[1.85rem]"
              : "text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 sm:text-[1.65rem]"
          }
        >
          {title}
        </h1>
        <button
          type="button"
          className="inline-flex items-center gap-1 rounded-lg border border-transparent px-1 py-0.5 text-sm text-slate-500 transition-app hover:border-slate-200 hover:bg-slate-50 hover:text-slate-700 active:scale-[0.98] dark:hover:border-slate-700 dark:hover:bg-slate-800/80 dark:hover:text-slate-200"
          aria-label="Select date"
        >
          {dateLabel}
          <svg className="h-4 w-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>

      <div className="flex shrink-0 items-center gap-3 sm:gap-4">
        <ThemeToggle />
        {user ? (
          <div className="relative" ref={dropdownRef}>
            <button
              type="button"
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="inline-flex min-w-0 max-w-[min(280px,calc(100vw-9rem))] items-center gap-2.5 rounded-xl border border-slate-200/90 bg-white py-1.5 pl-1.5 pr-2 shadow-[0_1px_0_rgba(255,255,255,0.95)_inset,0_2px_8px_-2px_rgba(15,23,42,0.08),0_8px_24px_-8px_rgba(15,23,42,0.1)] ring-1 ring-slate-900/[0.04] transition-app hover:border-slate-300 hover:shadow-[0_1px_0_rgba(255,255,255,0.98)_inset,0_4px_14px_-4px_rgba(15,23,42,0.12)] active:scale-[0.99] dark:border-slate-700/90 dark:bg-slate-900/80 dark:shadow-[0_4px_20px_-4px_rgba(0,0,0,0.45)]"
              title={user.email?.trim() ? user.email : undefined}
            >
              <span className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full bg-slate-200 ring-2 ring-white dark:ring-slate-800">
                {user.avatarDataUrl ? (
                  /* eslint-disable-next-line @next/next/no-img-element -- data URL from user upload */
                  <img src={user.avatarDataUrl} alt="" className="h-full w-full object-cover" width={40} height={40} />
                ) : (
                  <Image
                    src="/logo.svg"
                    alt=""
                    width={40}
                    height={40}
                    className="h-full w-full object-contain p-1.5 dark:opacity-90"
                    unoptimized
                  />
                )}
              </span>
              <span className="hidden min-w-0 flex-1 flex-col items-stretch overflow-hidden text-left sm:flex">
                <span className="truncate whitespace-nowrap text-sm font-semibold leading-tight text-slate-900 dark:text-slate-50">
                  {user.storeName}
                </span>
                <span
                  className="truncate overflow-hidden text-ellipsis whitespace-nowrap text-xs text-slate-500 dark:text-slate-400"
                  title={user.email?.trim() ? user.email : undefined}
                >
                  {user.email || "-"}
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
                  href="/account"
                  className="block px-4 py-2.5 text-sm text-slate-700 transition-app hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800/90"
                  onClick={() => setDropdownOpen(false)}
                >
                  Account
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    setUser(null);
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
          <button
            type="button"
            onClick={() => setUser(loadUserProfileFromStorage() ?? DEFAULT_APP_USER)}
            className="rounded-xl border border-slate-200/90 bg-white px-4 py-2 text-sm font-medium text-slate-800 shadow-[0_1px_0_rgba(255,255,255,0.95)_inset,0_2px_8px_-2px_rgba(15,23,42,0.08),0_6px_20px_-6px_rgba(15,23,42,0.1)] ring-1 ring-slate-900/5 transition-app hover:border-slate-300 hover:bg-slate-50 active:scale-[0.98] dark:border-slate-700/90 dark:bg-slate-900/85 dark:text-slate-100"
          >
            Sign In
          </button>
        )}
      </div>
    </header>
  );
}
