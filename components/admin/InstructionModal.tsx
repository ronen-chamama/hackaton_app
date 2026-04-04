"use client";

import { useEffect, useState } from "react";
import { t } from "@/lib/i18n";

interface InstructionModalProps {
  storageKey: string;
  title: string;
  content: string;
}

export function InstructionModal({
  storageKey,
  title,
  content,
}: InstructionModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [dontShowChecked, setDontShowChecked] = useState(false);

  useEffect(() => {
    const checkStorage = () => {
      try {
        const shouldHide = window.localStorage.getItem(storageKey);
        if (shouldHide !== "true") {
          setIsOpen(true);
        }
      } catch {
        setIsOpen(true);
      }
    };

    const timeoutId = setTimeout(checkStorage, 0);
    return () => clearTimeout(timeoutId);
  }, [storageKey]);

  const handleClose = () => {
    if (dontShowChecked) {
      try {
        window.localStorage.setItem(storageKey, "true");
      } catch {
        // ignore storage failures
      }
    }
    setIsOpen(false);
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby={`instruction-title-${storageKey}`}
    >
      <div className="w-full max-w-xl rounded-xl border border-border bg-background p-6 shadow-xl">
        <h3
          id={`instruction-title-${storageKey}`}
          className="text-lg font-semibold text-foreground"
        >
          {title}
        </h3>

        <p className="mt-3 whitespace-pre-line text-sm leading-6 text-foreground/80">
          {content}
        </p>

        <label className="mt-5 inline-flex cursor-pointer items-center gap-2 text-sm text-foreground/80">
          <input
            type="checkbox"
            checked={dontShowChecked}
            onChange={(event) => setDontShowChecked(event.target.checked)}
            className="h-4 w-4 rounded border-border text-primary"
          />
          {t("popupDontShowAgain")}
        </label>

        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={handleClose}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            {t("popupClose")}
          </button>
        </div>
      </div>
    </div>
  );
}
