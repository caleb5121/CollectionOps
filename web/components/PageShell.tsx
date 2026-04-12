import type { ReactNode } from "react";

export type PageShellMaxWidth = "narrow" | "wide" | "wide-xl" | "full";

/** ~1280px - shared by Dashboard, Settings, Account, Help. */
export const PAGE_SHELL_MAX_WIDTH_WIDE = "max-w-7xl";

/**
 * Centered content width + horizontal padding (matches Dashboard).
 * Vertical rhythm: py-8 / sm:py-10 with 20–32px horizontal padding.
 */
/** 24px / 32px horizontal - aligns to 8px spacing scale */
export const PAGE_SHELL_CONTENT_PADDING = "px-6 py-8 sm:px-8 lg:px-10 sm:py-10";

const MAX_WIDTH: Record<PageShellMaxWidth, string> = {
  narrow: "max-w-2xl",
  /** Primary app pages - same width as Dashboard */
  wide: PAGE_SHELL_MAX_WIDTH_WIDE,
  /** Imports, Trends - extra horizontal room for dense layouts */
  "wide-xl": "max-w-screen-2xl",
  /** Nearly full main column */
  full: "max-w-[1680px]",
};

/**
 * Page content wrapper. Title + date live in MainToolbar (Figma shell); this handles description,
 * optional actions (filters), and max width.
 */
export default function PageShell({
  description,
  descriptionClassName,
  descriptionHeaderClassName,
  action,
  maxWidth = "wide",
  children,
}: {
  description?: string;
  /** Merged into the description paragraph (e.g. help page subtitle tone). */
  descriptionClassName?: string;
  /** When there is no `action`, replaces default `mb-6 sm:mb-8` on the page header. */
  descriptionHeaderClassName?: string;
  action?: ReactNode;
  maxWidth?: PageShellMaxWidth;
  children: ReactNode;
}) {
  const maxW = MAX_WIDTH[maxWidth];

  return (
    <div className="min-h-full">
      <div className={`mx-auto w-full ${maxW} ${PAGE_SHELL_CONTENT_PADDING}`}>
        {description || action ? (
          <header
            className={
              action
                ? "mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-start sm:justify-between"
                : descriptionHeaderClassName ?? "mb-6 sm:mb-8"
            }
          >
            <div>
              {description ? (
                <p
                  className={`max-w-3xl font-normal ${descriptionClassName ?? "text-sm leading-relaxed text-slate-500 dark:text-slate-400"}`}
                >
                  {description}
                </p>
              ) : null}
            </div>
            {action ? <div className="flex shrink-0 items-center gap-2 sm:pt-0.5">{action}</div> : null}
          </header>
        ) : null}
        {children}
      </div>
    </div>
  );
}

/** Blue gradient intro card - same visual language as Settings / Imports synced banner. */
export function PageIntroGradient({
  title: heading,
  children,
  className = "",
}: {
  title: string;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-600 via-blue-600 to-blue-800 p-6 shadow-[0_1px_0_rgba(255,255,255,0.25)_inset,0_4px_6px_-1px_rgba(0,0,0,0.12),0_20px_50px_-12px_rgba(30,58,138,0.45),0_32px_64px_-16px_rgba(15,23,42,0.2)] sm:p-8 ${className}`}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.12]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(-45deg, transparent, transparent 8px, rgba(255,255,255,0.06) 8px, rgba(255,255,255,0.06) 9px)",
        }}
      />
      <div className="relative">
        <h2 className="text-lg font-bold tracking-tight text-white sm:text-xl">{heading}</h2>
        {children != null ? (
          <div className="mt-2 text-sm leading-relaxed text-white/85">{children}</div>
        ) : null}
      </div>
    </div>
  );
}
