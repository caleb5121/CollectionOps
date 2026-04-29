import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";

import AppAuthenticatedLayout from "../../components/shell/AppAuthenticatedLayout";
import { DEV_ACCESS_COOKIE, isLocalDevelopmentRequestHost } from "../../lib/devAccess";
import { createSupabaseServerClient } from "../../lib/supabase/server";

function isMissingSessionError(error: unknown): boolean {
  const maybe = error as { name?: string; message?: string; code?: string } | null;
  const message = (maybe?.message ?? "").toLowerCase();
  const name = (maybe?.name ?? "").toLowerCase();
  const code = (maybe?.code ?? "").toLowerCase();
  return (
    message.includes("auth session missing") ||
    name.includes("authsessionmissingerror") ||
    code === "auth_session_missing"
  );
}

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const headerStore = await headers();
  const cookieStore = await cookies();
  const host = headerStore.get("host");
  const devCookie = cookieStore.get(DEV_ACCESS_COOKIE)?.value ?? "";
  const isLocalDevBypass = isLocalDevelopmentRequestHost(host) && ["caleb", "empty", "demo"].includes(devCookie);
  const middlewareDemoAllowed = headerStore.get("x-cardops-demo-allowed") === "1";
  if (isLocalDevBypass) {
    return <AppAuthenticatedLayout>{children}</AppAuthenticatedLayout>;
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    redirect("/login");
  }

  let user = null;
  try {
    const result = await supabase.auth.getUser();
    user = result.data.user;
  } catch (error) {
    if (!isMissingSessionError(error) && process.env.NODE_ENV === "development") {
      console.error("Failed to resolve Supabase auth user in app layout", error);
    }
  }
  if (!user && middlewareDemoAllowed) {
    return <AppAuthenticatedLayout>{children}</AppAuthenticatedLayout>;
  }
  if (!user) {
    redirect("/login");
  }

  return <AppAuthenticatedLayout>{children}</AppAuthenticatedLayout>;
}
