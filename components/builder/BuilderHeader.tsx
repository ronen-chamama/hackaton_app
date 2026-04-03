"use client";

import { Copy, Eye } from "lucide-react";
import { t } from "@/lib/i18n";

interface BuilderHeaderProps {
  hackathonId: string;
  saveLabel: string;
  isSavingTemplate: boolean;
  onSaveAsTemplate: () => void;
}

export function BuilderHeader({
  hackathonId,
  saveLabel,
  isSavingTemplate,
  onSaveAsTemplate,
}: BuilderHeaderProps) {
  return (
    <header className="border-b border-border bg-surface-raised px-4 py-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-foreground/80">{saveLabel}</p>
        <div className="flex items-center gap-2">
          <a
            href={`/?preview=${hackathonId}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 rounded-lg border border-border bg-background px-3 py-2 text-sm font-medium text-foreground hover:bg-surface"
          >
            <Eye className="h-4 w-4" />
            {t("preview")}
          </a>
          <button
            type="button"
            className="inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground disabled:cursor-not-allowed disabled:opacity-70"
            disabled={isSavingTemplate}
            onClick={onSaveAsTemplate}
          >
            <Copy className="h-4 w-4" />
            {t("saveAsTemplate")}
          </button>
        </div>
      </div>
    </header>
  );
}
