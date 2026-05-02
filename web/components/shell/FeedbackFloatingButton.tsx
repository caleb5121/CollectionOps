"use client";

import { useState } from "react";

export default function FeedbackFloatingButton() {
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [feedbackName, setFeedbackName] = useState("");
  const [feedbackEmail, setFeedbackEmail] = useState("");
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const [feedbackSending, setFeedbackSending] = useState(false);
  const [feedbackSuccess, setFeedbackSuccess] = useState("");
  const [feedbackError, setFeedbackError] = useState("");

  async function submitFeedback(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (feedbackSending) return;
    setFeedbackSuccess("");
    setFeedbackError("");
    if (!feedbackEmail.trim() || !feedbackMessage.trim()) {
      setFeedbackError("Email and message are required.");
      return;
    }
    setFeedbackSending(true);
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: feedbackName.trim(),
          email: feedbackEmail.trim(),
          message: feedbackMessage.trim(),
        }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || data.ok !== true) {
        throw new Error(data.error || "send_failed");
      }
      setFeedbackSuccess("Thanks, your feedback was sent.");
      setFeedbackName("");
      setFeedbackEmail("");
      setFeedbackMessage("");
    } catch (error) {
      if (process.env.NODE_ENV === "development") {
        console.error("Feedback submission failed", error);
      }
      setFeedbackError("Feedback could not be sent. Please email support@collectionops.com.");
    } finally {
      setFeedbackSending(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setFeedbackOpen(true);
          setFeedbackSuccess("");
          setFeedbackError("");
        }}
        className="fixed bottom-5 right-5 z-[60] flex h-12 w-12 items-center justify-center rounded-full border border-slate-200/90 bg-white text-[color:var(--accent)] shadow-[0_8px_28px_-6px_rgba(15,23,42,0.25)] transition hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent)]/40 dark:border-slate-600/80 dark:bg-slate-900 dark:text-teal-300 dark:shadow-[0_10px_32px_-8px_rgba(0,0,0,0.55)] dark:hover:bg-slate-800 sm:bottom-6 sm:right-6"
        aria-label="Give feedback"
        title="Give feedback"
      >
        <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden>
          <path
            strokeWidth="2.1"
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M8 10h8M8 14h5M6 19l-1.5 1V5a2 2 0 012-2h11a2 2 0 012 2v12a2 2 0 01-2 2H6z"
          />
        </svg>
      </button>

      {feedbackOpen ? (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/45 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Give feedback"
        >
          <div className="w-full max-w-md rounded-2xl border border-slate-200/90 bg-white p-4 shadow-xl dark:border-slate-700/80 dark:bg-slate-900">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-50">
                Have feedback? Send feedback directly to our team
              </h2>
              <button
                type="button"
                onClick={() => setFeedbackOpen(false)}
                className="rounded-lg border border-slate-200 px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                Close
              </button>
            </div>
            <form className="mt-3 space-y-3" onSubmit={submitFeedback}>
              <input
                type="text"
                placeholder="Name"
                value={feedbackName}
                onChange={(e) => setFeedbackName(e.target.value)}
                className="w-full rounded-xl border border-slate-200/90 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-[color:var(--accent)] focus:ring-2 focus:ring-[color:var(--accent)]/25 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100"
              />
              <input
                type="email"
                placeholder="Email"
                value={feedbackEmail}
                onChange={(e) => setFeedbackEmail(e.target.value)}
                className="w-full rounded-xl border border-slate-200/90 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-[color:var(--accent)] focus:ring-2 focus:ring-[color:var(--accent)]/25 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100"
              />
              <textarea
                placeholder="Message"
                value={feedbackMessage}
                onChange={(e) => setFeedbackMessage(e.target.value)}
                rows={5}
                className="w-full rounded-xl border border-slate-200/90 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-[color:var(--accent)] focus:ring-2 focus:ring-[color:var(--accent)]/25 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100"
              />
              {feedbackError ? (
                <p className="text-xs font-medium text-rose-700 dark:text-rose-300">{feedbackError}</p>
              ) : null}
              {feedbackSuccess ? (
                <p className="text-xs font-medium text-emerald-700 dark:text-emerald-300">{feedbackSuccess}</p>
              ) : null}
              <button
                type="submit"
                disabled={feedbackSending}
                className="inline-flex w-full items-center justify-center rounded-xl bg-[color:var(--accent)] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {feedbackSending ? "Sending..." : "Send"}
              </button>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
