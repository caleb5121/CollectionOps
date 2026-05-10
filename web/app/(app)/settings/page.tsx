import { redirect } from "next/navigation";

/** Canonical shipping / baseline costs UI lives under `/settings/shipping`. */
export default function SettingsIndexPage() {
  redirect("/settings/shipping");
}
