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
  contentClassName,
  children,
}: {
  description?: string;
  /** Merged into the description paragraph (e.g. help page subtitle tone). */
  descriptionClassName?: string;
  /** When there is no `action`, replaces default `mb-6 sm:mb-8` on the page header. */
  descriptionHeaderClassName?: string;
  action?: ReactNode;
  maxWidth?: PageShellMaxWidth;
  /** Override default horizontal/vertical padding (e.g. tighter dashboard pages). */
  contentClassName?: string;
  children: ReactNode;
}) {
  const maxW = MAX_WIDTH[maxWidth];
  const padding = contentClassName ?? PAGE_SHELL_CONTENT_PADDING;

  return (
    <div className="min-h-full">
      <div className={`mx-auto w-full ${maxW} ${padding}`}>
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

/** Page intro card — default blue, or dark navy to match the dashboard hero. */
export function PageIntroGradient({
  title: heading,
  children,
  className = "",
  size = "default",
  tone = "blue",
}: {
  title: string;
  children?: ReactNode;
  className?: string;
  /** `strip` = low-height label bar; `compact` = denser card; `default` = standard. */
  size?: "default" | "compact" | "strip";
  tone?: "blue" | "dark";
}) {
  const shell =
    size === "strip"
      ? "rounded-lg border border-slate-200/80 px-4 py-2.5 shadow-sm dark:border-slate-700/70 sm:rounded-xl sm:px-4 sm:py-3"
      : size === "compact"
        ? "rounded-xl border border-slate-200/80 p-4 shadow-sm dark:border-slate-700/70 sm:rounded-xl sm:p-5"
        : "rounded-xl border border-slate-200/80 p-6 shadow-[0_1px_0_rgba(255,255,255,0.2)_inset,0_2px_8px_-2px_rgba(0,0,0,0.12),0_12px_32px_-8px_rgba(30,58,138,0.35)] dark:border-slate-700/70 sm:rounded-2xl sm:p-8";
  const titleClass =
    size === "strip"
      ? "text-base font-bold tracking-tight text-white sm:text-lg"
      : size === "compact"
        ? "text-base font-bold tracking-tight text-white sm:text-lg"
        : "text-lg font-bold tracking-tight text-white sm:text-xl";
  const bg =
    tone === "dark"
      ? "bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950"
      : "bg-gradient-to-br from-blue-600 via-blue-600 to-blue-800";
  return (
    <div className={`relative overflow-hidden ${bg} ${shell} ${className}`}>
      {tone === "dark" ? (
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_20%_0%,rgba(45,212,191,0.12),transparent_55%)]"
          aria-hidden
        />
      ) : (
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.08]"
          style={{
            backgroundImage:
              "repeating-linear-gradient(-45deg, transparent, transparent 8px, rgba(255,255,255,0.06) 8px, rgba(255,255,255,0.06) 9px)",
          }}
        />
      )}
      <div className="relative">
        <h2 className={titleClass}>{heading}</h2>
        {children != null ? (
          <div
            className={`text-white/85 ${size === "strip" ? "mt-1 text-xs leading-snug" : size === "compact" ? "mt-1.5 text-xs leading-relaxed sm:text-sm" : "mt-2 text-sm leading-relaxed"}`}
          >
            {children}
          </div>
        ) : null}
      </div>
    </div>
  );
}
