"use client";

import Link from "next/link";
import { useState } from "react";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function ContactPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSuccess("");
    setError("");

    const safeEmail = email.trim();
    const safeMessage = message.trim();
    if (!safeEmail || !EMAIL_RE.test(safeEmail) || !safeMessage) {
      setError("Something went wrong. Please try again or email bt2026@brickthread.com.");
      return;
    }

    setSending(true);
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: safeEmail,
          message: safeMessage,
        }),
      });
      if (!res.ok) {
        throw new Error("submit_failed");
      }
      setSuccess("Message sent. I’ll get back to you soon.");
      setName("");
      setEmail("");
      setMessage("");
    } catch {
      setError("Something went wrong. Please try again or email bt2026@brickthread.com.");
    } finally {
      setSending(false);
    }
  }

  return (
    <main className="min-h-dvh bg-gradient-to-b from-slate-50 via-white to-slate-100 text-slate-900">
      <section className="mx-auto w-full max-w-4xl px-4 py-14 sm:px-6 sm:py-18 lg:px-8 lg:py-20">
        <div className="rounded-2xl border border-slate-200/90 bg-white/90 p-6 shadow-[0_22px_44px_-30px_rgba(15,23,42,0.28)] sm:p-8 lg:p-10">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/85 pb-5">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Contact CollectionOps</h1>
            <Link href="/" className="text-sm font-semibold text-teal-700 transition-colors hover:text-teal-800">
              Back to CollectionOps
            </Link>
          </div>

          <p className="mt-6 text-sm leading-relaxed text-slate-700 sm:text-base">
            Questions, feedback, or support requests can be sent to{" "}
            <a
              href="mailto:bt2026@brickthread.com"
              className="font-semibold text-teal-700 transition-colors duration-200 hover:text-teal-800"
            >
              bt2026@brickthread.com
            </a>{" "}
            or submitted below.
          </p>

          <form className="mt-7 space-y-4 sm:mt-8" onSubmit={onSubmit}>
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-slate-800" htmlFor="contact-name">
                Name
              </label>
              <input
                id="contact-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-xl border border-slate-200/90 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-teal-400/80 focus:ring-2 focus:ring-teal-400/25 sm:text-base"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-semibold text-slate-800" htmlFor="contact-email">
                Email
              </label>
              <input
                id="contact-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl border border-slate-200/90 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-teal-400/80 focus:ring-2 focus:ring-teal-400/25 sm:text-base"
                required
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-semibold text-slate-800" htmlFor="contact-message">
                Message
              </label>
              <textarea
                id="contact-message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={6}
                className="w-full rounded-xl border border-slate-200/90 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-teal-400/80 focus:ring-2 focus:ring-teal-400/25 sm:text-base"
                required
              />
            </div>

            {error ? <p className="text-sm font-medium text-rose-700">{error}</p> : null}
            {success ? <p className="text-sm font-medium text-emerald-700">{success}</p> : null}

            <button
              type="submit"
              disabled={sending}
              className="inline-flex h-11 items-center justify-center rounded-xl bg-[color:var(--accent)] px-5 text-sm font-semibold text-white shadow-sm transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60 sm:h-12 sm:px-6 sm:text-base"
            >
              {sending ? "Sending..." : "Send Message"}
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}
