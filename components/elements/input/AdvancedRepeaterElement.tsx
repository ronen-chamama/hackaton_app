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

interface AdvancedRepeaterField {
  id: string;
  placeholder: string;
}

interface AdvancedRepeaterElementProps {
  fields: AdvancedRepeaterField[];
  addButtonText: string;
  value: Array<Record<string, string>>;
  onSave: (value: Array<Record<string, string>>) => Promise<void>;
  fieldLock?: FieldLockContext;
  lockFieldPrefix?: string;
}

const SAVE_DEBOUNCE_MS = 600;

function normalize(value: Array<Record<string, string>>): string {
  return JSON.stringify(value);
}

function buildEmptyRow(fields: AdvancedRepeaterField[]): Record<string, string> {
  const row: Record<string, string> = {};
  for (const field of fields) {
    row[field.id] = "";
  }
  return row;
}

function normalizeRows(
  rows: Array<Record<string, string>>,
  fields: AdvancedRepeaterField[]
): Array<Record<string, string>> {
  return rows.map((row) => {
    const next: Record<string, string> = {};
    for (const field of fields) {
      next[field.id] = typeof row[field.id] === "string" ? row[field.id] : "";
    }
    return next;
  });
}

export function AdvancedRepeaterElement({
  fields,
  addButtonText,
  value,
  onSave,
  fieldLock,
  lockFieldPrefix = "",
}: AdvancedRepeaterElementProps) {
  const initialValue = normalizeRows(value, fields);
  const [draft, setDraft] = useState<Array<Record<string, string>>>(initialValue);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedRef = useRef(normalize(initialValue));
  const incomingValue = normalizeRows(value, fields);
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
    setDraft(incomingValue);
  }, [incomingNormalized]);

  const saveNow = async (nextValue: Array<Record<string, string>>) => {
    const nextNormalized = normalize(nextValue);
    if (nextNormalized === lastSavedRef.current) {
      return;
    }
    lastSavedRef.current = nextNormalized;
    await onSave(nextValue);
  };

  const scheduleSave = (nextValue: Array<Record<string, string>>) => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    timerRef.current = setTimeout(() => {
      void saveNow(nextValue);
    }, SAVE_DEBOUNCE_MS);
  };

  const updateCell = (rowIndex: number, fieldId: string, nextText: string) => {
    const nextRows = draft.map((row, currentIndex) =>
      currentIndex === rowIndex ? { ...row, [fieldId]: nextText } : row
    );
    setDraft(nextRows);
    scheduleSave(nextRows);
  };

  const addRow = () => {
    const nextRows = [...draft, buildEmptyRow(fields)];
    setDraft(nextRows);
    scheduleSave(nextRows);
  };

  const removeRow = (rowIndex: number) => {
    const nextRows = draft.filter((_, currentIndex) => currentIndex !== rowIndex);
    setDraft(nextRows);
    scheduleSave(nextRows);
  };

  if (fields.length === 0) {
    return (
      <p className="text-sm text-foreground/70">{t("fieldsConfig")}</p>
    );
  }

  return (
    <div className="space-y-3">
      {draft.map((row, rowIndex) => (
        <div key={`advanced-row-${rowIndex}`} className="rounded-lg border border-border p-2">
          <div className="grid gap-2 md:grid-cols-2">
            {fields.map((field) => (
              <div key={`${rowIndex}-${field.id}`} className="relative">
                {(() => {
                  const fieldName = lockFieldPrefix
                    ? `${lockFieldPrefix}:${rowIndex}:${field.id}`
                    : "";
                  const { lockedBy, isLocked } = resolveFieldLock(fieldLock, fieldName);

                  return (
                    <>
                      <FieldLockBadge
                        lockedBy={lockedBy}
                        currentUserName={fieldLock?.currentUserName ?? ""}
                      />
                      <input
                        type="text"
                        value={row[field.id] ?? ""}
                        placeholder={field.placeholder}
                        disabled={isLocked}
                        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary disabled:cursor-not-allowed disabled:opacity-70"
                        onFocus={() => {
                          focusField(fieldLock, fieldName);
                        }}
                        onChange={(event) => {
                          updateCell(rowIndex, field.id, event.target.value);
                        }}
                        onBlur={() => {
                          blurField(fieldLock);
                          if (timerRef.current) {
                            clearTimeout(timerRef.current);
                          }
                          void saveNow(draft);
                        }}
                      />
                    </>
                  );
                })()}
              </div>
            ))}
          </div>
          <button
            type="button"
            className="mt-2 rounded-lg border border-danger/35 px-3 py-2 text-sm text-danger hover:bg-danger/10"
            onClick={() => removeRow(rowIndex)}
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
        {addButtonText || t("addButtonText")}
      </button>
    </div>
  );
}
