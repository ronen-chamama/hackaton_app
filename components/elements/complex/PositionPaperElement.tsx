"use client";

import { useEffect, useRef, useState } from "react";
import { Printer } from "lucide-react";
import { FieldLockBadge } from "@/components/elements/FieldLockBadge";
import {
  blurField,
  focusField,
  resolveFieldLock,
  type FieldLockContext,
} from "@/components/elements/fieldLock";
import { t } from "@/lib/i18n";
import { printElement } from "@/lib/utils/print";

interface PositionPaperValue {
  subject: string;
  recipient: string;
  background: string;
  problem: string;
  affected: string;
  solution: string;
  advantages: string;
  objections: string;
  action_plan: string;
}

interface PositionPaperElementProps {
  value: PositionPaperValue;
  onSave: (value: PositionPaperValue) => Promise<void>;
  groupMembers?: string[];
  printElementId: string;
  fieldLock?: FieldLockContext;
  lockFieldPrefix?: string;
}

const SAVE_DEBOUNCE_MS = 600;
const HEBREW_YEAR_MAP: Record<number, string> = {
  5786: "התשפ״ו",
  5787: "התשפ״ז",
  5788: "התשפ״ח",
  5789: "התשפ״ט",
  5790: "התש״צ",
};

function normalize(value: PositionPaperValue): string {
  return JSON.stringify(value);
}

function LetterField({
  label,
  value,
  lockedBy,
  currentUserName,
  disabled,
  onFocus,
  onChange,
  onBlur,
  className,
}: {
  label: string;
  value: string;
  lockedBy: string;
  currentUserName: string;
  disabled: boolean;
  onFocus: () => void;
  onChange: (value: string) => void;
  onBlur: () => void;
  className?: string;
}) {
  return (
    <label className={`block space-y-1 ${className ?? ""}`}>
      <span className="text-sm font-medium text-foreground/80 print:text-base print:font-semibold">
        {label}
      </span>
      <div className="relative">
        <FieldLockBadge
          lockedBy={lockedBy}
          currentUserName={currentUserName}
        />
        <textarea
          value={value}
          disabled={disabled}
          className="min-h-20 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary disabled:cursor-not-allowed disabled:opacity-70 print:min-h-0 print:border-none print:bg-transparent print:px-0 print:py-0 print:text-base"
          onFocus={onFocus}
          onChange={(event) => onChange(event.target.value)}
          onBlur={onBlur}
        />
      </div>
    </label>
  );
}

export function PositionPaperElement({
  value,
  onSave,
  groupMembers = [],
  printElementId,
  fieldLock,
  lockFieldPrefix = "",
}: PositionPaperElementProps) {
  const [draft, setDraft] = useState<PositionPaperValue>(value);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedRef = useRef(normalize(value));
  const incomingNormalized = normalize(value);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (incomingNormalized === lastSavedRef.current) {
      return;
    }
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    lastSavedRef.current = incomingNormalized;
    setDraft(value);
  }, [incomingNormalized]);

  const saveNow = async (nextValue: PositionPaperValue) => {
    const nextNormalized = normalize(nextValue);
    if (nextNormalized === lastSavedRef.current) {
      return;
    }
    lastSavedRef.current = nextNormalized;
    await onSave(nextValue);
  };

  const scheduleSave = (nextValue: PositionPaperValue) => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    timerRef.current = setTimeout(() => {
      void saveNow(nextValue);
    }, SAVE_DEBOUNCE_MS);
  };

  const patchDraft = (patch: Partial<PositionPaperValue>) => {
    const next = { ...draft, ...patch };
    setDraft(next);
    scheduleSave(next);
  };

  const flushOnBlur = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    void saveNow(draft);
  };

  const lockName = (suffix: string) =>
    lockFieldPrefix ? `${lockFieldPrefix}:${suffix}` : "";

  const now = new Date();
  const hebrewDateParts = new Intl.DateTimeFormat("he-IL-u-ca-hebrew", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).formatToParts(now);
  const hebrewYearNumeric = Number(
    new Intl.DateTimeFormat("he-IL-u-ca-hebrew-nu-latn", {
      year: "numeric",
    }).format(now)
  );
  const mappedHebrewYear = HEBREW_YEAR_MAP[hebrewYearNumeric];
  const hebrewDate = hebrewDateParts
    .map((part) => {
      if (part.type === "year" && mappedHebrewYear) {
        return mappedHebrewYear;
      }
      return part.value;
    })
    .join("");

  const gregorianDate = new Intl.DateTimeFormat("en-GB", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);

  const memberLine =
    groupMembers.filter(Boolean).join(", ") || "________________";

  return (
    <section className="space-y-4 rounded-lg border border-border bg-surface p-4 print:break-inside-avoid print:border-none print:bg-transparent print:p-0">
      <div className="flex justify-end print:hidden">
        <button
          type="button"
          className="print:hidden flex items-center gap-2 rounded-md bg-gray-100 px-3 py-1 text-sm text-gray-500 transition-colors hover:bg-gray-200 hover:text-gray-700"
          onClick={() => printElement(printElementId)}
        >
          <Printer className="h-4 w-4" />
          {t("print")}
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4 print:hidden">
        <label className="col-span-2 block space-y-1">
          <span className="text-sm font-medium text-foreground/80">{t("recipient")}</span>
          {(() => {
            const fieldName = lockName("recipient");
            const { lockedBy, isLocked } = resolveFieldLock(fieldLock, fieldName);
            return (
              <div className="relative">
                <FieldLockBadge
                  lockedBy={lockedBy}
                  currentUserName={fieldLock?.currentUserName ?? ""}
                />
                <input
                  type="text"
                  value={draft.recipient}
                  disabled={isLocked}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary disabled:cursor-not-allowed disabled:opacity-70"
                  onFocus={() => {
                    focusField(fieldLock, fieldName);
                  }}
                  onChange={(event) => patchDraft({ recipient: event.target.value })}
                  onBlur={() => {
                    blurField(fieldLock);
                    flushOnBlur();
                  }}
                />
              </div>
            );
          })()}
        </label>
        <label className="col-span-2 block space-y-1">
          <span className="text-sm font-medium text-foreground/80">{t("subject")}</span>
          {(() => {
            const fieldName = lockName("subject");
            const { lockedBy, isLocked } = resolveFieldLock(fieldLock, fieldName);
            return (
              <div className="relative">
                <FieldLockBadge
                  lockedBy={lockedBy}
                  currentUserName={fieldLock?.currentUserName ?? ""}
                />
                <input
                  type="text"
                  value={draft.subject}
                  disabled={isLocked}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary disabled:cursor-not-allowed disabled:opacity-70"
                  onFocus={() => {
                    focusField(fieldLock, fieldName);
                  }}
                  onChange={(event) => patchDraft({ subject: event.target.value })}
                  onBlur={() => {
                    blurField(fieldLock);
                    flushOnBlur();
                  }}
                />
              </div>
            );
          })()}
        </label>
        <LetterField
          label={t("background")}
          value={draft.background}
          lockedBy={resolveFieldLock(fieldLock, lockName("background")).lockedBy}
          currentUserName={fieldLock?.currentUserName ?? ""}
          disabled={resolveFieldLock(fieldLock, lockName("background")).isLocked}
          onFocus={() => {
            focusField(fieldLock, lockName("background"));
          }}
          onChange={(next) => patchDraft({ background: next })}
          onBlur={() => {
            blurField(fieldLock);
            flushOnBlur();
          }}
          className="col-span-1"
        />
        <LetterField
          label={t("problem")}
          value={draft.problem}
          lockedBy={resolveFieldLock(fieldLock, lockName("problem")).lockedBy}
          currentUserName={fieldLock?.currentUserName ?? ""}
          disabled={resolveFieldLock(fieldLock, lockName("problem")).isLocked}
          onFocus={() => {
            focusField(fieldLock, lockName("problem"));
          }}
          onChange={(next) => patchDraft({ problem: next })}
          onBlur={() => {
            blurField(fieldLock);
            flushOnBlur();
          }}
          className="col-span-1"
        />
        <LetterField
          label={t("affected")}
          value={draft.affected}
          lockedBy={resolveFieldLock(fieldLock, lockName("affected")).lockedBy}
          currentUserName={fieldLock?.currentUserName ?? ""}
          disabled={resolveFieldLock(fieldLock, lockName("affected")).isLocked}
          onFocus={() => {
            focusField(fieldLock, lockName("affected"));
          }}
          onChange={(next) => patchDraft({ affected: next })}
          onBlur={() => {
            blurField(fieldLock);
            flushOnBlur();
          }}
          className="col-span-2"
        />
        <LetterField
          label={t("solution")}
          value={draft.solution}
          lockedBy={resolveFieldLock(fieldLock, lockName("solution")).lockedBy}
          currentUserName={fieldLock?.currentUserName ?? ""}
          disabled={resolveFieldLock(fieldLock, lockName("solution")).isLocked}
          onFocus={() => {
            focusField(fieldLock, lockName("solution"));
          }}
          onChange={(next) => patchDraft({ solution: next })}
          onBlur={() => {
            blurField(fieldLock);
            flushOnBlur();
          }}
          className="col-span-2"
        />
        <LetterField
          label={t("advantages")}
          value={draft.advantages}
          lockedBy={resolveFieldLock(fieldLock, lockName("advantages")).lockedBy}
          currentUserName={fieldLock?.currentUserName ?? ""}
          disabled={resolveFieldLock(fieldLock, lockName("advantages")).isLocked}
          onFocus={() => {
            focusField(fieldLock, lockName("advantages"));
          }}
          onChange={(next) => patchDraft({ advantages: next })}
          onBlur={() => {
            blurField(fieldLock);
            flushOnBlur();
          }}
          className="col-span-1"
        />
        <LetterField
          label={t("objections")}
          value={draft.objections}
          lockedBy={resolveFieldLock(fieldLock, lockName("objections")).lockedBy}
          currentUserName={fieldLock?.currentUserName ?? ""}
          disabled={resolveFieldLock(fieldLock, lockName("objections")).isLocked}
          onFocus={() => {
            focusField(fieldLock, lockName("objections"));
          }}
          onChange={(next) => patchDraft({ objections: next })}
          onBlur={() => {
            blurField(fieldLock);
            flushOnBlur();
          }}
          className="col-span-1"
        />
        <LetterField
          label={t("actionPlan")}
          value={draft.action_plan}
          lockedBy={resolveFieldLock(fieldLock, lockName("action_plan")).lockedBy}
          currentUserName={fieldLock?.currentUserName ?? ""}
          disabled={resolveFieldLock(fieldLock, lockName("action_plan")).isLocked}
          onFocus={() => {
            focusField(fieldLock, lockName("action_plan"));
          }}
          onChange={(next) => patchDraft({ action_plan: next })}
          onBlur={() => {
            blurField(fieldLock);
            flushOnBlur();
          }}
          className="col-span-2"
        />
      </div>

      <div
        id={printElementId}
        className="hidden break-inside-avoid space-y-5"
      >
        <div className="flex items-start justify-between">
          <div className="text-right">
            <p className="font-semibold">{t("toPrefix")}</p>
            <p>{draft.recipient}</p>
          </div>
          <div className="text-left">
            <p>{gregorianDate}</p>
            <p>{hebrewDate}</p>
          </div>
        </div>

        <div className="mt-10 mb-8 text-center font-bold underline">
          <p>{`${t("subjectPrefix")} ${draft.subject}`}</p>
        </div>

        <div className="space-y-3">
          <p className="mb-4">{draft.background}</p>
          <p className="mb-4">{draft.problem}</p>
          <p className="mb-4">{draft.affected}</p>
          <p className="mb-4">{draft.solution}</p>
          <p className="mb-4">{draft.advantages}</p>
          <p className="mb-4">{draft.objections}</p>
          <p className="mb-4">{draft.action_plan}</p>
        </div>

        <div className="mt-12 pt-6 text-left">
          <p className="font-semibold">{t("sincerely")}</p>
          <p>{memberLine}</p>
        </div>
      </div>
    </section>
  );
}
