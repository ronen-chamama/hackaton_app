"use client";

import { useEffect, useRef, useState } from "react";
import { t } from "@/lib/i18n";

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
}

const SAVE_DEBOUNCE_MS = 600;

function normalize(value: PositionPaperValue): string {
  return JSON.stringify(value);
}

function LetterField({
  label,
  value,
  onChange,
  onBlur,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  onBlur: () => void;
}) {
  return (
    <label className="block space-y-1">
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

  return (
    <section className="space-y-4 rounded-lg border border-border bg-surface p-4 print:break-inside-avoid print:border-none print:bg-transparent print:p-0">
      <div className="space-y-3 print:hidden">
        <label className="block space-y-1">
          <span className="text-sm font-medium text-foreground/80">{t("recipient")}</span>
          <input
            type="text"
            value={draft.recipient}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
            onChange={(event) => patchDraft({ recipient: event.target.value })}
            onBlur={flushOnBlur}
          />
        </label>
        <label className="block space-y-1">
          <span className="text-sm font-medium text-foreground/80">{t("subject")}</span>
          <input
            type="text"
            value={draft.subject}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
            onChange={(event) => patchDraft({ subject: event.target.value })}
            onBlur={flushOnBlur}
          />
        </label>
      </div>

      <div className="hidden print:block print:space-y-2">
        <p className="print:text-base">
          <span className="font-semibold">{t("to")}: </span>
          {draft.recipient}
        </p>
        <p className="print:text-base">
          <span className="font-semibold">{t("regarding")}: </span>
          {draft.subject}
        </p>
      </div>

      <LetterField
        label={t("background")}
        value={draft.background}
        onChange={(next) => patchDraft({ background: next })}
        onBlur={flushOnBlur}
      />
      <LetterField
        label={t("problem")}
        value={draft.problem}
        onChange={(next) => patchDraft({ problem: next })}
        onBlur={flushOnBlur}
      />
      <LetterField
        label={t("affected")}
        value={draft.affected}
        onChange={(next) => patchDraft({ affected: next })}
        onBlur={flushOnBlur}
      />
      <LetterField
        label={t("solution")}
        value={draft.solution}
        onChange={(next) => patchDraft({ solution: next })}
        onBlur={flushOnBlur}
      />
      <LetterField
        label={t("advantages")}
        value={draft.advantages}
        onChange={(next) => patchDraft({ advantages: next })}
        onBlur={flushOnBlur}
      />
      <LetterField
        label={t("objections")}
        value={draft.objections}
        onChange={(next) => patchDraft({ objections: next })}
        onBlur={flushOnBlur}
      />
      <LetterField
        label={t("actionPlan")}
        value={draft.action_plan}
        onChange={(next) => patchDraft({ action_plan: next })}
        onBlur={flushOnBlur}
      />
    </section>
  );
}
