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

interface PitchValue {
  hook: string;
  story: string;
  message: string;
  ask: string;
  closing: string;
}

interface PitchElementProps {
  value: PitchValue;
  onSave: (value: PitchValue) => Promise<void>;
  printElementId: string;
  fieldLock?: FieldLockContext;
  lockFieldPrefix?: string;
}

const SAVE_DEBOUNCE_MS = 600;

function normalize(value: PitchValue): string {
  return JSON.stringify(value);
}

const fieldOrder: Array<{
  key: keyof PitchValue;
  labelKey: "hook" | "story" | "message" | "ask" | "closing";
  screenColSpan: "col-span-1" | "col-span-2";
}> = [
  { key: "hook", labelKey: "hook", screenColSpan: "col-span-1" },
  { key: "story", labelKey: "story", screenColSpan: "col-span-1" },
  { key: "message", labelKey: "message", screenColSpan: "col-span-1" },
  { key: "ask", labelKey: "ask", screenColSpan: "col-span-1" },
  { key: "closing", labelKey: "closing", screenColSpan: "col-span-2" },
];

export function PitchElement({
  value,
  onSave,
  printElementId,
  fieldLock,
  lockFieldPrefix = "",
}: PitchElementProps) {
  const [draft, setDraft] = useState<PitchValue>(value);
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
    const timeoutId = setTimeout(() => {
      setDraft(value);
    }, 0);
    return () => clearTimeout(timeoutId);
  }, [incomingNormalized, value]);

  const saveNow = async (nextValue: PitchValue) => {
    const nextNormalized = normalize(nextValue);
    if (nextNormalized === lastSavedRef.current) {
      return;
    }
    lastSavedRef.current = nextNormalized;
    await onSave(nextValue);
  };

  const scheduleSave = (nextValue: PitchValue) => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    timerRef.current = setTimeout(() => {
      void saveNow(nextValue);
    }, SAVE_DEBOUNCE_MS);
  };

  const patchField = (key: keyof PitchValue, valueToSet: string) => {
    const next = { ...draft, [key]: valueToSet };
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

  return (
    <section className="space-y-4">
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
        {fieldOrder.map((field) => (
          <article
            key={`screen-${field.key}`}
            className={`${field.screenColSpan} rounded-xl border border-border bg-surface p-4`}
          >
            <label className="relative block space-y-1">
              <span className="text-sm font-medium text-foreground/80">
                {t(field.labelKey)}
              </span>
              <textarea
                value={draft[field.key]}
                disabled={resolveFieldLock(fieldLock, lockName(String(field.key))).isLocked}
                className="min-h-24 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary disabled:cursor-not-allowed disabled:opacity-70"
                onFocus={() => {
                  focusField(fieldLock, lockName(String(field.key)));
                }}
                onChange={(event) => patchField(field.key, event.target.value)}
                onBlur={() => {
                  blurField(fieldLock);
                  flushOnBlur();
                }}
              />
              <FieldLockBadge
                lockedBy={resolveFieldLock(fieldLock, lockName(String(field.key))).lockedBy}
                currentUserName={fieldLock?.currentUserName ?? ""}
              />
            </label>
          </article>
        ))}
      </div>

      <div id={printElementId} className="hidden space-y-6">
        {fieldOrder.map((field) => (
          <article
            key={`print-${field.key}`}
            className="break-inside-avoid min-h-[40vh] h-auto rounded-xl border border-border p-6"
          >
            <p className="mb-4 text-xl font-semibold">{t(field.labelKey)}</p>
            <p className="text-3xl leading-relaxed">{draft[field.key]}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
