"use client";

import Link from "next/link";
import { useState } from "react";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type LandingEmailCaptureProps = {
  className?: string;
  /** Tighter vertical rhythm when nested under hero copy */
  compact?: boolean;
  /** Wrap demo + email row in one framed block (hero landing) */
  framed?: boolean;
  /** Hero: wider block + ~30% / flex email / compact button on large screens */
  heroWideForm?: boolean;
  /** Optional lead attribution source (e.g. reddit, tiktok, demo, landing_footer) */
  source?: string;
  /** Hero-only: Try Demo + copy, no email form */
  ctaOnly?: boolean;
};

export default function LandingEmailCapture({
  className = "",
  compact,
  framed,
  heroWideForm,
  source,
  ctaOnly,
}: LandingEmailCaptureProps) {
  const [firstName, setFirstName] = useState("");
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setSuccess("");
    const value = email.trim().toLowerCase();
    if (!EMAIL_RE.test(value)) {
      setError("Enter a valid email address.");
      return;
    }

    setSending(true);
    try {
      const name = firstName.trim();
      const res = await fetch("/api/landing-signups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: value,
          ...(name ? { firstName: name } : {}),
          ...(source?.trim() ? { source: source.trim() } : {}),
        }),
      });
      if (!res.ok) {
        setError("Could not save that right now. Please try again.");
        return;
      }
      setSuccess("You’re in. I’ll send updates as CollectionOps grows.");
      setEmail("");
      setFirstName("");
    } catch {
      setError("Could not save that right now. Please try again.");
    } finally {
      setSending(false);
    }
  }

  const inputPad = heroWideForm ? "px-3 sm:px-3.5" : "px-2.5 sm:px-3";
  const inputClass = [
    heroWideForm
      ? "h-9 min-w-0 w-full rounded-lg border border-white/12 bg-slate-950/30 text-[11px] text-slate-200 placeholder:text-slate-500/80 outline-none transition focus:border-teal-300/45 focus:ring-2 focus:ring-teal-400/15 sm:h-10 sm:text-xs"
      : "h-10 min-w-0 w-full rounded-lg border border-white/15 bg-slate-950/50 text-xs text-slate-100 placeholder:text-slate-500/75 outline-none transition focus:border-teal-300/50 focus:ring-2 focus:ring-teal-400/20 sm:h-11 sm:text-sm",
    heroWideForm ? "" : "flex-1",
    inputPad,
  ]
    .filter(Boolean)
    .join(" ");

  const secondaryBtnClass = heroWideForm
    ? "inline-flex h-9 w-full shrink-0 items-center justify-center rounded-lg border border-white/15 bg-white/[0.07] px-3 text-[11px] font-semibold text-slate-200 transition hover:bg-white/[0.12] disabled:cursor-not-allowed disabled:opacity-50 sm:h-10 lg:h-10 lg:w-full lg:min-w-0 lg:text-xs"
    : "inline-flex h-10 w-full shrink-0 items-center justify-center rounded-lg border border-white/18 bg-white/10 px-3 text-xs font-semibold text-slate-100 transition hover:bg-white/14 disabled:cursor-not-allowed disabled:opacity-50 sm:h-11 sm:w-auto sm:min-w-[7.5rem] sm:px-4 sm:text-sm";

  const stackGap = framed
    ? "gap-2 sm:gap-2.5"
    : compact
      ? "gap-2.5 sm:gap-3"
      : "gap-3 sm:gap-3.5";

  if (ctaOnly) {
    const heroCtaLarge = "self-start px-10 py-4 sm:px-11 sm:py-4 sm:text-lg";
    const heroCtaLargeCentered = "self-center px-10 py-4 sm:px-11 sm:py-4 sm:text-lg";
    const linkAlignClass = heroWideForm
      ? framed
        ? heroCtaLargeCentered
        : heroCtaLarge
      : "self-start px-6 py-3 sm:px-8 sm:py-3.5 sm:text-base";
    const ctaBlock = (
      <div className="flex w-full flex-col items-stretch gap-0">
        <Link
          href="/data?demo=1"
          className={`inline-flex w-auto shrink-0 items-center justify-center rounded-xl bg-orange-500 text-base font-extrabold text-white shadow-[0_18px_38px_-14px_rgba(249,115,22,0.8)] transition hover:bg-orange-600 hover:shadow-[0_22px_44px_-16px_rgba(249,115,22,0.84)] active:scale-[0.99] ${linkAlignClass}`}
        >
          Try Demo
        </Link>
        <p
          className={`mt-2.5 text-[14px] font-semibold leading-snug tracking-tight text-slate-200 ${heroWideForm && framed ? "text-center" : "text-left"}`}
        >
          No signup required
        </p>
      </div>
    );
    const root = ["w-full", heroWideForm ? "" : "max-w-xl", className].filter(Boolean).join(" ");
    if (framed) {
      const framePad = heroWideForm ? "p-4 sm:p-5 lg:p-6" : "p-4 sm:p-5";
      return (
        <div className={root}>
          <div
            className={`rounded-2xl border border-white/15 bg-slate-950/45 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-md sm:rounded-[1.125rem] ${framePad}`}
          >
            {ctaBlock}
          </div>
        </div>
      );
    }
    return <div className={root}>{ctaBlock}</div>;
  }

  const primaryBlock = (
    <div className={`flex w-full flex-col items-stretch ${stackGap}`}>
      <Link
        href="/data?demo=1"
        className={`inline-flex w-auto shrink-0 items-center justify-center rounded-xl bg-orange-500 text-base font-extrabold text-white shadow-[0_18px_38px_-14px_rgba(249,115,22,0.8)] transition hover:bg-orange-600 hover:shadow-[0_22px_44px_-16px_rgba(249,115,22,0.84)] active:scale-[0.99] ${heroWideForm ? "self-center px-10 py-4 sm:px-11 sm:py-4 sm:text-lg" : "self-start px-6 py-3 sm:px-8 sm:py-3.5 sm:text-base"}`}
      >
        Try Demo
      </Link>
      <p className={`text-[11px] font-medium leading-snug text-slate-300/85 sm:text-xs ${heroWideForm ? "text-center" : ""}`}>
        No signup required
      </p>

      <form
        onSubmit={onSubmit}
        className={`flex w-full flex-col ${heroWideForm ? "mt-1 max-w-[43rem] self-center gap-1.5 sm:gap-2" : "gap-2 sm:gap-2.5 lg:gap-2.5"}`}
      >
        <div
          className={
            heroWideForm
              ? "grid w-full grid-cols-1 gap-2 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)_minmax(0,0.95fr)] lg:items-stretch lg:gap-2.5"
              : "flex w-full flex-col gap-2 sm:flex-row sm:items-stretch sm:gap-2"
          }
        >
          <input
            type="text"
            name="firstName"
            autoComplete="given-name"
            value={firstName}
            onChange={(e) => {
              setFirstName(e.target.value);
              setError("");
              setSuccess("");
            }}
            placeholder="First name"
            className={heroWideForm ? `${inputClass} min-w-0` : inputClass}
            aria-label="First name (optional)"
          />
          <input
            type="email"
            name="email"
            autoComplete="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setError("");
              setSuccess("");
            }}
            placeholder="Email"
            className={heroWideForm ? `${inputClass} min-w-0` : inputClass}
            aria-label="Email for updates"
          />
          <button type="submit" disabled={sending} className={secondaryBtnClass}>
            {sending ? "…" : "Get updates"}
          </button>
        </div>
        <p className={`text-xs font-normal leading-relaxed text-slate-400/85 sm:leading-relaxed ${heroWideForm ? "text-[11px] sm:text-xs" : "sm:text-sm"}`}>
          First name and email only. No spam. No sharing your info.
        </p>

        {error ? <p className="text-[11px] font-normal text-rose-300/90">{error}</p> : null}
        {success ? <p className="text-[11px] font-normal text-emerald-300/85">{success}</p> : null}
      </form>
    </div>
  );

  const root = ["w-full", heroWideForm ? "" : "max-w-xl", className].filter(Boolean).join(" ");

  if (framed) {
    const framePad = heroWideForm ? "p-4 sm:p-5 lg:p-6" : "p-4 sm:p-5";
    return (
      <div className={root}>
        <div
          className={`rounded-2xl border border-white/15 bg-slate-950/45 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-md sm:rounded-[1.125rem] ${framePad}`}
        >
          {primaryBlock}
        </div>
      </div>
    );
  }

  return <div className={root}>{primaryBlock}</div>;
}
