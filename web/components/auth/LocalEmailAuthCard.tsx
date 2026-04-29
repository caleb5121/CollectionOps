"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { useAuth } from "../AuthProvider";
import DevAccessPanel from "./DevAccessPanel";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const RESEND_COOLDOWN_SECONDS = 30;

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
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resendNotice, setResendNotice] = useState("");

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const id = window.setInterval(() => {
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => window.clearInterval(id);
  }, [resendCooldown]);

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

  async function requestMagicLink() {
    const v = email.trim().toLowerCase();
    if (!EMAIL_RE.test(v)) {
      setError("Enter a valid email address.");
      return false;
    }
    setSending(true);
    const { error: linkError } = await sendMagicLink(v, otpKind);
    setSending(false);
    if (linkError) {
      setError(linkError);
      return false;
    }
    return true;
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setResendNotice("");
    setSent(false);
    const ok = await requestMagicLink();
    if (!ok) return;
    setSent(true);
    setResendCooldown(RESEND_COOLDOWN_SECONDS);
  }

  async function onResend() {
    if (sending || resendCooldown > 0) return;
    setError("");
    setResendNotice("");
    const ok = await requestMagicLink();
    if (!ok) return;
    setResendNotice("Email sent again.");
    setResendCooldown(RESEND_COOLDOWN_SECONDS);
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
        <div className="mt-6 space-y-3">
          <p className="rounded-lg border border-teal-200/90 bg-teal-50/90 px-4 py-3 text-sm leading-relaxed text-teal-950 dark:border-teal-800/50 dark:bg-teal-950/40 dark:text-teal-100">
            {otpKind === "signup"
              ? "Check your email to confirm your CollectionOps account. After you confirm, you will be signed in and sent to your dashboard."
              : "Check your email for a sign-in link. You can close this tab; after you click the link you will be signed in and sent to your dashboard."}
          </p>
          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => void onResend()}
              disabled={sending || resendCooldown > 0}
              className="inline-flex h-9 items-center justify-center rounded-lg border border-slate-300/90 bg-white px-3 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              {sending ? "Sending..." : resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend email"}
            </button>
            {resendNotice ? <p className="text-xs font-medium text-emerald-700 dark:text-emerald-300">{resendNotice}</p> : null}
          </div>
          {error ? (
            <p className="text-xs font-medium text-red-600 dark:text-red-400" role="alert">
              {error}
            </p>
          ) : null}
        </div>
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
      <DevAccessPanel />
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
