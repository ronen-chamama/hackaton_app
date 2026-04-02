"use client";

import { useEffect, useRef, useState } from "react";
import { t } from "@/lib/i18n";

interface ResearchBlockValue {
  title: string;
  findings: string[];
  sources: string[];
  summary: string;
}

interface ResearchBlockElementProps {
  value: ResearchBlockValue;
  onSave: (value: ResearchBlockValue) => Promise<void>;
}

const SAVE_DEBOUNCE_MS = 600;

function normalize(value: ResearchBlockValue): string {
  return JSON.stringify(value);
}

export function ResearchBlockElement({ value, onSave }: ResearchBlockElementProps) {
  const [draft, setDraft] = useState<ResearchBlockValue>(value);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedRef = useRef(normalize(value));

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  const saveNow = async (nextValue: ResearchBlockValue) => {
    const nextNormalized = normalize(nextValue);
    if (nextNormalized === lastSavedRef.current) {
      return;
    }
    lastSavedRef.current = nextNormalized;
    await onSave(nextValue);
  };

  const scheduleSave = (nextValue: ResearchBlockValue) => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    timerRef.current = setTimeout(() => {
      void saveNow(nextValue);
    }, SAVE_DEBOUNCE_MS);
  };

  const patchDraft = (patch: Partial<ResearchBlockValue>) => {
    const next = { ...draft, ...patch };
    setDraft(next);
    scheduleSave(next);
  };

  const updateRow = (key: "findings" | "sources", index: number, text: string) => {
    const nextRows = draft[key].map((item, currentIndex) =>
      currentIndex === index ? text : item
    );
    patchDraft({ [key]: nextRows });
  };

  const addRow = (key: "findings" | "sources") => {
    const nextRows = [...draft[key], ""];
    patchDraft({ [key]: nextRows });
  };

  const removeRow = (key: "findings" | "sources", index: number) => {
    const nextRows = draft[key].filter((_, currentIndex) => currentIndex !== index);
    patchDraft({ [key]: nextRows });
  };

  return (
    <section className="space-y-4 rounded-lg border border-border bg-surface p-4 print:break-inside-avoid print:border-none print:bg-transparent print:p-0">
      <label className="block space-y-1">
        <span className="text-sm font-medium text-foreground/80">
          {t("researchTitle")}
        </span>
        <input
          type="text"
          value={draft.title}
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary print:border-none print:bg-transparent print:px-0"
          onChange={(event) => patchDraft({ title: event.target.value })}
          onBlur={() => {
            if (timerRef.current) {
              clearTimeout(timerRef.current);
            }
            void saveNow(draft);
          }}
        />
      </label>

      <div className="space-y-2">
        <p className="text-sm font-medium text-foreground/80">{t("findings")}</p>
        {draft.findings.map((item, index) => (
          <div key={`finding-${index}`} className="flex items-center gap-2">
            <input
              type="text"
              value={item}
              placeholder={t("findingPlaceholder")}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary print:border-none print:bg-transparent print:px-0"
              onChange={(event) =>
                updateRow("findings", index, event.target.value)
              }
              onBlur={() => {
                if (timerRef.current) {
                  clearTimeout(timerRef.current);
                }
                void saveNow(draft);
              }}
            />
            <button
              type="button"
              className="rounded-lg border border-danger/40 px-3 py-2 text-sm text-danger hover:bg-danger/10 print:hidden"
              onClick={() => removeRow("findings", index)}
            >
              {t("delete")}
            </button>
          </div>
        ))}
        <button
          type="button"
          className="rounded-lg border border-border px-3 py-2 text-sm hover:bg-surface-raised print:hidden"
          onClick={() => addRow("findings")}
        >
          {t("addFinding")}
        </button>
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium text-foreground/80">{t("sources")}</p>
        {draft.sources.map((item, index) => (
          <div key={`source-${index}`} className="flex items-center gap-2">
            <input
              type="text"
              value={item}
              placeholder={t("sourcePlaceholder")}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary print:border-none print:bg-transparent print:px-0"
              onChange={(event) => updateRow("sources", index, event.target.value)}
              onBlur={() => {
                if (timerRef.current) {
                  clearTimeout(timerRef.current);
                }
                void saveNow(draft);
              }}
            />
            <button
              type="button"
              className="rounded-lg border border-danger/40 px-3 py-2 text-sm text-danger hover:bg-danger/10 print:hidden"
              onClick={() => removeRow("sources", index)}
            >
              {t("delete")}
            </button>
          </div>
        ))}
        <button
          type="button"
          className="rounded-lg border border-border px-3 py-2 text-sm hover:bg-surface-raised print:hidden"
          onClick={() => addRow("sources")}
        >
          {t("addSource")}
        </button>
      </div>

      <label className="block space-y-1">
        <span className="text-sm font-medium text-foreground/80">{t("summary")}</span>
        <textarea
          value={draft.summary}
          className="min-h-24 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary print:border-none print:bg-transparent print:px-0"
          onChange={(event) => patchDraft({ summary: event.target.value })}
          onBlur={() => {
            if (timerRef.current) {
              clearTimeout(timerRef.current);
            }
            void saveNow(draft);
          }}
        />
      </label>
    </section>
  );
}
