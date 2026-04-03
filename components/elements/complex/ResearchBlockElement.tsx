"use client";

import { useEffect, useRef, useState } from "react";
import { Printer } from "lucide-react";
import { t } from "@/lib/i18n";
import { printElement } from "@/lib/utils/print";

interface ResearchBlockValue {
  title: string;
  findings: string[];
  sources: string[];
  summary: string;
}

interface ResearchBlockElementProps {
  value: ResearchBlockValue;
  onSave: (value: ResearchBlockValue) => Promise<void>;
  printElementId: string;
  hackathonName?: string;
  groupName?: string;
  groupMembers?: string[];
}

const SAVE_DEBOUNCE_MS = 600;

function normalize(value: ResearchBlockValue): string {
  return JSON.stringify(value);
}

export function ResearchBlockElement({
  value,
  onSave,
  printElementId,
  hackathonName = "",
  groupName = "",
  groupMembers = [],
}: ResearchBlockElementProps) {
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
      <div className="space-y-4 print:hidden">
        <div className="flex justify-end">
          <button
            type="button"
            className="print:hidden flex items-center gap-2 rounded-md bg-gray-100 px-3 py-1 text-sm text-gray-500 transition-colors hover:bg-gray-200 hover:text-gray-700"
            onClick={() => printElement(printElementId)}
          >
            <Printer className="h-4 w-4" />
            {t("print")}
          </button>
        </div>

        <label className="block space-y-1">
          <span className="text-sm font-medium text-foreground/80">
            {t("researchTitle")}
          </span>
          <input
            type="text"
            value={draft.title}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
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
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
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
                className="rounded-lg border border-danger/40 px-3 py-2 text-sm text-danger hover:bg-danger/10"
                onClick={() => removeRow("findings", index)}
              >
                {t("delete")}
              </button>
            </div>
          ))}
          <button
            type="button"
            className="rounded-lg border border-border px-3 py-2 text-sm hover:bg-surface-raised"
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
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
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
                className="rounded-lg border border-danger/40 px-3 py-2 text-sm text-danger hover:bg-danger/10"
                onClick={() => removeRow("sources", index)}
              >
                {t("delete")}
              </button>
            </div>
          ))}
          <button
            type="button"
            className="rounded-lg border border-border px-3 py-2 text-sm hover:bg-surface-raised"
            onClick={() => addRow("sources")}
          >
            {t("addSource")}
          </button>
        </div>

        <label className="block space-y-1">
          <span className="text-sm font-medium text-foreground/80">{t("summary")}</span>
          <textarea
            value={draft.summary}
            className="min-h-24 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
            onChange={(event) => patchDraft({ summary: event.target.value })}
            onBlur={() => {
              if (timerRef.current) {
                clearTimeout(timerRef.current);
              }
              void saveNow(draft);
            }}
          />
        </label>
      </div>

      <div id={printElementId} className="hidden space-y-4">
        <section className="mb-12 space-y-3 print:break-inside-avoid">
          <h2 className="text-center text-3xl font-bold">
            {`${t("researchHackathonTitle")} ${hackathonName}`.trim()}
          </h2>
          <p className="text-lg font-medium">
            {`${t("groupNameLabel")} ${groupName}`.trim()}
          </p>
          <p className="text-lg font-medium">
            {`${t("groupMembersLabel")} ${groupMembers.filter(Boolean).join(", ")}`.trim()}
          </p>
        </section>
        <section className="space-y-3 print:break-inside-avoid">
          <h3 className="text-base font-bold">{draft.title}</h3>
        </section>
        <section className="space-y-2 print:break-inside-avoid">
          <p className="mb-2 font-semibold">{t("findings")}</p>
          <div className="space-y-1">
            {draft.findings.filter(Boolean).map((item, index) => (
              <p key={`print-finding-${index}`}>{item}</p>
            ))}
          </div>
        </section>
        <section className="space-y-2 print:break-inside-avoid">
          <p className="mb-2 font-semibold">{t("sources")}</p>
          <div className="space-y-1">
            {draft.sources.filter(Boolean).map((item, index) => (
              <p key={`print-source-${index}`}>{item}</p>
            ))}
          </div>
        </section>
        <section className="space-y-2 print:break-inside-avoid">
          <p className="mb-2 font-semibold">{t("summary")}</p>
          <p>{draft.summary}</p>
        </section>
      </div>
    </section>
  );
}
