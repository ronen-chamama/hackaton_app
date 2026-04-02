"use client";

import { useEffect, useRef, useState } from "react";

interface ShortTextElementProps {
  placeholder: string;
  value: string;
  onSave: (value: string) => Promise<void>;
}

const SAVE_DEBOUNCE_MS = 600;

export function ShortTextElement({
  placeholder,
  value,
  onSave,
}: ShortTextElementProps) {
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

  return (
    <input
      type="text"
      value={draft}
      placeholder={placeholder}
      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
      onChange={(event) => {
        const nextValue = event.target.value;
        setDraft(nextValue);
        scheduleSave(nextValue);
      }}
      onBlur={() => {
        if (timerRef.current) {
          clearTimeout(timerRef.current);
        }
        void saveNow(draft);
      }}
    />
  );
}
