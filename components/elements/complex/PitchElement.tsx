"use client";

import { useEffect, useRef, useState } from "react";
import { t } from "@/lib/i18n";

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
}

const SAVE_DEBOUNCE_MS = 600;

function normalize(value: PitchValue): string {
  return JSON.stringify(value);
}

const fieldOrder: Array<{
  key: keyof PitchValue;
  labelKey: "hook" | "story" | "message" | "ask" | "closing";
}> = [
  { key: "hook", labelKey: "hook" },
  { key: "story", labelKey: "story" },
  { key: "message", labelKey: "message" },
  { key: "ask", labelKey: "ask" },
  { key: "closing", labelKey: "closing" },
];

export function PitchElement({ value, onSave }: PitchElementProps) {
  const [draft, setDraft] = useState<PitchValue>(value);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedRef = useRef(normalize(value));

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

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

  return (
    <section className="space-y-4 print:space-y-8">
      {fieldOrder.map((field, index) => (
        <article
          key={field.key}
          className={`rounded-xl border border-border bg-surface p-4 print:break-inside-avoid print:border-none print:bg-transparent print:px-0 print:text-xl ${
            index % 2 === 1 ? "print:break-after-page" : ""
          }`}
        >
          <label className="block space-y-1">
            <span className="text-sm font-medium text-foreground/80 print:text-lg">
              {t(field.labelKey)}
            </span>
            <textarea
              value={draft[field.key]}
              className="min-h-24 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary print:min-h-0 print:border-none print:bg-transparent print:px-0 print:text-xl"
              onChange={(event) => patchField(field.key, event.target.value)}
              onBlur={flushOnBlur}
            />
          </label>
        </article>
      ))}
    </section>
  );
}
