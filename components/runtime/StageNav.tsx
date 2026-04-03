"use client";

import type { Stage } from "@/lib/types";

interface StageNavProps {
  stages: Stage[];
  currentStageId: string | null;
  onSelect: (stageId: string) => void;
}

export function StageNav({ stages, currentStageId, onSelect }: StageNavProps) {
  return (
    <nav className="rounded-xl border border-border bg-surface-raised p-3 shadow-sm">
      <div className="flex flex-wrap gap-2">
        {stages.map((stage) => {
          const isActive = stage.id === currentStageId;
          return (
            <button
              key={stage.id}
              type="button"
              data-active={isActive ? "true" : "false"}
              className={`rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
                isActive
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-background text-foreground hover:bg-surface"
              }`}
              onClick={() => onSelect(stage.id)}
            >
              {stage.title}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
