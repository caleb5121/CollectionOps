import Link from "next/link";

export const metadata = {
  title: "Privacy | CollectionOps",
  description: "CollectionOps privacy policy",
};

export default function PrivacyPage() {
  return (
    <main className="min-h-dvh bg-gradient-to-b from-slate-50 via-white to-slate-100 text-slate-900">
      <section className="mx-auto w-full max-w-4xl px-4 py-14 sm:px-6 sm:py-18 lg:px-8 lg:py-20">
        <div className="rounded-2xl border border-slate-200/90 bg-white/90 p-6 shadow-[0_22px_44px_-30px_rgba(15,23,42,0.28)] sm:p-8 lg:p-10">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/85 pb-5">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Privacy Policy</h1>
            <Link href="/" className="text-sm font-semibold text-teal-700 transition-colors hover:text-teal-800">
              Back to CollectionOps
            </Link>
          </div>

          <div className="mt-7 space-y-7 text-sm leading-relaxed text-slate-700 sm:text-base">
            <section>
              <h2 className="text-base font-semibold text-slate-900 sm:text-lg">Data we collect</h2>
              <p className="mt-2">
                CollectionOps may collect your email address and optional first name when you submit the Get Updates form.
                We may also collect basic usage and diagnostic information needed to keep the site working and improve the
                experience.
              </p>
            </section>

            <section>
              <h2 className="text-base font-semibold text-slate-900 sm:text-lg">How data is used</h2>
              <p className="mt-2">
                We use submitted contact details to send relevant product updates and respond to requests. Usage and
                diagnostic data is used to operate, protect, and improve CollectionOps.
              </p>
            </section>

            <section>
              <h2 className="text-base font-semibold text-slate-900 sm:text-lg">No sale of personal data</h2>
              <p className="mt-2">
                We do not sell your personal data. We only use information for operating CollectionOps and communicating
                directly with you.
              </p>
            </section>

            <section>
              <h2 className="text-base font-semibold text-slate-900 sm:text-lg">Contact</h2>
              <p className="mt-2">
                Questions about privacy can be sent to{" "}
                <a
                  className="font-semibold text-teal-700 transition-colors duration-200 hover:text-teal-800"
                  href="mailto:bt2026@brickthread.com"
                >
                  bt2026@brickthread.com
                </a>
                .
              </p>
            </section>
          </div>
        </div>
      </section>
    </main>
  );
}
