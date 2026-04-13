"use client";

import { SettingsProvider, useSettings } from "../../components/SettingsProvider";
import { AccountPreferencesProvider, useAccountPreferences } from "../../components/AccountPreferencesProvider";
import { DataProvider } from "../../components/DataProvider";
import { AuthProvider } from "../../components/AuthProvider";
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
        <div className="flex min-h-screen min-w-0 flex-col">
          <MainToolbar />
          <main className="app-canvas-texture min-h-0 flex-1 overflow-auto">
            <div className="relative z-[1] min-h-full">{children}</div>
          </main>
        </div>
      </MotionProvider>
    </DataProvider>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <SettingsProvider>
        <AccountPreferencesProvider>
          <AppLayoutInner>{children}</AppLayoutInner>
        </AccountPreferencesProvider>
      </SettingsProvider>
    </AuthProvider>
  );
}
