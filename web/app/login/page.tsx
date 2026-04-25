import type { Metadata } from "next";

import LocalEmailAuthCard from "@/components/auth/LocalEmailAuthCard";

export const metadata: Metadata = {
  title: "Log in — CollectionOps",
  description: "Sign in to CollectionOps with your email.",
};

export default function LoginPage() {
  return (
    <main className="flex min-h-dvh flex-col bg-[var(--app-canvas-a)] text-[var(--foreground)] dark:bg-slate-950">
      <div className="flex flex-1 flex-col items-center justify-center px-4 py-12">
        <LocalEmailAuthCard
          title="Log in"
          description="We will email you a secure magic link. Use the same email you use for your store."
          submitLabel="Email me a link"
          otpKind="login"
          alternate={{ lead: "New here?", href: "/signup", label: "Create account" }}
        />
      </div>
    </main>
  );
}
