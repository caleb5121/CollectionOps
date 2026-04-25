import { redirect } from "next/navigation";

import AppAuthenticatedLayout from "../../components/shell/AppAuthenticatedLayout";
import { createSupabaseServerClient } from "../../lib/supabase/server";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    redirect("/login");
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  return <AppAuthenticatedLayout>{children}</AppAuthenticatedLayout>;
}
