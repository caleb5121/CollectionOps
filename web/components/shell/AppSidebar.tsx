"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { IconDashboard, IconImports, IconShipping, IconTrends } from "./NavIcons";

const primaryNav: { href: string; caption: string; Icon: typeof IconDashboard }[] = [
  { href: "/dashboard", caption: "Dashboard", Icon: IconDashboard },
  { href: "/data", caption: "Imports", Icon: IconImports },
  { href: "/trends", caption: "Trends", Icon: IconTrends },
  { href: "/settings/shipping", caption: "Shipping Settings", Icon: IconShipping },
];

function isPrimaryNavActive(href: string, pathname: string): boolean {
  if (href === "/settings/shipping") {
    return pathname === "/settings/shipping" || pathname === "/settings";
  }
  return pathname === href;
}

const navEase =
  "[transition:transform_200ms_cubic-bezier(0.23,1,0.32,1),box-shadow_200ms_cubic-bezier(0.23,1,0.32,1),background-color_200ms_cubic-bezier(0.23,1,0.32,1),color_200ms_cubic-bezier(0.23,1,0.32,1)]";

function navItemClass(active: boolean) {
  const base = `relative flex size-[3.35rem] shrink-0 items-center justify-center rounded-[var(--radius-card)] ${navEase}`;
  if (active) {
    return `${base} bg-[var(--surface-raised)] text-[color:var(--accent)] shadow-[var(--shadow-card),0_4px_20px_-8px_var(--accent-glow)] ring-2 ring-[color:var(--accent)]/35 ring-offset-2 ring-offset-[color-mix(in_oklab,var(--surface-muted)_75%,transparent)] dark:bg-stone-900 dark:text-[color:var(--accent)] dark:shadow-[0_8px_24px_-8px_rgba(0,0,0,0.5)] dark:ring-[color:var(--accent)]/40 dark:ring-offset-stone-900/90`;
  }
  return `${base} text-[color:var(--foreground-muted)] hover:scale-[1.03] hover:bg-[color:color-mix(in_oklab,var(--surface-muted)_88%,var(--accent-soft))] hover:text-[color:var(--foreground)] hover:shadow-[var(--shadow-card)] active:scale-[0.98] dark:hover:bg-stone-800/90 dark:hover:text-stone-100 dark:hover:shadow-[0_8px_22px_-10px_rgba(0,0,0,0.45)]`;
}

function RailLink({
  href,
  caption,
  Icon,
  active,
}: {
  href: string;
  caption: string;
  Icon: typeof IconDashboard;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      title={caption}
      aria-label={caption}
      aria-current={active ? "page" : undefined}
      className="group flex flex-col items-center gap-2 rounded-2xl py-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent)]/45 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent"
    >
      <span className={navItemClass(active)}>
        <span className="flex size-[1.65rem] shrink-0 items-center justify-center [&>svg]:block [&>svg]:size-full">
          <Icon className="size-[1.65rem]" strokeWidth={2.125} aria-hidden />
        </span>
      </span>
      <span
        className={`max-w-[5.75rem] px-0.5 text-center text-[11px] font-semibold leading-tight tracking-wide ${navEase} ${
          active
            ? "text-[color:var(--foreground)]"
            : "text-[color:var(--foreground-muted)] group-hover:text-[color:var(--foreground)] dark:group-hover:text-stone-100"
        }`}
      >
        {caption}
      </span>
    </Link>
  );
}

export default function AppSidebar() {
  const pathname = usePathname();

  return (
    <aside
      className="flex h-full min-h-0 w-full flex-col"
      aria-label="Sidebar"
    >
      <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-[var(--radius-card)] border border-[color-mix(in_oklab,var(--border-warm)_72%,transparent)] bg-[color-mix(in_oklab,var(--surface-raised)_97%,var(--surface-muted))] shadow-[var(--shadow-card-lift),0_16px_40px_-20px_rgba(26,155,127,0.06)] backdrop-blur-[8px] dark:border-stone-700/55 dark:bg-[color-mix(in_oklab,var(--surface-muted)_88%,transparent)] dark:shadow-[0_10px_36px_-14px_rgba(0,0,0,0.5),0_3px_12px_-6px_rgba(0,0,0,0.32)]">
        <nav
          className="flex min-h-0 flex-1 flex-col items-center justify-start gap-7 px-2 pb-6 pt-6 sm:gap-8 sm:pt-7"
          aria-label="Primary"
        >
          {primaryNav.map(({ href, caption, Icon }) => (
            <RailLink key={href} href={href} caption={caption} Icon={Icon} active={isPrimaryNavActive(href, pathname)} />
          ))}
        </nav>
      </div>
    </aside>
  );
}
