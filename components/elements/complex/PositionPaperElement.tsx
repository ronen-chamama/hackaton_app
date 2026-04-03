"use client";

import { useEffect, useRef, useState } from "react";
import { Printer } from "lucide-react";
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
  onChange,
  onBlur,
  className,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  onBlur: () => void;
  className?: string;
}) {
  return (
    <label className={`block space-y-1 ${className ?? ""}`}>
      <span className="text-sm font-medium text-foreground/80 print:text-base print:font-semibold">
        {label}
      </span>
      <textarea
        value={value}
        className="min-h-20 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary print:min-h-0 print:border-none print:bg-transparent print:px-0 print:py-0 print:text-base"
        onChange={(event) => onChange(event.target.value)}
        onBlur={onBlur}
      />
    </label>
  );
}

export function PositionPaperElement({
  value,
  onSave,
  groupMembers = [],
  printElementId,
}: PositionPaperElementProps) {
  const [draft, setDraft] = useState<PositionPaperValue>(value);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedRef = useRef(normalize(value));

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

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
          <input
            type="text"
            value={draft.recipient}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
            onChange={(event) => patchDraft({ recipient: event.target.value })}
            onBlur={flushOnBlur}
          />
        </label>
        <label className="col-span-2 block space-y-1">
          <span className="text-sm font-medium text-foreground/80">{t("subject")}</span>
          <input
            type="text"
            value={draft.subject}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
            onChange={(event) => patchDraft({ subject: event.target.value })}
            onBlur={flushOnBlur}
          />
        </label>
        <LetterField
          label={t("background")}
          value={draft.background}
          onChange={(next) => patchDraft({ background: next })}
          onBlur={flushOnBlur}
          className="col-span-1"
        />
        <LetterField
          label={t("problem")}
          value={draft.problem}
          onChange={(next) => patchDraft({ problem: next })}
          onBlur={flushOnBlur}
          className="col-span-1"
        />
        <LetterField
          label={t("affected")}
          value={draft.affected}
          onChange={(next) => patchDraft({ affected: next })}
          onBlur={flushOnBlur}
          className="col-span-2"
        />
        <LetterField
          label={t("solution")}
          value={draft.solution}
          onChange={(next) => patchDraft({ solution: next })}
          onBlur={flushOnBlur}
          className="col-span-2"
        />
        <LetterField
          label={t("advantages")}
          value={draft.advantages}
          onChange={(next) => patchDraft({ advantages: next })}
          onBlur={flushOnBlur}
          className="col-span-1"
        />
        <LetterField
          label={t("objections")}
          value={draft.objections}
          onChange={(next) => patchDraft({ objections: next })}
          onBlur={flushOnBlur}
          className="col-span-1"
        />
        <LetterField
          label={t("actionPlan")}
          value={draft.action_plan}
          onChange={(next) => patchDraft({ action_plan: next })}
          onBlur={flushOnBlur}
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
