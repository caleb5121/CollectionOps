"use client";

import { useCallback, useLayoutEffect, useSyncExternalStore } from "react";
import { applyThemeClass, readStoredTheme, THEME_STORAGE_KEY, type ThemeMode } from "../../lib/theme";

const THEME_EVENT = "cardops-theme-change";

function subscribe(onStoreChange: () => void) {
  if (typeof window === "undefined") return () => {};
  const handler = () => onStoreChange();
  window.addEventListener("storage", handler);
  window.addEventListener(THEME_EVENT, handler);
  return () => {
    window.removeEventListener("storage", handler);
    window.removeEventListener(THEME_EVENT, handler);
  };
}

function getSnapshot(): ThemeMode {
  return readStoredTheme();
}

function getServerSnapshot(): ThemeMode {
  return "light";
}

export default function ThemeToggle() {
  const mode = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  useLayoutEffect(() => {
    applyThemeClass(mode);
  }, [mode]);

  const setTheme = useCallback((next: ThemeMode) => {
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      /* ignore quota / private mode */
    }
    applyThemeClass(next);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event(THEME_EVENT));
    }
  }, []);

  return (
    <div
      className="inline-flex rounded-full bg-slate-200/70 p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.65),0_2px_8px_-2px_rgba(15,23,42,0.1),0_6px_16px_-4px_rgba(15,23,42,0.08)] ring-1 ring-slate-200/80 dark:bg-slate-800/80 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_4px_14px_-2px_rgba(0,0,0,0.45)] dark:ring-slate-700/80"
      role="group"
      aria-label="Theme"
    >
      <button
        type="button"
        onClick={() => setTheme("light")}
        className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-all ${
          mode === "light"
            ? "bg-white text-slate-900 shadow-[0_1px_0_rgba(255,255,255,0.95)_inset,0_2px_6px_-1px_rgba(15,23,42,0.12),0_4px_12px_-2px_rgba(15,23,42,0.08)] ring-1 ring-slate-200/80 dark:bg-slate-700 dark:text-slate-100 dark:ring-slate-600/80"
            : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
        }`}
      >
        <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 20 20" aria-hidden>
          <path
            fillRule="evenodd"
            d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z"
            clipRule="evenodd"
          />
        </svg>
        Light
      </button>
      <button
        type="button"
        onClick={() => setTheme("dark")}
        className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-all ${
          mode === "dark"
            ? "bg-white text-slate-900 shadow-[0_1px_0_rgba(255,255,255,0.95)_inset,0_2px_6px_-1px_rgba(15,23,42,0.12),0_4px_12px_-2px_rgba(15,23,42,0.08)] ring-1 ring-slate-200/80 dark:bg-slate-700 dark:text-slate-100 dark:shadow-[0_1px_0_rgba(255,255,255,0.12)_inset,0_4px_12px_-2px_rgba(0,0,0,0.5)] dark:ring-slate-600/80"
            : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
        }`}
      >
        <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 20 20" aria-hidden>
          <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
        </svg>
        Dark
      </button>
    </div>
  );
}
