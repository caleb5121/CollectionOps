/** Map route pathname → toolbar title (Figma shell). */
export function getPageTitle(pathname: string): string {
  const map: Record<string, string> = {
    "/dashboard": "Dashboard",
    "/login": "Log in",
    "/signup": "Create account",
    "/data": "Imports",
    "/trends": "Trends",
    "/settings": "Settings",
    "/help": "Help & FAQs",
    "/account": "Account",
  };
  return map[pathname] ?? "CardOps";
}

/** Format like "11 March 2026" (matches Figma date picker label). */
export function formatToolbarDate(d: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(d);
}
