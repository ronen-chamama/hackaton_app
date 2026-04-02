"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { t } from "@/lib/i18n";

interface SortableElementBlockProps {
  sortableId: string;
  elementTypeLabel: string;
  isSelected: boolean;
  badgeText?: string;
  styleOverrides?: {
    textColor?: string;
    backgroundColor?: string;
    border?: "none" | "solid" | "dashed" | string;
    shadow?: "none" | "sm" | "md" | "lg" | string;
  };
  onSelect: () => void;
  onDelete: () => void;
  dragData: {
    kind: "element";
    location: {
      stageId: string;
      containerId: string;
      columnId: string;
      elementId: string;
    };
    type: string;
  };
}

export function SortableElementBlock({
  sortableId,
  elementTypeLabel,
  isSelected,
  badgeText,
  styleOverrides,
  onSelect,
  onDelete,
  dragData,
}: SortableElementBlockProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({
      id: sortableId,
      data: dragData,
    });

  const borderClass =
    styleOverrides?.border === "dashed"
      ? "border-dashed"
      : styleOverrides?.border === "none"
        ? "border-transparent"
        : "border-solid";
  const shadowClass =
    styleOverrides?.shadow === "sm"
      ? "shadow-sm"
      : styleOverrides?.shadow === "md"
        ? "shadow-md"
        : styleOverrides?.shadow === "lg"
          ? "shadow-lg"
          : "";

  return (
    <div
      ref={setNodeRef}
      role="button"
      tabIndex={0}
      {...attributes}
      {...listeners}
      className={`relative rounded border px-2 py-2 text-xs ${borderClass} ${shadowClass} ${
        isSelected ? "border-primary bg-primary/10" : "border-border bg-background"
      } ${isDragging ? "cursor-grabbing" : "cursor-grab"}`}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.6 : 1,
        color: styleOverrides?.textColor || undefined,
        backgroundColor: styleOverrides?.backgroundColor || undefined,
      }}
      onClick={onSelect}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          onSelect();
        }
      }}
    >
      {badgeText ? (
        <span className="absolute -top-2 -right-2 rounded-full border border-border bg-primary px-2 py-0.5 text-[10px] font-semibold text-primary-foreground">
          {badgeText}
        </span>
      ) : null}
      <div className="font-medium">{elementTypeLabel}</div>
      <button
        type="button"
        className="mt-2 rounded border border-danger/40 px-2 py-1 text-[11px] text-danger hover:bg-danger/10"
        onClick={(event) => {
          event.stopPropagation();
          onDelete();
        }}
      >
        {t("delete")}
      </button>
    </div>
  );
}
