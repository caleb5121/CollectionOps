import type { Metadata } from "next";

import LocalEmailAuthCard from "@/components/auth/LocalEmailAuthCard";

export const metadata: Metadata = {
  title: "Create account — CollectionOps",
  description: "Create a CollectionOps account with your email.",
};

export default function SignupPage() {
  return (
    <main className="flex min-h-dvh flex-col bg-[var(--app-canvas-a)] text-[var(--foreground)] dark:bg-slate-950">
      <div className="flex flex-1 flex-col items-center justify-center px-4 py-12">
        <LocalEmailAuthCard
          title="Create account"
          description="Enter your email and we will send a link to create your account. You can set your store name after you sign in."
          submitLabel="Email me a link"
          otpKind="signup"
          alternate={{ lead: "Already have an account?", href: "/login", label: "Log in" }}
        />
      </div>
    </main>
  );
}
