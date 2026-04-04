"use client";

import { useEffect, useRef, useState } from "react";
import { FieldLockBadge } from "@/components/elements/FieldLockBadge";
import {
  blurField,
  focusField,
  resolveFieldLock,
  type FieldLockContext,
} from "@/components/elements/fieldLock";
import { t } from "@/lib/i18n";

interface CardBuilderItem {
  title: string;
  description: string;
  input: string;
}

interface CardBuilderElementProps {
  layout: "vertical" | "horizontal" | "grid";
  gridColumns: number;
  addButtonText: string;
  titlePlaceholder: string;
  descPlaceholder: string;
  inputPlaceholder: string;
  value: CardBuilderItem[];
  onSave: (value: CardBuilderItem[]) => Promise<void>;
  fieldLock?: FieldLockContext;
  lockFieldPrefix?: string;
}

const SAVE_DEBOUNCE_MS = 600;

function normalize(value: CardBuilderItem[]): string {
  return JSON.stringify(value);
}

function normalizeItems(items: CardBuilderItem[]): CardBuilderItem[] {
  return items.map((item) => ({
    title: typeof item.title === "string" ? item.title : "",
    description: typeof item.description === "string" ? item.description : "",
    input: typeof item.input === "string" ? item.input : "",
  }));
}

function resolveGridColumns(gridColumns: number): number {
  if (Number.isNaN(gridColumns)) {
    return 2;
  }
  return Math.min(Math.max(Math.floor(gridColumns), 1), 4);
}

export function CardBuilderElement({
  layout,
  gridColumns,
  addButtonText,
  titlePlaceholder,
  descPlaceholder,
  inputPlaceholder,
  value,
  onSave,
  fieldLock,
  lockFieldPrefix = "",
}: CardBuilderElementProps) {
  const normalizedInitial = normalizeItems(value);
  const [draft, setDraft] = useState<CardBuilderItem[]>(normalizedInitial);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedRef = useRef(normalize(normalizedInitial));
  const incomingValue = normalizeItems(value);
  const incomingNormalized = normalize(incomingValue);

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
      setDraft(incomingValue);
    }, 0);
    return () => clearTimeout(timeoutId);
  }, [incomingNormalized, incomingValue]);

  const saveNow = async (nextValue: CardBuilderItem[]) => {
    const nextNormalized = normalize(nextValue);
    if (nextNormalized === lastSavedRef.current) {
      return;
    }
    lastSavedRef.current = nextNormalized;
    await onSave(nextValue);
  };

  const scheduleSave = (nextValue: CardBuilderItem[]) => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    timerRef.current = setTimeout(() => {
      void saveNow(nextValue);
    }, SAVE_DEBOUNCE_MS);
  };

  const patchCard = (index: number, patch: Partial<CardBuilderItem>) => {
    const next = draft.map((card, currentIndex) =>
      currentIndex === index ? { ...card, ...patch } : card
    );
    setDraft(next);
    scheduleSave(next);
  };

  const addCard = () => {
    const next = [...draft, { title: "", description: "", input: "" }];
    setDraft(next);
    scheduleSave(next);
  };

  const removeCard = (index: number) => {
    const next = draft.filter((_, currentIndex) => currentIndex !== index);
    setDraft(next);
    scheduleSave(next);
  };

  const cardContainerClass =
    layout === "horizontal"
      ? "flex flex-row flex-wrap"
      : layout === "grid"
        ? `grid grid-cols-1 gap-3 ${
            resolveGridColumns(gridColumns) >= 2 ? "md:grid-cols-2" : ""
          } ${resolveGridColumns(gridColumns) >= 3 ? "lg:grid-cols-3" : ""} ${
            resolveGridColumns(gridColumns) >= 4 ? "xl:grid-cols-4" : ""
          }`
        : "flex flex-col";

  return (
    <div className="space-y-3">
      <div className={`${cardContainerClass} gap-3`}>
        {draft.map((card, index) => (
          <article
            key={`card-${index}`}
            className={`rounded-lg border border-border bg-surface p-3 ${
              layout === "horizontal" ? "min-w-[260px] flex-1" : ""
            }`}
          >
            <div className="space-y-2">
              {(() => {
                const titleField = lockFieldPrefix
                  ? `${lockFieldPrefix}:${index}:title`
                  : "";
                const titleLock = resolveFieldLock(fieldLock, titleField);
                return (
                  <div className="relative">
                    <FieldLockBadge
                      lockedBy={titleLock.lockedBy}
                      currentUserName={fieldLock?.currentUserName ?? ""}
                    />
                    <input
                      type="text"
                      value={card.title}
                      placeholder={titlePlaceholder}
                      disabled={titleLock.isLocked}
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary disabled:cursor-not-allowed disabled:opacity-70"
                      onFocus={() => {
                        focusField(fieldLock, titleField);
                      }}
                      onChange={(event) =>
                        patchCard(index, { title: event.target.value })
                      }
                      onBlur={() => {
                        blurField(fieldLock);
                        if (timerRef.current) {
                          clearTimeout(timerRef.current);
                        }
                        void saveNow(draft);
                      }}
                    />
                  </div>
                );
              })()}
              {(() => {
                const descriptionField = lockFieldPrefix
                  ? `${lockFieldPrefix}:${index}:description`
                  : "";
                const descriptionLock = resolveFieldLock(fieldLock, descriptionField);
                return (
                  <div className="relative">
                    <FieldLockBadge
                      lockedBy={descriptionLock.lockedBy}
                      currentUserName={fieldLock?.currentUserName ?? ""}
                    />
                    <textarea
                      value={card.description}
                      placeholder={descPlaceholder}
                      disabled={descriptionLock.isLocked}
                      className="min-h-20 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary disabled:cursor-not-allowed disabled:opacity-70"
                      onFocus={() => {
                        focusField(fieldLock, descriptionField);
                      }}
                      onChange={(event) =>
                        patchCard(index, { description: event.target.value })
                      }
                      onBlur={() => {
                        blurField(fieldLock);
                        if (timerRef.current) {
                          clearTimeout(timerRef.current);
                        }
                        void saveNow(draft);
                      }}
                    />
                  </div>
                );
              })()}
              {(() => {
                const inputField = lockFieldPrefix
                  ? `${lockFieldPrefix}:${index}:input`
                  : "";
                const inputLock = resolveFieldLock(fieldLock, inputField);
                return (
                  <div className="relative">
                    <FieldLockBadge
                      lockedBy={inputLock.lockedBy}
                      currentUserName={fieldLock?.currentUserName ?? ""}
                    />
                    <input
                      type="text"
                      value={card.input}
                      placeholder={inputPlaceholder}
                      disabled={inputLock.isLocked}
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary disabled:cursor-not-allowed disabled:opacity-70"
                      onFocus={() => {
                        focusField(fieldLock, inputField);
                      }}
                      onChange={(event) =>
                        patchCard(index, { input: event.target.value })
                      }
                      onBlur={() => {
                        blurField(fieldLock);
                        if (timerRef.current) {
                          clearTimeout(timerRef.current);
                        }
                        void saveNow(draft);
                      }}
                    />
                  </div>
                );
              })()}
              <button
                type="button"
                className="rounded-lg border border-danger/35 px-3 py-2 text-sm text-danger hover:bg-danger/10"
                onClick={() => removeCard(index)}
              >
                {t("delete")}
              </button>
            </div>
          </article>
        ))}
      </div>

      <button
        type="button"
        className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground hover:bg-surface"
        onClick={addCard}
      >
        {addButtonText || t("addButtonText")}
      </button>
    </div>
  );
}
