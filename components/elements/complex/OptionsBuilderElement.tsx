"use client";

import { useEffect, useRef, useState } from "react";
import { t } from "@/lib/i18n";

interface OptionItem {
  title: string;
  subtitle?: string;
  content: string;
}

interface OptionsBuilderElementProps {
  addButtonText: string;
  optionTitlePrefix: string;
  value: OptionItem[];
  onSave: (value: OptionItem[]) => Promise<void>;
}

const SAVE_DEBOUNCE_MS = 600;

function normalize(value: OptionItem[]): string {
  return JSON.stringify(value);
}

function normalizeValue(items: OptionItem[]): OptionItem[] {
  return items.map((item) => ({
    title: typeof item.title === "string" ? item.title : "",
    subtitle: typeof item.subtitle === "string" ? item.subtitle : "",
    content: typeof item.content === "string" ? item.content : "",
  }));
}

export function OptionsBuilderElement({
  addButtonText,
  optionTitlePrefix,
  value,
  onSave,
}: OptionsBuilderElementProps) {
  const initialValue = normalizeValue(value);
  const [draft, setDraft] = useState<OptionItem[]>(initialValue);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedRef = useRef(normalize(initialValue));

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  const saveNow = async (nextValue: OptionItem[]) => {
    const nextNormalized = normalize(nextValue);
    if (nextNormalized === lastSavedRef.current) {
      return;
    }
    lastSavedRef.current = nextNormalized;
    await onSave(nextValue);
  };

  const scheduleSave = (nextValue: OptionItem[]) => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    timerRef.current = setTimeout(() => {
      void saveNow(nextValue);
    }, SAVE_DEBOUNCE_MS);
  };

  const patchItem = (index: number, patch: Partial<OptionItem>) => {
    const next = draft.map((item, currentIndex) =>
      currentIndex === index ? { ...item, ...patch } : item
    );
    setDraft(next);
    scheduleSave(next);
  };

  const addOption = () => {
    const next = [...draft, { title: "", subtitle: "", content: "" }];
    setDraft(next);
    scheduleSave(next);
  };

  const removeOption = (index: number) => {
    const next = draft.filter((_, currentIndex) => currentIndex !== index);
    setDraft(next);
    scheduleSave(next);
  };

  const prefix = optionTitlePrefix || t("optionTitlePrefix");

  return (
    <div className="space-y-3">
      {draft.map((item, index) => (
        <article
          key={`option-${index}`}
          className="rounded-lg border border-border bg-surface p-3"
        >
          <p className="text-sm font-semibold text-foreground">
            {prefix} {index + 1}
          </p>

          <div className="mt-2 space-y-2">
            <input
              type="text"
              value={item.title}
              placeholder={t("title")}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
              onChange={(event) => patchItem(index, { title: event.target.value })}
              onBlur={() => {
                if (timerRef.current) {
                  clearTimeout(timerRef.current);
                }
                void saveNow(draft);
              }}
            />

            <input
              type="text"
              value={item.subtitle ?? ""}
              placeholder={t("subtitle")}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
              onChange={(event) => patchItem(index, { subtitle: event.target.value })}
              onBlur={() => {
                if (timerRef.current) {
                  clearTimeout(timerRef.current);
                }
                void saveNow(draft);
              }}
            />

            <textarea
              value={item.content}
              placeholder={t("content")}
              className="min-h-24 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
              onChange={(event) => patchItem(index, { content: event.target.value })}
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
              onClick={() => removeOption(index)}
            >
              {t("delete")}
            </button>
          </div>
        </article>
      ))}

      <button
        type="button"
        className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground hover:bg-surface"
        onClick={addOption}
      >
        {addButtonText || t("addButtonText")}
      </button>
    </div>
  );
}
