"use client";

import Image from "next/image";
import { useCallback, useMemo, useRef, useState, type ReactNode } from "react";
import { accountDisplayName, type AppUser, useAuth } from "../../../components/AuthProvider";
import { useAccountPreferences } from "../../../components/AccountPreferencesProvider";
import Card from "../../../components/Card";
import { useData } from "../../../components/DataProvider";
import PageShell from "../../../components/PageShell";
import ShippingProfitPopover from "../../../components/ShippingProfitPopover";
import ThemeToggle from "../../../components/shell/ThemeToggle";
import { GAME_FILTER_OPTIONS, type GameFilterValue } from "../../../lib/games";
import { aggregateWorkspaceDateRange, formatImportRangeLabel } from "../../../lib/importMetadata";
import type { DateFormatId } from "../../../lib/accountPreferences";
import { resizeImageToJpegDataUrl } from "../../../lib/profileImage";

type ProfileDraft = Pick<AppUser, "storeName" | "email" | "avatarDataUrl">;

const TIMEZONES = [
  { value: "America/Los_Angeles", label: "Pacific Time (US & Canada)" },
  { value: "America/Denver", label: "Mountain Time (US & Canada)" },
  { value: "America/Chicago", label: "Central Time (US & Canada)" },
  { value: "America/New_York", label: "Eastern Time (US & Canada)" },
  { value: "America/Phoenix", label: "Arizona" },
  { value: "Europe/London", label: "London" },
  { value: "Europe/Paris", label: "Paris" },
  { value: "Asia/Tokyo", label: "Tokyo" },
  { value: "Australia/Sydney", label: "Sydney" },
] as const;

const CURRENCIES = [
  { value: "USD", label: "USD - US Dollar" },
  { value: "EUR", label: "EUR - Euro" },
  { value: "GBP", label: "GBP - British Pound" },
  { value: "CAD", label: "CAD - Canadian Dollar" },
  { value: "AUD", label: "AUD - Australian Dollar" },
  { value: "JPY", label: "JPY - Japanese Yen" },
] as const;

const DATE_FORMATS: { value: DateFormatId; label: string }[] = [
  { value: "locale", label: "System default" },
  { value: "mdy", label: "MM/DD/YYYY" },
  { value: "dmy", label: "DD/MM/YYYY" },
  { value: "ymd", label: "YYYY-MM-DD" },
];

function formatJoinedDate(iso: string, dateFormat: DateFormatId): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "-";
  if (dateFormat === "mdy") {
    return new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric", year: "numeric" }).format(d);
  }
  if (dateFormat === "dmy") {
    return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric" }).format(d);
  }
  if (dateFormat === "ymd") {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }
  return new Intl.DateTimeFormat(undefined, { month: "long", day: "numeric", year: "numeric" }).format(d);
}

function escapeCsvCell(s: string): string {
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function CalcToggle({
  id,
  label,
  checked,
  onChange,
  disabled,
  info,
  subtext,
  microFeedback,
}: {
  id: string;
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
  info?: ReactNode;
  subtext?: ReactNode;
  microFeedback?: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-2.5">
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex items-center gap-1.5">
          <label htmlFor={id} className="text-sm font-medium text-slate-800 dark:text-slate-100">
            {label}
          </label>
          {info}
        </div>
        {subtext ? (
          <p className="max-w-[min(100%,20rem)] text-[10px] leading-snug tracking-wide text-slate-500/95 dark:text-slate-400/90">
            {subtext}
          </p>
        ) : null}
        {microFeedback ? (
          <p className="text-[10px] leading-tight tracking-wide">{microFeedback}</p>
        ) : null}
      </div>
      <button
        type="button"
        id={id}
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => !disabled && onChange(!checked)}
        className={`relative mt-1 inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent)]/40 disabled:cursor-not-allowed disabled:opacity-50 ${
          checked
            ? "border-teal-600 bg-teal-600 dark:border-teal-500 dark:bg-teal-600"
            : "border-slate-300 bg-slate-200 dark:border-slate-600 dark:bg-slate-700"
        }`}
      >
        <span
          className={`pointer-events-none inline-block h-6 w-6 translate-y-px rounded-full bg-white shadow transition ${
            checked ? "translate-x-5" : "translate-x-0.5"
          }`}
        />
      </button>
    </div>
  );
}

function StatBlock({
  label,
  value,
  valueClassName = "text-slate-900 dark:text-slate-50",
}: {
  label: string;
  value: string;
  valueClassName?: string;
}) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</p>
      <p className={`mt-1 text-xl font-semibold tabular-nums tracking-tight ${valueClassName}`}>{value}</p>
    </div>
  );
}

export default function AccountPage() {
  const { user, updateProfile } = useAuth();
  const { prefs, ready: prefsReady, updatePrefs } = useAccountPreferences();
  const {
    effectiveOrderImports,
    effectiveSummaryImports,
    lastImportDate,
    resetAll,
    derived,
    orderMetrics,
  } = useData();

  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [resetConfirmText, setResetConfirmText] = useState("");

  const [draft, setDraft] = useState<ProfileDraft>({
    storeName: "",
    email: "",
    avatarDataUrl: null,
  });
  const [editMode, setEditMode] = useState(false);
  const [profileNotice, setProfileNotice] = useState<string | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);

  const totalImportFiles = effectiveOrderImports.length + effectiveSummaryImports.length;

  const workspaceRange = useMemo(
    () => aggregateWorkspaceDateRange(effectiveOrderImports, effectiveSummaryImports),
    [effectiveOrderImports, effectiveSummaryImports]
  );

  const dataRangeLabel = useMemo(() => {
    if (!workspaceRange) return "-";
    return formatImportRangeLabel(workspaceRange.from, workspaceRange.to);
  }, [workspaceRange]);

  const lastUploadStat = useMemo(() => {
    if (!lastImportDate) return "-";
    return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(lastImportDate);
  }, [lastImportDate]);

  const ordersProcessed = orderMetrics?.orders ?? derived.orders ?? 0;
  const revenueAnalyzed = derived.grossSales ?? 0;

  const joinedDisplay = user ? formatJoinedDate(user.joinedAtIso, prefs.dateFormat) : "-";

  const selectClass =
    "app-inset-well w-full rounded-xl border border-slate-200/90 bg-white px-3 py-2 text-sm text-slate-900 transition-[box-shadow,border-color] focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400/25 dark:border-slate-600/90 dark:bg-slate-950/80 dark:text-slate-100";

  const secondaryBtnClass =
    "app-panel-3d inline-flex items-center justify-center rounded-xl border border-slate-200/90 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition-[transform,background-color] hover:bg-slate-50/95 active:translate-y-px disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-600/80 dark:bg-slate-900/80 dark:text-slate-200 dark:hover:bg-slate-800/90";

  const exportCsvBtnClass =
    "inline-flex items-center justify-center rounded-lg border border-slate-200/70 bg-white/70 px-3 py-2 text-xs font-medium text-slate-600 shadow-none transition-colors hover:border-slate-300/90 hover:bg-slate-50/90 hover:text-slate-700 dark:border-slate-600/60 dark:bg-slate-900/50 dark:text-slate-400 dark:hover:border-slate-500/70 dark:hover:bg-slate-800/70 dark:hover:text-slate-300";

  const dangerOutlineBtnClass =
    "inline-flex items-center justify-center rounded-xl border border-red-200/90 bg-white px-4 py-2.5 text-sm font-medium text-red-700 transition-[transform,background-color] hover:bg-red-50/90 active:translate-y-px dark:border-red-900/50 dark:bg-slate-900/40 dark:text-red-400 dark:hover:bg-red-950/40";

  const primaryBtnClass =
    "inline-flex items-center justify-center rounded-xl border border-teal-600 bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-700 dark:border-teal-500 dark:bg-teal-600 dark:hover:bg-teal-500";

  const disabledCloudTitle = "Not available in this build";

  const revenueDisplay =
    revenueAnalyzed > 0
      ? revenueAnalyzed.toLocaleString(undefined, { style: "currency", currency: prefs.currency })
      : "-";

  const exportFullReportCsv = useCallback(() => {
    const rows: string[][] = [
      ["CardOps export", new Date().toISOString()],
      ["Section", "Field", "Value"],
      ["Workspace", "Orders processed (order list rows)", String(ordersProcessed)],
      ["Workspace", "Revenue analyzed (gross)", revenueAnalyzed.toFixed(2)],
      ["Workspace", "Data date range", dataRangeLabel],
      ["Workspace", "Last upload", lastUploadStat],
      ["Workspace", "Import file count", String(totalImportFiles)],
      ["Profile", "Store name", user?.storeName ?? ""],
      ["Profile", "Email", user?.email ?? ""],
      ["Profile", "Primary game", prefs.primaryGame],
      ["Preferences", "Include shipping in profit", String(prefs.includeShippingInProfit)],
    ];
    const body = rows.map((r) => r.map((c) => escapeCsvCell(c)).join(",")).join("\r\n");
    const blob = new Blob([body], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `cardops-report-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [
    ordersProcessed,
    revenueAnalyzed,
    dataRangeLabel,
    lastUploadStat,
    totalImportFiles,
    user?.storeName,
    user?.email,
    prefs,
  ]);

  const canConfirmReset = resetConfirmText.trim().toLowerCase() === "reset";

  const performReset = useCallback(() => {
    resetAll();
    setResetModalOpen(false);
    setResetConfirmText("");
  }, [resetAll]);

  const beginEdit = () => {
    if (!user) return;
    setDraft({
      storeName: user.storeName,
      email: user.email,
      avatarDataUrl: user.avatarDataUrl,
    });
    setEditMode(true);
  };

  const cancelEdit = () => {
    setEditMode(false);
  };

  const saveProfileEdits = () => {
    if (!user) return;
    updateProfile({
      storeName: draft.storeName.trim(),
      email: draft.email.trim(),
      avatarDataUrl: draft.avatarDataUrl,
    });
    setEditMode(false);
    setProfileNotice("Saved on this device.");
    window.setTimeout(() => setProfileNotice(null), 4000);
  };

  const onPhotoSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!user) return;
    if (!file?.type.startsWith("image/")) return;
    const dataUrl = await resizeImageToJpegDataUrl(file);
    if (!dataUrl) {
      setProfileNotice("Could not use that image. Try a smaller JPG or PNG.");
      window.setTimeout(() => setProfileNotice(null), 4500);
      return;
    }
    updateProfile({ avatarDataUrl: dataUrl });
    setDraft((d) => ({ ...d, avatarDataUrl: dataUrl }));
    setProfileNotice("Photo updated.");
    window.setTimeout(() => setProfileNotice(null), 3500);
  };

  const avatarSrc = editMode ? draft.avatarDataUrl : user?.avatarDataUrl;

  return (
    <PageShell maxWidth="wide">
      <div className="space-y-7">
        {/* 1. Data / workspace summary */}
        <Card className="border-[color:var(--accent)]/20 bg-gradient-to-br from-[color:var(--accent-soft)]/50 via-white to-sky-50/40 p-5 shadow-sm dark:via-slate-900/80 dark:to-slate-950/90 sm:p-6">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-[color:var(--accent)] dark:text-teal-300/90">
              Data
            </h2>
            <p className="text-xs font-medium text-slate-600 dark:text-slate-300">Workspace · Local</p>
          </div>
          <div className="mt-5 grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-3 lg:grid-cols-5">
            <StatBlock label="Orders processed" value={String(ordersProcessed)} />
            <StatBlock
              label="Revenue analyzed"
              value={revenueDisplay}
              valueClassName="text-[color:var(--accent)] dark:text-teal-300"
            />
            <StatBlock label="Date range" value={dataRangeLabel} />
            <StatBlock label="Last upload" value={lastUploadStat} />
            <StatBlock label="Files imported" value={String(totalImportFiles)} />
          </div>
          <div className="mt-5 flex justify-end border-t border-slate-200/60 pt-4 dark:border-slate-700/50">
            <button type="button" onClick={exportFullReportCsv} className={exportCsvBtnClass}>
              Export CSV
            </button>
          </div>
        </Card>

        {/* 2. Calculations */}
        <Card className="border-[color:var(--accent)]/25 bg-gradient-to-br from-[color:var(--accent-soft)] via-white to-emerald-50/35 p-5 shadow-sm dark:via-slate-900/85 dark:to-emerald-950/25 sm:p-6">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-[color:var(--accent)] dark:text-teal-300/90">
            Calculations
          </h2>
          <div className="mt-3">
            <CalcToggle
              id="pref-shipping-net"
              label="Include shipping in profit"
              info={<ShippingProfitPopover />}
              subtext={
                <>
                  <span className="font-medium text-teal-700 dark:text-teal-400">ON</span>
                  <span className="text-slate-500 dark:text-slate-400"> = money after shipping · </span>
                  <span className="font-medium text-slate-600 dark:text-slate-300">OFF</span>
                  <span className="text-slate-500 dark:text-slate-400"> = before shipping</span>
                </>
              }
              microFeedback={
                prefs.includeShippingInProfit ? (
                  <span className="font-medium text-teal-700/85 dark:text-teal-400/90">Real profit</span>
                ) : (
                  <span className="text-slate-500 dark:text-slate-500">Before shipping</span>
                )
              }
              checked={prefs.includeShippingInProfit}
              onChange={(v) => updatePrefs({ includeShippingInProfit: v })}
              disabled={!prefsReady}
            />
          </div>
        </Card>

        {/* 3. Account */}
        <Card className="border-violet-200/60 bg-gradient-to-br from-violet-50/70 via-white to-white p-5 shadow-sm dark:border-violet-900/35 dark:from-violet-950/30 dark:via-slate-900/80 dark:to-slate-950/90 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-violet-700 dark:text-violet-300/90">
              Account
            </h2>
            {user && !editMode ? (
              <button
                type="button"
                onClick={beginEdit}
                className="text-sm font-semibold text-[color:var(--accent)] hover:underline dark:text-teal-400"
              >
                Edit profile
              </button>
            ) : null}
          </div>
          <input
            ref={photoInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="sr-only"
            onChange={onPhotoSelected}
          />
          {profileNotice ? (
            <p className="mt-3 rounded-lg border border-teal-200/80 bg-teal-50/90 px-3 py-2 text-sm font-medium text-teal-950 dark:border-teal-900/50 dark:bg-teal-950/40 dark:text-teal-100">
              {profileNotice}
            </p>
          ) : null}
          <div className="mt-4 flex flex-col gap-5 sm:flex-row sm:items-start">
            <div className="flex shrink-0 flex-col items-center gap-2 sm:items-start">
              <div className="relative h-16 w-16 overflow-hidden rounded-full border border-slate-200/90 bg-gradient-to-br from-slate-50 to-slate-100 shadow-md ring-2 ring-white dark:border-slate-600/80 dark:from-slate-800 dark:to-slate-900 dark:ring-slate-900/80">
                {avatarSrc ? (
                  <img src={avatarSrc} alt="" className="h-full w-full object-cover" />
                ) : (
                  <Image
                    src="/logo.svg"
                    alt=""
                    width={64}
                    height={64}
                    className="h-full w-full object-contain p-2"
                    priority
                    unoptimized
                  />
                )}
              </div>
              <button
                type="button"
                disabled={!user}
                onClick={() => photoInputRef.current?.click()}
                className={`${secondaryBtnClass} text-xs disabled:opacity-50`}
              >
                Change photo
              </button>
            </div>
            <div className="min-w-0 flex-1">
              {!user ? (
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Sign in from the toolbar to manage your store name, email, and photo.
                </p>
              ) : editMode ? (
                <>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1 sm:col-span-2">
                      <label htmlFor="profile-display" className="text-xs font-medium text-slate-600 dark:text-slate-400">
                        Store name
                      </label>
                      <input
                        id="profile-display"
                        type="text"
                        autoComplete="organization"
                        placeholder="Your store or seller name"
                        value={draft.storeName}
                        onChange={(e) => setDraft((d) => ({ ...d, storeName: e.target.value }))}
                        className={selectClass}
                      />
                    </div>
                    <div className="space-y-1 sm:col-span-2">
                      <label htmlFor="profile-email" className="text-xs font-medium text-slate-600 dark:text-slate-400">
                        Email
                      </label>
                      <input
                        id="profile-email"
                        type="email"
                        autoComplete="email"
                        placeholder="Optional"
                        value={draft.email}
                        onChange={(e) => setDraft((d) => ({ ...d, email: e.target.value }))}
                        className={selectClass}
                      />
                    </div>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button type="button" onClick={saveProfileEdits} className={primaryBtnClass}>
                      Save
                    </button>
                    <button type="button" onClick={cancelEdit} className={secondaryBtnClass}>
                      Cancel
                    </button>
                  </div>
                </>
              ) : (
                <div className="space-y-1 text-center sm:text-left">
                  <p
                    className="truncate text-lg font-semibold tracking-tight text-slate-900 dark:text-slate-50"
                    title={accountDisplayName(user)}
                  >
                    {accountDisplayName(user)}
                  </p>
                  <p
                    className="truncate text-sm text-slate-600 dark:text-slate-400"
                    title={user.email.trim() ? user.email : undefined}
                  >
                    {user.email.trim() || "—"}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-500">
                    Member since <span className="tabular-nums text-slate-600 dark:text-slate-400">{joinedDisplay}</span>
                  </p>
                </div>
              )}
            </div>
          </div>
        </Card>

        {/* 4. Advanced (collapsed by default) */}
        <details className="group rounded-2xl border border-sky-200/70 bg-gradient-to-br from-sky-50/60 via-white to-white shadow-sm open:shadow-md dark:border-sky-900/40 dark:from-sky-950/25 dark:via-slate-900/80 dark:to-slate-950/90">
          <summary className="cursor-pointer list-none px-5 py-4 text-sm font-semibold text-sky-900 dark:text-sky-200/95 sm:px-6 [&::-webkit-details-marker]:hidden">
            <span className="flex items-center justify-between gap-2">
              Advanced preferences
              <span className="text-sky-500 transition group-open:rotate-180 dark:text-sky-400/80" aria-hidden>
                ▼
              </span>
            </span>
          </summary>
          <div className="border-t border-slate-200/70 px-5 pb-6 pt-5 dark:border-slate-700/60 sm:px-6">
            <div className="grid gap-6 sm:grid-cols-2">
              <div className="space-y-2.5 sm:col-span-2">
                <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Theme</span>
                <ThemeToggle />
              </div>
              <div className="space-y-1">
                <label htmlFor="acct-timezone" className="text-xs font-medium text-slate-600 dark:text-slate-400">
                  Timezone
                </label>
                <select
                  id="acct-timezone"
                  className={selectClass}
                  value={prefs.timezone}
                  onChange={(e) => updatePrefs({ timezone: e.target.value })}
                  disabled={!prefsReady}
                >
                  {TIMEZONES.map((tz) => (
                    <option key={tz.value} value={tz.value}>
                      {tz.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label htmlFor="acct-currency" className="text-xs font-medium text-slate-600 dark:text-slate-400">
                  Currency
                </label>
                <select
                  id="acct-currency"
                  className={selectClass}
                  value={prefs.currency}
                  onChange={(e) => updatePrefs({ currency: e.target.value })}
                  disabled={!prefsReady}
                >
                  {CURRENCIES.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1 sm:col-span-2">
                <label htmlFor="acct-datefmt" className="text-xs font-medium text-slate-600 dark:text-slate-400">
                  Date format
                </label>
                <select
                  id="acct-datefmt"
                  className={selectClass}
                  value={prefs.dateFormat}
                  onChange={(e) => updatePrefs({ dateFormat: e.target.value as DateFormatId })}
                  disabled={!prefsReady}
                >
                  {DATE_FORMATS.map((df) => (
                    <option key={df.value} value={df.value}>
                      {df.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1 sm:col-span-2">
                <label htmlFor="primary-game" className="text-xs font-medium text-slate-600 dark:text-slate-400">
                  Primary game (labels)
                </label>
                <select
                  id="primary-game"
                  className={selectClass}
                  value={prefs.primaryGame}
                  onChange={(e) => updatePrefs({ primaryGame: e.target.value as GameFilterValue })}
                  disabled={!prefsReady}
                >
                  {GAME_FILTER_OPTIONS.map((g) => (
                    <option key={g} value={g}>
                      {g}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </details>

        {/* 5. Danger */}
        <div className="rounded-2xl border border-red-200/90 bg-red-50/40 p-5 dark:border-red-900/45 dark:bg-red-950/20 sm:p-6">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-red-800 dark:text-red-300">Danger</h2>
          <p className="mt-3 max-w-xl text-sm text-red-900/85 dark:text-red-200/90">Permanent for this workspace.</p>
          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <button
              type="button"
              onClick={() => setResetModalOpen(true)}
              disabled={totalImportFiles === 0}
              title={totalImportFiles === 0 ? "Nothing imported yet" : undefined}
              className={dangerOutlineBtnClass}
            >
              Reset data
            </button>
            <button type="button" disabled title={disabledCloudTitle} className={dangerOutlineBtnClass}>
              Delete account
            </button>
          </div>
        </div>
      </div>

      {resetModalOpen ? (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="reset-modal-title"
        >
          <div className="app-card-3d max-w-md rounded-2xl border border-slate-200/90 bg-white p-6 shadow-2xl dark:border-slate-700/80 dark:bg-slate-900/95">
            <h3 id="reset-modal-title" className="text-lg font-semibold text-slate-900 dark:text-slate-50">
              Reset all data?
            </h3>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
              Removes every import from this browser. This cannot be undone.
            </p>
            <label htmlFor="reset-confirm" className="mt-4 block text-xs font-medium text-slate-600 dark:text-slate-400">
              Type <span className="font-mono text-slate-800 dark:text-slate-200">reset</span> to confirm
            </label>
            <input
              id="reset-confirm"
              type="text"
              autoComplete="off"
              value={resetConfirmText}
              onChange={(e) => setResetConfirmText(e.target.value)}
              className={`${selectClass} mt-1.5`}
              placeholder="reset"
            />
            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setResetModalOpen(false);
                  setResetConfirmText("");
                }}
                className={secondaryBtnClass}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!canConfirmReset}
                onClick={performReset}
                className="inline-flex items-center justify-center rounded-xl border border-red-600 bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Reset data
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </PageShell>
  );
}

