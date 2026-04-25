"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { useAuth } from "../AuthProvider";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type Props = {
  title: string;
  description: string;
  submitLabel: string;
  otpKind: "login" | "signup";
  /** Optional secondary link (e.g. switch between login and signup). */
  alternate?: { lead: string; href: string; label: string };
};

export default function LocalEmailAuthCard({ title, description, submitLabel, otpKind, alternate }: Props) {
  const { user, sendMagicLink } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [authNotice, setAuthNotice] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    if (user) router.replace("/dashboard");
  }, [user, router]);

  useEffect(() => {
    const authError = (searchParams.get("error") ?? "").toLowerCase();
    const errorCode = (searchParams.get("error_code") ?? "").toLowerCase();
    const errorDescription = (searchParams.get("error_description") ?? "").toLowerCase();
    const isExpiredOrUsedLink =
      authError === "auth" &&
      (errorCode === "otp_expired" ||
        errorDescription.includes("invalid") ||
        errorDescription.includes("expired") ||
        errorDescription.includes("already"));
    if (!isExpiredOrUsedLink) return;
    setAuthNotice(
      otpKind === "signup"
        ? "That signup link expired or was already used. Enter your email again and we’ll send a fresh one."
        : "Your login link expired or was already used. Enter your email again and we’ll send a fresh one.",
    );
    if (searchParams.toString()) {
      router.replace(pathname || (otpKind === "signup" ? "/signup" : "/login"));
    }
  }, [otpKind, pathname, router, searchParams]);

  if (user) {
    return (
      <div className="rounded-xl border border-slate-200/90 bg-white px-6 py-10 text-center text-sm text-slate-600 shadow-sm dark:border-slate-700/90 dark:bg-slate-900/80 dark:text-slate-400">
        Redirecting…
      </div>
    );
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setSent(false);
    const v = email.trim().toLowerCase();
    if (!EMAIL_RE.test(v)) {
      setError("Enter a valid email address.");
      return;
    }
    setSending(true);
    const { error: linkError } = await sendMagicLink(v, otpKind);
    setSending(false);
    if (linkError) {
      setError(linkError);
      return;
    }
    setSent(true);
  }

  return (
    <div className="w-full max-w-md rounded-2xl border border-slate-200/90 bg-white p-6 shadow-[0_18px_48px_-12px_rgba(15,23,42,0.12)] dark:border-slate-700/90 dark:bg-slate-900/90 dark:shadow-[0_24px_64px_-16px_rgba(0,0,0,0.45)] sm:p-8">
      <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50">{title}</h1>
      <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400">{description}</p>
      {authNotice ? (
        <p className="mt-4 rounded-lg border border-amber-200/90 bg-amber-50/90 px-4 py-3 text-sm leading-relaxed text-amber-950 dark:border-amber-800/50 dark:bg-amber-950/35 dark:text-amber-100">
          {authNotice}
        </p>
      ) : null}
      {sent ? (
        <p className="mt-6 rounded-lg border border-teal-200/90 bg-teal-50/90 px-4 py-3 text-sm leading-relaxed text-teal-950 dark:border-teal-800/50 dark:bg-teal-950/40 dark:text-teal-100">
          Check your email for a sign-in link. You can close this tab; after you click the link you will be signed in
          and sent to your dashboard.
        </p>
      ) : (
        <form onSubmit={(e) => void onSubmit(e)} className="mt-6 space-y-4">
          <div>
            <label htmlFor="auth-email" className="block text-xs font-medium text-slate-600 dark:text-slate-400">
              Email
            </label>
            <input
              id="auth-email"
              type="email"
              name="email"
              autoComplete="email"
              value={email}
              onChange={(ev) => {
                setEmail(ev.target.value);
                setError("");
              }}
              placeholder="you@example.com"
              aria-invalid={error ? true : undefined}
              className="mt-1.5 w-full rounded-lg border border-slate-200/90 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none ring-slate-400/30 placeholder:text-slate-400 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/25 dark:border-slate-600 dark:bg-slate-950/80 dark:text-slate-100 dark:placeholder:text-slate-500"
            />
            {error ? (
              <p className="mt-1.5 text-xs font-medium text-red-600 dark:text-red-400" role="alert">
                {error}
              </p>
            ) : null}
          </div>
          <button
            type="submit"
            disabled={sending}
            className="w-full rounded-lg border border-teal-600 bg-teal-600 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-60 dark:border-teal-500 dark:bg-teal-600 dark:hover:bg-teal-500"
          >
            {sending ? "Sending…" : submitLabel}
          </button>
        </form>
      )}
      {alternate ? (
        <p className="mt-5 text-center text-sm text-slate-600 dark:text-slate-400">
          {alternate.lead}{" "}
          <Link
            href={alternate.href}
            className="font-semibold text-teal-700 underline decoration-teal-700/35 underline-offset-2 hover:text-teal-800 dark:text-teal-400 dark:hover:text-teal-300"
          >
            {alternate.label}
          </Link>
        </p>
      ) : null}
      <p className={`text-center text-xs text-slate-500 dark:text-slate-500 ${alternate ? "mt-3" : "mt-6"}`}>
        <Link href="/" className="font-medium text-teal-700 underline decoration-teal-700/30 underline-offset-2 hover:text-teal-800 dark:text-teal-400 dark:hover:text-teal-300">
          Back to home
        </Link>
      </p>
    </div>
  );
}
