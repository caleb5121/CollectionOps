"use client";

import { useState } from "react";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

import type { DevAccessKind } from "@/lib/devAccess";
import { isLocalDevelopmentClient } from "@/lib/devAccess";

import { useAuth } from "../AuthProvider";

export default function DevAccessPanel() {
  const router = useRouter();
  const { devLogin } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState<DevAccessKind | null>(null);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  const devFlag = process.env.NEXT_PUBLIC_SHOW_DEV_ACCESS === "1";
  const allowByEnv = process.env.NODE_ENV === "development" || devFlag;
  if (!allowByEnv || !isLocalDevelopmentClient()) return null;

  async function run(kind: DevAccessKind) {
    setError("");
    setNote("");
    setLoading(kind);
    const result = await devLogin(kind);
    setLoading(null);
    if (result.error) {
      setError(result.error);
      return;
    }
    if (kind === "demo") {
      setNote("Demo Data User is active. Seeded data is not auto-created in this local shortcut.");
    }
    router.replace("/dashboard");
  }

  return (
    <section className="mt-6 rounded-xl border border-amber-200/90 bg-amber-50/75 p-4 dark:border-amber-800/50 dark:bg-amber-950/25">
      <h2 className="text-sm font-bold tracking-tight text-amber-900 dark:text-amber-100">Developer Access</h2>
      <div className="mt-3 space-y-2">
        <button
          type="button"
          onClick={() => void run("caleb")}
          disabled={loading !== null}
          className="w-full rounded-lg border border-amber-300/90 bg-white px-3 py-2 text-left text-xs font-semibold text-amber-900 transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-amber-700/70 dark:bg-amber-950/40 dark:text-amber-100 dark:hover:bg-amber-900/50"
        >
          {loading === "caleb" ? "Signing in..." : "Dev Login: Caleb Account"}
        </button>
        <button
          type="button"
          onClick={() => void run("empty")}
          disabled={loading !== null}
          className="w-full rounded-lg border border-amber-300/90 bg-white px-3 py-2 text-left text-xs font-semibold text-amber-900 transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-amber-700/70 dark:bg-amber-950/40 dark:text-amber-100 dark:hover:bg-amber-900/50"
        >
          {loading === "empty" ? "Signing in..." : "Dev Login: Empty New User"}
        </button>
        <button
          type="button"
          onClick={() => void run("demo")}
          disabled={loading !== null}
          className="w-full rounded-lg border border-amber-300/90 bg-white px-3 py-2 text-left text-xs font-semibold text-amber-900 transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-amber-700/70 dark:bg-amber-950/40 dark:text-amber-100 dark:hover:bg-amber-900/50"
        >
          {loading === "demo" ? "Signing in..." : "Dev Login: Demo Data User"}
        </button>
      </div>
      {note ? <p className="mt-2 text-[11px] font-medium text-amber-800/90 dark:text-amber-200/85">{note}</p> : null}
      {error ? <p className="mt-2 text-xs font-medium text-rose-700 dark:text-rose-300">{error}</p> : null}
    </section>
  );
}
