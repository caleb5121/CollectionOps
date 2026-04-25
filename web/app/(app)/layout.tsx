import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";

import AppAuthenticatedLayout from "../../components/shell/AppAuthenticatedLayout";
import { DEV_ACCESS_COOKIE, isLocalDevelopmentRequestHost } from "../../lib/devAccess";
import { createSupabaseServerClient } from "../../lib/supabase/server";

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

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user && middlewareDemoAllowed) {
    return <AppAuthenticatedLayout>{children}</AppAuthenticatedLayout>;
  }
  if (!user) {
    redirect("/login");
  }

  return <AppAuthenticatedLayout>{children}</AppAuthenticatedLayout>;
}
