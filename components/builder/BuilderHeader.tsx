"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Copy, Eye, Pencil, Redo2, Undo2, X } from "lucide-react";
import { t } from "@/lib/i18n";

interface BuilderHeaderProps {
  hackathonId: string;
  title: string;
  description: string;
  isTemplate: boolean;
  isSavingTemplate: boolean;
  isUpdatingHackathonSettings: boolean;
  onSaveAsTemplate: () => Promise<{ ok: true; id: string } | { ok: false }>;
  onUpdateHackathonSettings: (title: string, description: string) => Promise<boolean>;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
}

export function BuilderHeader({
  hackathonId,
  title,
  description,
  isTemplate,
  isSavingTemplate,
  isUpdatingHackathonSettings,
  onSaveAsTemplate,
  onUpdateHackathonSettings,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
}: BuilderHeaderProps) {
  const router = useRouter();
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [hasSavedTemplate, setHasSavedTemplate] = useState(false);
  const [titleDraft, setTitleDraft] = useState(title);
  const [descriptionDraft, setDescriptionDraft] = useState(description);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextTitle = titleDraft.trim();
    const nextDescription = descriptionDraft.trim();
    if (!nextTitle) {
      return;
    }
    const ok = await onUpdateHackathonSettings(nextTitle, nextDescription);
    if (ok) {
      setIsEditOpen(false);
    }
  };

  const handleSaveAsTemplate = async () => {
    if (isTemplate || hasSavedTemplate || isSavingTemplate) {
      return;
    }

    const result = await onSaveAsTemplate();
    if (result.ok) {
      setHasSavedTemplate(true);
      router.push(`/admin/builder/${result.id}`);
    }
  };

  return (
    <header className="border-b border-border bg-surface-raised px-4 py-3">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="truncate text-lg font-semibold text-foreground">{title || t("builderTitle")}</h1>
            <button
              type="button"
              aria-label={t("editHackathon")}
              title={t("editHackathon")}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-background text-foreground hover:bg-surface"
              onClick={() => {
                setTitleDraft(title);
                setDescriptionDraft(description);
                setIsEditOpen(true);
              }}
            >
              <Pencil className="h-4 w-4" />
            </button>
          </div>
          <p className="truncate text-sm text-foreground/70">{description}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label={t("undo")}
            title={t("undo")}
            className="inline-flex items-center gap-1 rounded-lg border border-border bg-background px-3 py-2 text-sm font-medium text-foreground hover:bg-surface disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={!canUndo}
            onClick={onUndo}
          >
            <Undo2 className="h-4 w-4" />
          </button>
          <button
            type="button"
            aria-label={t("redo")}
            title={t("redo")}
            className="inline-flex items-center gap-1 rounded-lg border border-border bg-background px-3 py-2 text-sm font-medium text-foreground hover:bg-surface disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={!canRedo}
            onClick={onRedo}
          >
            <Redo2 className="h-4 w-4" />
          </button>
          <a
            href={`/?preview=${hackathonId}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 rounded-lg border border-border bg-background px-3 py-2 text-sm font-medium text-foreground hover:bg-surface"
          >
            <Eye className="h-4 w-4" />
            {t("preview")}
          </a>
          {!isTemplate ? (
            <button
              type="button"
              className={`inline-flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium ${
                hasSavedTemplate
                  ? "cursor-not-allowed bg-gray-300 text-gray-600 opacity-50"
                  : "bg-primary text-primary-foreground"
              } disabled:cursor-not-allowed disabled:opacity-70`}
              disabled={isSavingTemplate || hasSavedTemplate}
              onClick={handleSaveAsTemplate}
            >
              <Copy className="h-4 w-4" />
              {hasSavedTemplate ? t("savedAsTemplate") : t("saveAsTemplate")}
            </button>
          ) : null}
        </div>
      </div>
      {isEditOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <form
            className="w-full max-w-lg rounded-xl border border-border bg-background p-4 shadow-lg"
            onSubmit={handleSubmit}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-semibold">{t("editHackathon")}</h2>
              <button
                type="button"
                className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border hover:bg-surface"
                onClick={() => setIsEditOpen(false)}
                aria-label={t("cancel")}
                title={t("cancel")}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3">
              <label className="block space-y-1">
                <span className="text-sm">{t("hackathonName")}</span>
                <input
                  type="text"
                  required
                  value={titleDraft}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                  onChange={(event) => setTitleDraft(event.target.value)}
                />
              </label>

              <label className="block space-y-1">
                <span className="text-sm">{t("hackathonDescription")}</span>
                <textarea
                  value={descriptionDraft}
                  className="min-h-24 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                  onChange={(event) => setDescriptionDraft(event.target.value)}
                />
              </label>
            </div>

            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                type="button"
                className="rounded-lg border border-border bg-background px-3 py-2 text-sm font-medium hover:bg-surface"
                onClick={() => setIsEditOpen(false)}
              >
                {t("cancel")}
              </button>
              <button
                type="submit"
                disabled={isUpdatingHackathonSettings}
                className="rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground disabled:cursor-not-allowed disabled:opacity-70"
              >
                {t("saveChanges")}
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </header>
  );
}
