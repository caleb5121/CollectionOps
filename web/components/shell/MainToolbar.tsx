"use client";

import { useMemo, useRef, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { accountDisplayName, useAuth } from "../AuthProvider";
import { formatToolbarDate, getPageTitle } from "../../lib/pageTitles";
import ThemeToggle from "./ThemeToggle";

/** Transparent PNG in web/public — replace the file to update artwork. */
const HEADER_LOGO_SRC = "/logo.png";

function isPlausibleEmail(s: string): boolean {
  const t = s.trim();
  return t.length > 3 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(t);
}

export default function MainToolbar() {
  const pathname = usePathname();
  const { user, setUser, signInWithEmail } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [signInOpen, setSignInOpen] = useState(false);
  const [signInEmail, setSignInEmail] = useState("");
  const [signInError, setSignInError] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const signInRef = useRef<HTMLDivElement>(null);

  const title = useMemo(() => getPageTitle(pathname), [pathname]);
  const dateLabel = useMemo(() => formatToolbarDate(), []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      const t = e.target as Node;
      if (dropdownRef.current && !dropdownRef.current.contains(t)) {
        setDropdownOpen(false);
      }
      if (signInRef.current && !signInRef.current.contains(t)) {
        setSignInOpen(false);
        setSignInError(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <header className="sticky top-0 z-30 flex min-h-0 shrink-0 items-center justify-between gap-2 border-b border-slate-200/80 bg-gradient-to-b from-white to-slate-50/90 px-3 pt-2 pb-3.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.98),0_1px_4px_-1px_rgba(15,23,42,0.06)] dark:border-slate-800/90 dark:from-slate-950 dark:to-slate-900/95 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.07),0_2px_8px_-2px_rgba(0,0,0,0.35)] sm:gap-3 sm:px-5 sm:pt-2.5 sm:pb-4 lg:px-8">
      <div className="flex min-h-0 min-w-0 flex-1 items-center gap-2.5 sm:gap-4">
        <Link
          href="/dashboard"
          className="inline-flex shrink-0 self-center outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent)]/40 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-slate-950"
          aria-label="CollectionOps home"
        >
          <Image
            src={HEADER_LOGO_SRC}
            alt="CollectionOps"
            width={480}
            height={480}
            className="block h-9 w-auto max-w-[min(7.5rem,34vw)] object-contain object-left sm:h-10 sm:max-w-[min(9rem,28vw)]"
            sizes="(max-width: 640px) 120px, 160px"
            priority
            unoptimized
          />
        </Link>
        <div className="flex min-h-0 min-w-0 flex-1 flex-nowrap items-center gap-x-3 sm:gap-x-4">
          <h1 className="min-w-0 truncate text-2xl font-bold leading-tight tracking-tight text-slate-900 dark:text-slate-50 sm:text-3xl">
            {title}
          </h1>
          <button
            type="button"
            className="inline-flex shrink-0 items-center gap-1 rounded-md border border-transparent px-1.5 py-1 text-sm font-normal text-slate-500 transition-app hover:border-slate-200/90 hover:bg-slate-50 hover:text-slate-600 active:scale-[0.98] dark:text-slate-400 dark:hover:border-slate-700 dark:hover:bg-slate-800/80 dark:hover:text-slate-300"
            aria-label="Select date"
          >
            {dateLabel}
            <svg className="h-3.5 w-3.5 shrink-0 text-slate-400 dark:text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2 sm:gap-3">
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
          <div className="relative" ref={signInRef}>
            <button
              type="button"
              onClick={() => {
                setSignInOpen((o) => !o);
                setSignInError(null);
              }}
              className="inline-flex min-h-9 items-center rounded-lg border border-slate-200/90 bg-white px-3 py-1.5 text-sm font-medium text-slate-800 shadow-[0_1px_0_rgba(255,255,255,0.95)_inset,0_1px_4px_-1px_rgba(15,23,42,0.08)] ring-1 ring-slate-900/5 transition-app hover:border-slate-300 hover:bg-slate-50 active:scale-[0.98] dark:border-slate-700/90 dark:bg-slate-900/85 dark:text-slate-100 sm:min-h-10 sm:rounded-xl sm:px-4 sm:py-2"
            >
              Sign In
            </button>
            {signInOpen ? (
              <form
                className="absolute right-0 top-full z-50 mt-2 w-[min(100vw-2rem,18rem)] rounded-xl border border-slate-200/90 bg-white p-3 shadow-[0_18px_48px_-8px_rgba(15,23,42,0.2)] ring-1 ring-slate-900/5 dark:border-slate-700/90 dark:bg-slate-900/95 dark:shadow-[0_24px_64px_-12px_rgba(0,0,0,0.65)]"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!isPlausibleEmail(signInEmail)) {
                    setSignInError("Enter a valid email address.");
                    return;
                  }
                  signInWithEmail(signInEmail);
                  setSignInOpen(false);
                  setSignInEmail("");
                  setSignInError(null);
                }}
              >
                <label htmlFor="toolbar-signin-email" className="block text-xs font-medium text-slate-600 dark:text-slate-400">
                  Email
                </label>
                <input
                  id="toolbar-signin-email"
                  type="email"
                  name="email"
                  autoComplete="email"
                  value={signInEmail}
                  onChange={(ev) => {
                    setSignInEmail(ev.target.value);
                    setSignInError(null);
                  }}
                  placeholder="you@example.com"
                  aria-invalid={signInError ? true : undefined}
                  className="mt-1 w-full rounded-lg border border-slate-200/90 bg-white px-2.5 py-2 text-sm text-slate-900 outline-none ring-slate-400/30 placeholder:text-slate-400 focus:border-teal-500 focus:ring-2 dark:border-slate-600 dark:bg-slate-950/80 dark:text-slate-100 dark:placeholder:text-slate-500"
                />
                {signInError ? (
                  <p className="mt-1.5 text-xs font-medium text-red-600 dark:text-red-400" role="alert">
                    {signInError}
                  </p>
                ) : null}
                <button
                  type="submit"
                  className="mt-3 w-full rounded-lg border border-teal-600 bg-teal-600 py-2 text-sm font-semibold text-white shadow-sm hover:bg-teal-700 dark:border-teal-500 dark:bg-teal-600 dark:hover:bg-teal-500"
                >
                  Continue
                </button>
              </form>
            ) : null}
          </div>
        )}
      </div>
    </header>
  );
}
