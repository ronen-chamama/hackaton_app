"use client";

import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import type { LucideIcon } from "lucide-react";
import type { ElementType } from "@/lib/types";

interface DraggablePaletteItemProps {
  type: ElementType;
  label: string;
  Icon: LucideIcon;
}

export function DraggablePaletteItem({
  type,
  label,
  Icon,
}: DraggablePaletteItemProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `palette:${type}`,
    data: {
      kind: "palette",
      type,
    },
  });

  return (
    <button
      ref={setNodeRef}
      type="button"
      {...attributes}
      {...listeners}
      className="flex aspect-square flex-col items-center justify-center gap-2 rounded-lg border border-border bg-background p-2 text-center text-xs text-foreground transition-colors hover:bg-surface"
      style={{
        transform: CSS.Translate.toString(transform),
        opacity: isDragging ? 0.5 : 1,
      }}
    >
      <Icon className="h-5 w-5" />
      <span>{label}</span>
    </button>
  );
}
