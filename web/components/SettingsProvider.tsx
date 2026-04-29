"use client";

import React, { createContext, useContext, useState, useCallback, useEffect } from "react";

export type ShippingItem = {
  id: string;
  name: string;
  cost: number;
};

/** Default shipping line items (used on first load and reset). */
export const DEFAULT_SHIPPING_ITEMS: ShippingItem[] = [
  { id: "1", name: "Stamp", cost: 0.63 },
  { id: "2", name: "Envelope", cost: 0.15 },
  { id: "3", name: "Toploader", cost: 0.1 },
  { id: "4", name: "Team bag", cost: 0.12 },
];

const DEFAULT_ITEMS = DEFAULT_SHIPPING_ITEMS;

const STORAGE_KEY = "cardops-shipping-settings";

export type ShippingProfileMode = "pwe" | "mixed" | "tracked";

const SHIPPING_PROFILE_KEY = "cardops-shipping-profile-v1";

function loadShippingProfile(): ShippingProfileMode {
  if (typeof window === "undefined") return "mixed";
  try {
    const raw = localStorage.getItem(SHIPPING_PROFILE_KEY);
    if (raw === "pwe" || raw === "mixed" || raw === "tracked") return raw;
  } catch {
    /* ignore */
  }
  return "mixed";
}

function saveShippingProfile(mode: ShippingProfileMode) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(SHIPPING_PROFILE_KEY, mode);
  } catch {
    /* ignore */
  }
}

function loadItems(): ShippingItem[] {
  if (typeof window === "undefined") return DEFAULT_ITEMS;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map((p: { id?: string; name?: string; cost?: number }, i: number) => ({
          id: p.id ?? `item-${i}`,
          name: String(p.name ?? ""),
          cost: Number(p.cost) || 0,
        }));
      }
    }
  } catch {
    // ignore
  }
  return DEFAULT_ITEMS;
}

function saveItems(items: ShippingItem[]): boolean {
  if (typeof window === "undefined") return true;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    return true;
  } catch {
    return false;
  }
}

function generateId() {
  return `item-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

type SettingsContextValue = {
  shippingItems: ShippingItem[];
  setShippingItems: (items: ShippingItem[]) => void;
  addShippingItem: (initial?: Partial<Pick<ShippingItem, "name" | "cost">>) => boolean;
  resetShippingDefaults: () => boolean;
  removeShippingItem: (id: string) => boolean;
  updateShippingItem: (id: string, updates: Partial<Pick<ShippingItem, "name" | "cost">>) => boolean;
  /** Writes the current breakdown to localStorage again (for an explicit Save action). */
  saveShippingSettings: () => void;
  estimatedShippingCostPerOrder: number;
  /** How you mostly ship - feeds future benchmarks and estimate models; line items below drive today’s per-order total. */
  shippingProfile: ShippingProfileMode;
  setShippingProfile: (mode: ShippingProfileMode) => void;
};

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [shippingItems, setShippingItemsState] = useState<ShippingItem[]>(DEFAULT_ITEMS);
  const [shippingProfile, setShippingProfileState] = useState<ShippingProfileMode>("mixed");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const id = setTimeout(() => {
      setShippingItemsState(loadItems());
      setShippingProfileState(loadShippingProfile());
      setMounted(true);
    }, 0);
    return () => clearTimeout(id);
  }, []);

  const setShippingProfile = useCallback((mode: ShippingProfileMode) => {
    setShippingProfileState(mode);
    saveShippingProfile(mode);
  }, []);

  const setShippingItems = useCallback((items: ShippingItem[]) => {
    setShippingItemsState(items);
    saveItems(items);
  }, []);

  const addShippingItem = useCallback((initial?: Partial<Pick<ShippingItem, "name" | "cost">>) => {
    let saved = true;
    setShippingItemsState((prev) => {
      const next = [
        ...prev,
        {
          id: generateId(),
          name: initial?.name ?? "",
          cost: Number(initial?.cost) || 0,
        },
      ];
      saved = saveItems(next);
      return next;
    });
    return saved;
  }, []);

  const resetShippingDefaults = useCallback(() => {
    const next = DEFAULT_SHIPPING_ITEMS.map((item) => ({ ...item }));
    setShippingItemsState(next);
    return saveItems(next);
  }, []);

  const removeShippingItem = useCallback((id: string) => {
    let saved = true;
    setShippingItemsState((prev) => {
      const next = prev.filter((i) => i.id !== id);
      if (next.length === 0) return prev;
      saved = saveItems(next);
      return next;
    });
    return saved;
  }, []);

  const updateShippingItem = useCallback((id: string, updates: Partial<Pick<ShippingItem, "name" | "cost">>) => {
    let saved = true;
    setShippingItemsState((prev) => {
      const next = prev.map((i) =>
        i.id === id ? { ...i, ...updates } : i
      );
      saved = saveItems(next);
      return next;
    });
    return saved;
  }, []);

  const saveShippingSettings = useCallback(() => {
    setShippingItemsState((items) => {
      saveItems(items);
      return items;
    });
  }, []);

  const estimatedShippingCostPerOrder = shippingItems.reduce((sum, i) => sum + i.cost, 0);

  return (
    <SettingsContext.Provider
      value={{
        shippingItems,
        setShippingItems,
        addShippingItem,
        resetShippingDefaults,
        removeShippingItem,
        updateShippingItem,
        saveShippingSettings,
        estimatedShippingCostPerOrder: mounted ? estimatedShippingCostPerOrder : 1.0,
        shippingProfile,
        setShippingProfile,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error("useSettings must be used within SettingsProvider");
  return ctx;
}
