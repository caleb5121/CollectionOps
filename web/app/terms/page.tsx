import Link from "next/link";

export const metadata = {
  title: "Terms | CollectionOps",
  description: "CollectionOps terms of use",
};

export default function TermsPage() {
  return (
    <main className="min-h-dvh bg-gradient-to-b from-slate-50 via-white to-slate-100 text-slate-900">
      <section className="mx-auto w-full max-w-4xl px-4 py-14 sm:px-6 sm:py-18 lg:px-8 lg:py-20">
        <div className="rounded-2xl border border-slate-200/90 bg-white/90 p-6 shadow-[0_22px_44px_-30px_rgba(15,23,42,0.28)] sm:p-8 lg:p-10">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/85 pb-5">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Terms of Use</h1>
            <Link href="/" className="text-sm font-semibold text-teal-700 transition-colors hover:text-teal-800">
              Back to CollectionOps
            </Link>
          </div>

          <div className="mt-7 space-y-7 text-sm leading-relaxed text-slate-700 sm:text-base">
            <section>
              <h2 className="text-base font-semibold text-slate-900 sm:text-lg">General informational tool</h2>
              <p className="mt-2">
                CollectionOps is provided as an informational tool to help summarize and review store export data. It is
                intended for guidance and operational visibility only.
              </p>
            </section>

            <section>
              <h2 className="text-base font-semibold text-slate-900 sm:text-lg">No financial outcome guarantee</h2>
              <p className="mt-2">
                We do not guarantee revenue, profit, sales performance, or any specific financial outcome from using
                CollectionOps.
              </p>
            </section>

            <section>
              <h2 className="text-base font-semibold text-slate-900 sm:text-lg">Data accuracy responsibility</h2>
              <p className="mt-2">
                You are responsible for the accuracy and completeness of imported files and assumptions. Outputs depend on
                the quality of the data you provide.
              </p>
            </section>

            <section>
              <h2 className="text-base font-semibold text-slate-900 sm:text-lg">Service changes</h2>
              <p className="mt-2">
                Features and behavior may change over time as CollectionOps evolves. We may update or refine parts of the
                service without prior notice.
              </p>
            </section>

            <section>
              <h2 className="text-base font-semibold text-slate-900 sm:text-lg">Contact</h2>
              <p className="mt-2">
                Questions about these terms can be sent to{" "}
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
