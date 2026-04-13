"use client";

import { useMemo, useRef, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { accountDisplayName, useAuth } from "../AuthProvider";
import { formatToolbarDate, getPageTitle } from "../../lib/pageTitles";
import ThemeToggle from "./ThemeToggle";
import { IconDashboard, IconHelp, IconImports, IconSettings, IconTrends } from "./NavIcons";

/** File must exist under web/public (see next.config images). */
const BRAND_LOGO_SRC = "/logo.svg";

const primaryNav: { href: string; caption: string; Icon: typeof IconDashboard }[] = [
  { href: "/dashboard", caption: "Dashboard", Icon: IconDashboard },
  { href: "/data", caption: "Imports", Icon: IconImports },
  { href: "/trends", caption: "Trends", Icon: IconTrends },
];

const secondaryNav: { href: string; caption: string; Icon: typeof IconDashboard }[] = [
  { href: "/settings", caption: "Settings", Icon: IconSettings },
  { href: "/help", caption: "FAQs", Icon: IconHelp },
];

function topNavPillClass(active: boolean) {
  const base =
    "inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1.5 text-xs font-semibold transition-[color,background-color,box-shadow,transform] sm:gap-2 sm:px-3 sm:text-sm";
  if (active) {
    return `${base} bg-white text-neutral-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.95),0_2px_8px_-2px_rgba(15,23,42,0.1)] ring-1 ring-inset ring-slate-200/90 ring-[color:var(--accent)]/20 dark:bg-slate-800 dark:text-white dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.1),0_4px_14px_-4px_rgba(0,0,0,0.45)] dark:ring-slate-600/85 dark:ring-[color:var(--accent)]/25`;
  }
  return `${base} text-neutral-900/70 ring-1 ring-inset ring-transparent hover:bg-slate-100/90 hover:text-neutral-900 hover:shadow-[0_2px_10px_-4px_rgba(15,23,42,0.12)] dark:text-slate-300/85 dark:hover:bg-slate-800/75 dark:hover:text-slate-50 dark:hover:shadow-[0_4px_14px_-4px_rgba(0,0,0,0.45)]`;
}

function TopNavLink({
  href,
  caption,
  Icon,
  active,
}: {
  href: string;
  caption: string;
  Icon: typeof IconDashboard;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      title={caption}
      aria-label={caption}
      aria-current={active ? "page" : undefined}
      className={`${topNavPillClass(active)} focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent)]/40`}
    >
      <Icon className="size-4 shrink-0 sm:size-[1.125rem]" strokeWidth={2.25} aria-hidden />
      <span className="whitespace-nowrap">{caption}</span>
    </Link>
  );
}

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
  const settingsPage = pathname === "/settings";
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
    <header className="sticky top-0 z-40 shrink-0 border-b border-slate-200/80 bg-gradient-to-b from-white to-slate-50/90 shadow-[inset_0_1px_0_rgba(255,255,255,0.98),0_2px_8px_-2px_rgba(15,23,42,0.06),0_12px_40px_-12px_rgba(15,23,42,0.14)] dark:border-slate-800/90 dark:from-slate-950 dark:to-slate-900/95 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.07),0_4px_16px_-4px_rgba(0,0,0,0.45),0_18px_48px_-16px_rgba(0,0,0,0.4)]">
      <div className="flex min-h-[60px] min-w-0 flex-wrap items-center gap-x-3 gap-y-2.5 px-4 py-2.5 sm:px-8 lg:px-10">
        <div className="flex min-w-0 flex-wrap items-center gap-2 sm:gap-3">
          <Link
            href="/dashboard"
            className="flex shrink-0 rounded-md transition-opacity hover:opacity-90 active:opacity-80 focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent)]/40"
            aria-label="CardOps home"
          >
            <Image
              src={BRAND_LOGO_SRC}
              alt=""
              width={40}
              height={40}
              className="h-10 w-10 shrink-0 object-contain"
              sizes="40px"
              priority
              unoptimized
            />
          </Link>

          <nav className="flex flex-wrap items-center gap-1 sm:gap-1.5" aria-label="Primary">
            {primaryNav.map(({ href, caption, Icon }) => (
              <TopNavLink key={href} href={href} caption={caption} Icon={Icon} active={pathname === href} />
            ))}
          </nav>

          <span
            className="hidden h-6 w-px shrink-0 bg-slate-200/90 sm:block dark:bg-slate-700/90"
            aria-hidden
          />

          <nav className="flex flex-wrap items-center gap-1 sm:gap-1.5" aria-label="More">
            {secondaryNav.map(({ href, caption, Icon }) => (
              <TopNavLink key={href} href={href} caption={caption} Icon={Icon} active={pathname === href} />
            ))}
          </nav>
        </div>

        <div className="flex min-w-0 flex-1 basis-[min(100%,12rem)] flex-wrap items-center gap-x-3 gap-y-1">
          <h1
            className={
              settingsPage
                ? "min-w-0 truncate text-[1.35rem] font-bold tracking-tight text-[color:var(--accent)] sm:text-[1.5rem]"
                : "min-w-0 truncate text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100 sm:text-[1.5rem]"
            }
          >
            {title}
          </h1>
          <button
            type="button"
            className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-transparent px-1 py-0.5 text-sm text-slate-500 transition-app hover:border-slate-200 hover:bg-slate-50 hover:text-slate-700 active:scale-[0.98] dark:hover:border-slate-700 dark:hover:bg-slate-800/80 dark:hover:text-slate-200"
            aria-label="Select date"
          >
            {dateLabel}
            <svg className="h-4 w-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>

        <div className="ml-auto flex shrink-0 items-center gap-3 sm:gap-4">
          <ThemeToggle />
          {user ? (
            <div className="relative" ref={dropdownRef}>
              <button
                type="button"
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="inline-flex min-w-0 max-w-[min(280px,calc(100vw-9rem))] items-center gap-2.5 rounded-xl border border-slate-200/90 bg-white py-1.5 pl-1.5 pr-2 shadow-[0_1px_0_rgba(255,255,255,0.95)_inset,0_2px_8px_-2px_rgba(15,23,42,0.08),0_8px_24px_-8px_rgba(15,23,42,0.1)] ring-1 ring-slate-900/[0.04] transition-app hover:border-slate-300 hover:shadow-[0_1px_0_rgba(255,255,255,0.98)_inset,0_4px_14px_-4px_rgba(15,23,42,0.12)] active:scale-[0.99] dark:border-slate-700/90 dark:bg-slate-900/80 dark:shadow-[0_4px_20px_-4px_rgba(0,0,0,0.45)]"
                title={user.email.trim() ? user.email : accountDisplayName(user)}
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
                className="rounded-xl border border-slate-200/90 bg-white px-4 py-2 text-sm font-medium text-slate-800 shadow-[0_1px_0_rgba(255,255,255,0.95)_inset,0_2px_8px_-2px_rgba(15,23,42,0.08),0_6px_20px_-6px_rgba(15,23,42,0.1)] ring-1 ring-slate-900/5 transition-app hover:border-slate-300 hover:bg-slate-50 active:scale-[0.98] dark:border-slate-700/90 dark:bg-slate-900/85 dark:text-slate-100"
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
      </div>
    </header>
  );
}
