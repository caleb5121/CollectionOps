"use client";

import Link from "next/link";
import { useEffect } from "react";

import { DEV_ACCESS_STORAGE_KEY, isLocalDevelopmentClient } from "@/lib/devAccess";

import { AccountPreferencesProvider, useAccountPreferences } from "../AccountPreferencesProvider";
import { DataProvider } from "../DataProvider";
import { MotionProvider } from "../motion/MotionProvider";
import { SettingsProvider, useSettings } from "../SettingsProvider";
import AppSidebar from "./AppSidebar";
import FeedbackFloatingButton from "./FeedbackFloatingButton";
import MainToolbar from "./MainToolbar";

function AppLayoutInner({ children }: { children: React.ReactNode }) {
  const { estimatedShippingCostPerOrder } = useSettings();
  const { prefs } = useAccountPreferences();

  useEffect(() => {
    if (!isLocalDevelopmentClient()) return;
    let cancelled = false;
    void fetch("/api/dev-access/status")
      .then(async (res) => {
        if (!res.ok) return { active: false };
        return (await res.json()) as { active?: boolean };
      })
      .then(async (data) => {
        if (cancelled || !data.active) return;
        const hasProfile = Boolean(localStorage.getItem(DEV_ACCESS_STORAGE_KEY));
        if (hasProfile) return;
        await fetch("/api/dev-access/logout", { method: "POST" }).catch(() => {
          /* ignore */
        });
        window.location.replace("/login");
      })
      .catch(() => {
        /* ignore */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <DataProvider
      estimatedShippingCostPerOrder={estimatedShippingCostPerOrder}
      includeShippingInProfit={prefs.includeShippingInProfit}
    >
      <MotionProvider>
        <div className="min-h-screen">
          <div className="flex min-h-screen items-center justify-center bg-[var(--surface-muted)] px-4 py-10 sm:hidden">
            <div className="w-full max-w-md rounded-xl border border-[color-mix(in_oklab,var(--border-warm)_88%,transparent)] bg-[var(--surface-raised)] p-6 text-center shadow-[0_4px_24px_-8px_rgba(28,25,23,0.1)]">
              <p className="text-lg font-semibold tracking-tight text-stone-900 dark:text-stone-50">CollectionOps</p>
              <p className="mt-4 text-sm leading-relaxed text-stone-700 dark:text-stone-300">
                CollectionOps works best on a desktop or laptop.
                <br />
                Please open this page on a larger screen to import files and review your dashboard.
              </p>
              <Link
                href="/"
                className="mt-6 inline-flex items-center justify-center rounded-xl bg-[color:var(--accent)] px-4 py-2.5 text-sm font-semibold text-white shadow-[0_2px_6px_rgba(13,148,136,0.35),0_6px_18px_-6px_rgba(13,148,136,0.25)] transition-[transform,filter] duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] hover:brightness-[1.06] active:scale-[0.97]"
              >
                Back to home
              </Link>
            </div>
          </div>

          <div className="hidden min-h-screen flex-col sm:flex">
            <MainToolbar />
            <div className="flex min-h-0 min-w-0 flex-1 pt-4">
              <div className="flex min-h-0 w-[10.25rem] shrink-0 flex-col border-r border-[color:var(--divider-accent)] bg-[color-mix(in_oklab,var(--surface-muted)_42%,var(--background))] px-3 pb-5 pl-4 pr-2 pt-3 dark:border-stone-800/60 dark:bg-[color-mix(in_oklab,var(--surface-muted)_40%,var(--background))]">
                <AppSidebar />
              </div>
              <main className="app-canvas-texture min-h-0 min-w-0 flex-1 overflow-auto pl-4 pr-5 pb-6 pt-3 lg:pl-5 lg:pr-6">
                <div className="relative z-[1] min-h-full">
                  {children}
                  <FeedbackFloatingButton />
                </div>
              </main>
            </div>
          </div>
        </div>
      </MotionProvider>
    </DataProvider>
  );
}

export default function AppAuthenticatedLayout({ children }: { children: React.ReactNode }) {
  return (
    <SettingsProvider>
      <AccountPreferencesProvider>
        <AppLayoutInner>{children}</AppLayoutInner>
      </AccountPreferencesProvider>
    </SettingsProvider>
  );
}
