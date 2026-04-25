"use client";

import Link from "next/link";
import { SettingsProvider, useSettings } from "../../components/SettingsProvider";
import { AccountPreferencesProvider, useAccountPreferences } from "../../components/AccountPreferencesProvider";
import { DataProvider } from "../../components/DataProvider";
import AppSidebar from "../../components/shell/AppSidebar";
import MainToolbar from "../../components/shell/MainToolbar";
import { MotionProvider } from "../../components/motion/MotionProvider";

function AppLayoutInner({ children }: { children: React.ReactNode }) {
  const { estimatedShippingCostPerOrder } = useSettings();
  const { prefs } = useAccountPreferences();

  return (
    <DataProvider
      estimatedShippingCostPerOrder={estimatedShippingCostPerOrder}
      includeShippingInProfit={prefs.includeShippingInProfit}
    >
      <MotionProvider>
        <div className="min-h-screen">
          <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-slate-100 via-white to-slate-100 px-4 py-10 sm:hidden">
            <div className="w-full max-w-md rounded-2xl border border-slate-200/90 bg-white/95 p-6 text-center shadow-[0_22px_44px_-30px_rgba(15,23,42,0.28)]">
              <p className="text-lg font-bold tracking-tight text-slate-900">CollectionOps</p>
              <p className="mt-4 text-sm leading-relaxed text-slate-700">
                CollectionOps works best on a desktop or laptop.
                <br />
                Please open this page on a larger screen to import files and review your dashboard.
              </p>
              <Link
                href="/"
                className="mt-6 inline-flex items-center justify-center rounded-xl bg-[color:var(--accent)] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:brightness-110"
              >
                Back to home
              </Link>
            </div>
          </div>

          <div className="hidden min-h-screen sm:block">
            <AppSidebar />
            <div className="ml-28 flex min-h-screen min-w-0 flex-col">
              <MainToolbar />
              <main className="app-canvas-texture min-h-0 flex-1 overflow-auto">
                <div className="relative z-[1] min-h-full">{children}</div>
              </main>
            </div>
          </div>
        </div>
      </MotionProvider>
    </DataProvider>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <SettingsProvider>
      <AccountPreferencesProvider>
        <AppLayoutInner>{children}</AppLayoutInner>
      </AccountPreferencesProvider>
    </SettingsProvider>
  );
}
