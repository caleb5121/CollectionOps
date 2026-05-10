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
  const base = `relative flex size-[3.35rem] shrink-0 items-center justify-center overflow-visible rounded-[var(--radius-card)] ${navEase}`;
  if (active) {
    return `${base} text-[color:var(--accent)] shadow-[inset_0_1px_0_rgba(255,255,255,0.72),0_0_0_1px_color-mix(in_oklab,var(--accent)_20%,var(--border-warm)),0_10px_28px_-10px_var(--accent-glow)] before:pointer-events-none before:absolute before:left-1 before:top-1/2 before:z-10 before:h-[2.45rem] before:w-[3px] before:-translate-y-1/2 before:rounded-full before:bg-[color:var(--accent)] before:shadow-[0_0_16px_var(--accent-glow)] before:content-[''] dark:bg-[linear-gradient(145deg,color-mix(in_oklab,var(--accent-soft)_42%,var(--surface-muted))_0%,var(--surface-muted)_100%)] dark:text-[color:var(--accent)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_0_0_1px_color-mix(in_oklab,var(--accent)_22%,transparent),0_12px_32px_-12px_rgba(0,0,0,0.55),0_0_36px_-14px_var(--accent-glow)] dark:before:bg-[color:var(--accent)] bg-[linear-gradient(145deg,color-mix(in_oklab,var(--accent-soft)_55%,var(--surface-raised))_0%,var(--surface-raised)_100%)]`;
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
      className="group flex flex-col items-center gap-2 overflow-visible rounded-2xl py-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent)]/45 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent"
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
      <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-[var(--radius-card-lg)] border border-[color-mix(in_oklab,var(--border-warm)_68%,transparent)] bg-[color-mix(in_oklab,var(--surface-raised)_97%,var(--surface-muted))] shadow-[var(--shadow-card-lift),0_18px_48px_-22px_rgba(26,155,127,0.07)] backdrop-blur-[10px] dark:border-stone-700/55 dark:bg-[color-mix(in_oklab,var(--surface-muted)_88%,transparent)] dark:shadow-[0_12px_40px_-16px_rgba(0,0,0,0.52),0_3px_14px_-6px_rgba(0,0,0,0.35)]">
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
