"use client";

import type { ImportFileStatus, ImportValidationStatus } from "../../lib/importMerge";

const chipBase =
  "inline-flex max-w-[11rem] cursor-default truncate rounded-md border px-1.5 py-0.5 text-[0.625rem] font-semibold uppercase tracking-[0.06em]";

const tones = {
  label:
    "border-zinc-200/90 bg-zinc-50 text-zinc-700 dark:border-zinc-600/75 dark:bg-zinc-800/80 dark:text-zinc-200",
  accepted:
    "border-emerald-200/90 bg-emerald-50 text-emerald-900 dark:border-emerald-800/45 dark:bg-emerald-950/35 dark:text-emerald-100",
  warn:
    "border-amber-200/90 bg-amber-50 text-amber-950 dark:border-amber-800/45 dark:bg-amber-950/28 dark:text-amber-100",
  partial:
    "border-violet-200/90 bg-violet-50 text-violet-950 dark:border-violet-800/45 dark:bg-violet-950/28 dark:text-violet-100",
  rejected:
    "border-rose-200/90 bg-rose-50 text-rose-950 dark:border-rose-900/45 dark:bg-rose-950/30 dark:text-rose-100",
};

type Props = {
  gameLabel?: string;
  validationStatus?: ImportValidationStatus;
  validationReasonLine?: string;
  /** Legacy chips when validationStatus not present (hydrated old sessions). */
  status?: ImportFileStatus;
  mapped?: boolean;
  unmappedDetail: string;
};

function legacyLabel(st: ImportFileStatus, mapped: boolean, unmappedDetail: string): { text: string; title: string; tone: keyof typeof tones } {
  if (st === "overlap") {
    return { text: "Overlap", title: "Overlapping date range - see file details below.", tone: "warn" };
  }
  if (st === "warning") {
    return { text: "Note", title: "Review warnings in file details below.", tone: "warn" };
  }
  if (!mapped) {
    return { text: "Not mapped", title: unmappedDetail, tone: "warn" };
  }
  return { text: "Loaded", title: "Older import - details shown below if you re-upload.", tone: "accepted" };
}

export function ImportFileLabelAndStatus({
  gameLabel,
  validationStatus,
  validationReasonLine,
  status,
  mapped = true,
  unmappedDetail,
}: Props) {
  const label = (gameLabel ?? "").trim() || "-";

  let statusText: string;
  let statusTitle: string;
  let tone: keyof typeof tones;

  if (validationStatus) {
    statusTitle = validationReasonLine ?? "";
    switch (validationStatus) {
      case "accepted":
        statusText = "Accepted";
        tone = "accepted";
        break;
      case "accepted_warnings":
        statusText = "Warnings";
        tone = "warn";
        break;
      case "partial":
        statusText = "Partial";
        tone = "partial";
        break;
      case "rejected":
        statusText = "Rejected";
        tone = "rejected";
        break;
      default:
        statusText = "-";
        tone = "warn";
    }
  } else {
    const leg = legacyLabel(status ?? "loaded", mapped, unmappedDetail);
    statusText = leg.text;
    statusTitle = leg.title;
    tone = leg.tone === "label" ? "warn" : leg.tone;
  }

  const labelTitle =
    "Upload label you chose in Imports. Order List rows do not include a dependable game column - this is your metadata.";

  return (
    <div className="flex min-w-0 flex-1 flex-col items-end gap-0.5">
      <div className="flex flex-wrap items-center justify-end gap-1">
        <span title={labelTitle} className={`${chipBase} ${tones.label}`}>
          {label}
        </span>
        <span title={statusTitle} className={`${chipBase} ${tones[tone]}`}>
          {statusText}
        </span>
      </div>
      {validationReasonLine ? (
        <p className="max-w-[18rem] text-right text-[0.625rem] leading-snug text-zinc-600 dark:text-zinc-400" title={validationReasonLine}>
          {validationReasonLine}
        </p>
      ) : null}
    </div>
  );
}
