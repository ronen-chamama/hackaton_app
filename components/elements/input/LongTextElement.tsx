"use client";

import { useEffect, useRef, useState } from "react";
import { FieldLockBadge } from "@/components/elements/FieldLockBadge";
import {
  blurField,
  focusField,
  resolveFieldLock,
  type FieldLockContext,
} from "@/components/elements/fieldLock";

interface LongTextElementProps {
  placeholder: string;
  value: string;
  onSave: (value: string) => Promise<void>;
  fieldLock?: FieldLockContext;
  lockFieldName?: string;
}

const SAVE_DEBOUNCE_MS = 600;

export function LongTextElement({
  placeholder,
  value,
  onSave,
  fieldLock,
  lockFieldName = "",
}: LongTextElementProps) {
  const [draft, setDraft] = useState(value);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedRef = useRef(value);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (value === lastSavedRef.current) {
      return;
    }
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    lastSavedRef.current = value;
    const timeoutId = setTimeout(() => {
      setDraft(value);
    }, 0);
    return () => clearTimeout(timeoutId);
  }, [value]);

  const saveNow = async (nextValue: string) => {
    if (nextValue === lastSavedRef.current) {
      return;
    }
    lastSavedRef.current = nextValue;
    await onSave(nextValue);
  };

  const scheduleSave = (nextValue: string) => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    timerRef.current = setTimeout(() => {
      void saveNow(nextValue);
    }, SAVE_DEBOUNCE_MS);
  };

  const { lockedBy, isLocked } = resolveFieldLock(fieldLock, lockFieldName);

  return (
    <div className="relative">
      <FieldLockBadge
        lockedBy={lockedBy}
        currentUserName={fieldLock?.currentUserName ?? ""}
      />
      <textarea
        value={draft}
        placeholder={placeholder}
        disabled={isLocked}
        className="min-h-28 w-full resize-y rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary disabled:cursor-not-allowed disabled:opacity-70"
        onFocus={() => {
          focusField(fieldLock, lockFieldName);
        }}
        onChange={(event) => {
          const nextValue = event.target.value;
          setDraft(nextValue);
          scheduleSave(nextValue);
        }}
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
}
