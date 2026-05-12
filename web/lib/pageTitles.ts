/** Map route pathname → toolbar title (Figma shell). */
export function getPageTitle(pathname: string): string {
  const map: Record<string, string> = {
    "/dashboard": "Dashboard",
    "/login": "Log in",
    "/signup": "Create account",
    "/data": "Imports",
    "/trends": "Trends",
    "/settings": "Shipping Settings",
    "/settings/shipping": "Shipping Settings",
    "/help": "Help Center",
    "/help/getting-your-csvs": "Getting your CSVs",
    "/help/faq": "FAQ",
    "/account": "Account",
  };
  return map[pathname] ?? "CollectionOps";
}

/** Format like "11 March 2026" (matches Figma date picker label). */
export function formatToolbarDate(d: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(d);
}
