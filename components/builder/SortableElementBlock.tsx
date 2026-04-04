"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { t } from "@/lib/i18n";
import {
  asTagBorderStyle,
  asTagBorderWidth,
  asTagPosition,
  asTagShape,
  asTagSize,
  getTagInlineStyle,
  getTagPositionClasses,
  getTagShapeClasses,
  getTagSizeClasses,
} from "@/lib/utils/tag";

interface SortableElementBlockProps {
  sortableId: string;
  elementTypeLabel: string;
  isSelected: boolean;
  badgeText?: string;
  tagPosition?: string;
  tagSize?: string;
  tagBgColor?: string;
  tagTextColor?: string;
  tagBorderStyle?: string;
  tagBorderWidth?: string;
  tagShape?: string;
  emojiIcon?: string;
  borderWidth?: number;
  borderColor?: string;
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
      rowId: string;
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
  tagPosition,
  tagSize,
  tagBgColor,
  tagTextColor,
  tagBorderStyle,
  tagBorderWidth,
  tagShape,
  emojiIcon,
  borderWidth,
  borderColor,
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
  const resolvedTagPosition = asTagPosition(tagPosition);
  const resolvedTagSize = asTagSize(tagSize);
  const resolvedTagShape = asTagShape(tagShape);

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      className={`relative overflow-visible rounded border px-2 py-2 text-xs ${borderClass} ${shadowClass} ${
        isSelected ? "border-primary bg-primary/10" : "border-border bg-background"
      } ${isDragging ? "cursor-grabbing" : "cursor-grab"}`}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.6 : 1,
        color: styleOverrides?.textColor || undefined,
        backgroundColor: styleOverrides?.backgroundColor || undefined,
        borderWidth: typeof borderWidth === "number" ? `${borderWidth}px` : undefined,
        borderColor: borderColor || undefined,
      }}
      onClick={onSelect}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          onSelect();
        }
      }}
    >
      {badgeText ? (
        <span
          className={`absolute z-20 shadow-sm bg-primary text-primary-foreground ${getTagPositionClasses(
            resolvedTagPosition
          )} ${getTagSizeClasses(resolvedTagSize)} ${getTagShapeClasses(resolvedTagShape)}`}
          style={getTagInlineStyle({
            backgroundColor: tagBgColor,
            textColor: tagTextColor,
            borderStyle: asTagBorderStyle(tagBorderStyle),
            borderWidth: asTagBorderWidth(tagBorderWidth),
          })}
        >
          {badgeText}
        </span>
      ) : null}
      {emojiIcon ? (
        <span className="absolute left-2 top-1 text-2xl leading-none">{emojiIcon}</span>
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
