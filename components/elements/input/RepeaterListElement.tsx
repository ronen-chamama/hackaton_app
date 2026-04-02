"use client";

import { useEffect, useRef, useState } from "react";
import { t } from "@/lib/i18n";

interface RepeaterListElementProps {
  placeholder: string;
  addButtonText: string;
  value: string[];
  onSave: (value: string[]) => Promise<void>;
}

const SAVE_DEBOUNCE_MS = 600;

function normalize(value: string[]): string {
  return JSON.stringify(value);
}

export function RepeaterListElement({
  placeholder,
  addButtonText,
  value,
  onSave,
}: RepeaterListElementProps) {
  const [draft, setDraft] = useState<string[]>(value);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedRef = useRef(normalize(value));

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  const saveNow = async (nextValue: string[]) => {
    const nextNormalized = normalize(nextValue);
    if (nextNormalized === lastSavedRef.current) {
      return;
    }
    lastSavedRef.current = nextNormalized;
    await onSave(nextValue);
  };

  const scheduleSave = (nextValue: string[]) => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    timerRef.current = setTimeout(() => {
      void saveNow(nextValue);
    }, SAVE_DEBOUNCE_MS);
  };

  const updateItem = (index: number, nextText: string) => {
    const next = draft.map((item, currentIndex) =>
      currentIndex === index ? nextText : item
    );
    setDraft(next);
    scheduleSave(next);
  };

  const addRow = () => {
    const next = [...draft, ""];
    setDraft(next);
    scheduleSave(next);
  };

  const removeRow = (index: number) => {
    const next = draft.filter((_, currentIndex) => currentIndex !== index);
    setDraft(next);
    scheduleSave(next);
  };

  return (
    <div className="space-y-2">
      {draft.map((item, index) => (
        <div key={`row-${index}`} className="flex items-center gap-2">
          <input
            type="text"
            value={item}
            placeholder={placeholder}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
            onChange={(event) => {
              updateItem(index, event.target.value);
            }}
            onBlur={() => {
              if (timerRef.current) {
                clearTimeout(timerRef.current);
              }
              void saveNow(draft);
            }}
          />
          <button
            type="button"
            className="rounded-lg border border-danger/35 px-3 py-2 text-sm text-danger hover:bg-danger/10"
            onClick={() => removeRow(index)}
          >
            {t("delete")}
          </button>
        </div>
      ))}

      <button
        type="button"
        className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground hover:bg-surface"
        onClick={addRow}
      >
        {addButtonText}
      </button>
    </div>
  );
}
