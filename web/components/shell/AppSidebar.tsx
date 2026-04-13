"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { IconDashboard, IconHelp, IconImports, IconSettings, IconTrends } from "./NavIcons";

/** File must exist under web/public (see next.config images). */
const BRAND_LOGO_SRC = "/logo.svg";

const primaryNav: { href: string; caption: string; Icon: typeof IconDashboard }[] = [
  { href: "/dashboard", caption: "Dashboard", Icon: IconDashboard },
  { href: "/data", caption: "Imports", Icon: IconImports },
  { href: "/trends", caption: "Trends", Icon: IconTrends },
];

function navItemClass(active: boolean) {
  const base =
    "flex size-14 shrink-0 items-center justify-center rounded-full transition-[color,background-color,box-shadow,transform]";
  if (active) {
    return `${base} bg-white text-neutral-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.95),0_4px_12px_-2px_rgba(15,23,42,0.12),0_8px_20px_-6px_rgba(15,23,42,0.1)] ring-1 ring-inset ring-slate-200/90 ring-[color:var(--accent)]/20 dark:bg-slate-800 dark:text-white dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.1),0_6px_20px_-4px_rgba(0,0,0,0.45)] dark:ring-slate-600/85 dark:ring-[color:var(--accent)]/25`;
  }
  return `${base} text-neutral-900/70 shadow-[0_2px_8px_-2px_rgba(15,23,42,0.06)] ring-1 ring-inset ring-transparent hover:bg-slate-100/90 hover:text-neutral-900 hover:shadow-[0_4px_14px_-4px_rgba(15,23,42,0.12)] dark:text-slate-300/85 dark:shadow-[0_2px_10px_-2px_rgba(0,0,0,0.35)] dark:hover:bg-slate-800/75 dark:hover:text-slate-50 dark:hover:shadow-[0_6px_18px_-4px_rgba(0,0,0,0.5)]`;
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
      className="group flex flex-col items-center gap-1.5 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent)]/40"
    >
      <span className={navItemClass(active)}>
        <span className="flex size-8 shrink-0 items-center justify-center [&>svg]:block [&>svg]:size-full">
          <Icon className="size-8" strokeWidth={2.25} aria-hidden />
        </span>
      </span>
      <span
        className={`max-w-[5.5rem] px-0.5 text-center text-[10px] font-semibold leading-tight tracking-tight ${
          active
            ? "text-slate-900 dark:text-white"
            : "text-slate-500 group-hover:text-slate-800 dark:text-slate-400 dark:group-hover:text-slate-100"
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
    <>
      <Link
        href="/dashboard"
        className="fixed left-2 top-2 z-[60] flex shrink-0 rounded-md transition-opacity hover:opacity-90 active:opacity-80 focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent)]/40"
        aria-label="CardOps home"
      >
        <Image
          src={BRAND_LOGO_SRC}
          alt=""
          width={48}
          height={48}
          className="h-12 w-12 shrink-0 object-contain"
          sizes="48px"
          priority
          unoptimized
        />
      </Link>

      <aside
        className="fixed inset-y-0 left-0 z-40 flex w-28 shrink-0 flex-col border-r border-slate-200/90 bg-gradient-to-b from-white via-white to-slate-50/95 shadow-[inset_1px_0_0_rgba(255,255,255,0.95),inset_-1px_0_0_rgba(15,23,42,0.04),8px_0_32px_-4px_rgba(15,23,42,0.14),16px_0_48px_-8px_rgba(15,23,42,0.08)] dark:border-slate-800/90 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900/95 dark:shadow-[inset_1px_0_0_rgba(255,255,255,0.06),inset_-1px_0_0_rgba(0,0,0,0.35),10px_0_40px_-6px_rgba(0,0,0,0.55)]"
        aria-label="Sidebar"
      >
        <nav
          className="flex min-h-0 flex-1 flex-col items-center justify-start gap-6 pt-[4.25rem]"
          aria-label="Primary"
        >
          {primaryNav.map(({ href, caption, Icon }) => (
            <RailLink key={href} href={href} caption={caption} Icon={Icon} active={pathname === href} />
          ))}
        </nav>

        <div className="mt-auto flex w-full shrink-0 flex-col items-center gap-5 border-t border-slate-200/70 bg-white/50 px-1 pb-6 pt-5 dark:border-slate-800/70 dark:bg-slate-950/50">
          <RailLink
            href="/settings"
            caption="Settings"
            Icon={IconSettings}
            active={pathname === "/settings"}
          />
          <RailLink href="/help" caption="FAQs" Icon={IconHelp} active={pathname === "/help"} />
        </div>
      </aside>
    </>
  );
}
