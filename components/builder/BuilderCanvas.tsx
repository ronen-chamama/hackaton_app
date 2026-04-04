"use client";

import { useState, type CSSProperties } from "react";
import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  horizontalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ChevronDown, ChevronLeft, Copy, Settings } from "lucide-react";
import { t } from "@/lib/i18n";
import type { DictionaryKey } from "@/lib/i18n";
import type { HackathonDefinition, LayoutSettings } from "@/lib/types";
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
import { SortableElementBlock } from "./SortableElementBlock";

interface SelectedElementRef {
  stageId: string;
  containerId: string;
  rowId: string;
  columnId: string;
  elementId: string;
}

type SelectedLayoutNodeRef =
  | { kind: "stage"; stageId: string }
  | { kind: "container"; stageId: string; containerId: string }
  | { kind: "row"; stageId: string; containerId: string; rowId: string }
  | { kind: "column"; stageId: string; containerId: string; rowId: string; columnId: string };

interface BuilderCanvasProps {
  definition: HackathonDefinition;
  hackathonTitle: string;
  hackathonDescription: string;
  selectedElement: SelectedElementRef | null;
  onAddStage: () => void;
  onUpdateStageTitle: (stageId: string, title: string) => void;
  onDeleteStage: (stageId: string) => void;
  onAddContainer: (stageId: string) => void;
  onDeleteContainer: (stageId: string, containerId: string) => void;
  onDuplicateContainer: (stageId: string, containerId: string) => void;
  onAddRow: (stageId: string, containerId: string) => void;
  onDeleteRow: (stageId: string, containerId: string, rowId: string) => void;
  onDuplicateRow: (stageId: string, containerId: string, rowId: string) => void;
  onAddColumn: (stageId: string, containerId: string, rowId: string) => void;
  onDeleteColumn: (stageId: string, containerId: string, rowId: string, columnId: string) => void;
  onDuplicateColumn: (
    stageId: string,
    containerId: string,
    rowId: string,
    columnId: string
  ) => void;
  onSelectElement: (selected: SelectedElementRef | null) => void;
  onSelectLayoutNode: (selected: SelectedLayoutNodeRef | null) => void;
  onDeleteElement: (
    stageId: string,
    containerId: string,
    rowId: string,
    columnId: string,
    elementId: string
  ) => void;
}

function toElementDragId(
  stageId: string,
  containerId: string,
  rowId: string,
  columnId: string,
  elementId: string
): string {
  return `element:${stageId}:${containerId}:${rowId}:${columnId}:${elementId}`;
}

function isCustomWrapperEnabled(settings?: LayoutSettings): boolean {
  return Boolean(settings?.enableCustomWrapper);
}

function getNodeStyle(settings?: LayoutSettings): CSSProperties {
  if (!isCustomWrapperEnabled(settings)) {
    return {};
  }
  const hasVisibleBorder = typeof settings?.borderWidth === "number" && settings.borderWidth > 0;
  return {
    backgroundColor: settings?.backgroundColor || undefined,
    borderColor: settings?.borderColor || undefined,
    borderWidth:
      typeof settings?.borderWidth === "number" ? `${settings.borderWidth}px` : undefined,
    borderStyle: settings?.borderStyle || (hasVisibleBorder ? "solid" : undefined),
    borderTopRightRadius:
      typeof settings?.radiusTR === "number" ? `${settings.radiusTR}px` : undefined,
    borderTopLeftRadius:
      typeof settings?.radiusTL === "number" ? `${settings.radiusTL}px` : undefined,
    borderBottomRightRadius:
      typeof settings?.radiusBR === "number" ? `${settings.radiusBR}px` : undefined,
    borderBottomLeftRadius:
      typeof settings?.radiusBL === "number" ? `${settings.radiusBL}px` : undefined,
  };
}

function getNodeShadowClass(settings?: LayoutSettings): string {
  if (!isCustomWrapperEnabled(settings)) {
    return "";
  }
  if (settings?.boxShadow === "sm") return "shadow-sm";
  if (settings?.boxShadow === "md") return "shadow-md";
  if (settings?.boxShadow === "lg") return "shadow-lg";
  return "";
}

function hasVisibleBackground(settings?: LayoutSettings): boolean {
  const backgroundColor = settings?.backgroundColor?.trim();
  return Boolean(backgroundColor && backgroundColor !== "transparent" && backgroundColor !== "none");
}

function hasStructuralChrome(settings?: LayoutSettings): boolean {
  if (!isCustomWrapperEnabled(settings)) {
    return false;
  }
  return hasVisibleBackground(settings) || (typeof settings?.borderWidth === "number" && settings.borderWidth > 0);
}

function getEditModePaddingClass(settings?: LayoutSettings): string {
  return hasStructuralChrome(settings) ? "p-4" : "";
}

function getStructuralStyles(settings?: LayoutSettings): {
  style: CSSProperties;
  className: string;
} {
  const classParts = [getEditModePaddingClass(settings), getNodeShadowClass(settings)].filter(
    Boolean
  );
  return {
    style: getNodeStyle(settings),
    className: classParts.join(" "),
  };
}

function ColumnBlock({
  stageId,
  containerId,
  rowId,
  column,
  selectedElement,
  onDeleteColumn,
  onDuplicateColumn,
  onSelectElement,
  onSelectLayoutNode,
  onDeleteElement,
}: {
  stageId: string;
  containerId: string;
  rowId: string;
  column: { id: string; elements: Array<{ id: string; type: string }>; settings?: LayoutSettings };
  selectedElement: SelectedElementRef | null;
  onDeleteColumn: (stageId: string, containerId: string, rowId: string, columnId: string) => void;
  onDuplicateColumn: BuilderCanvasProps["onDuplicateColumn"];
  onSelectElement: BuilderCanvasProps["onSelectElement"];
  onSelectLayoutNode: BuilderCanvasProps["onSelectLayoutNode"];
  onDeleteElement: BuilderCanvasProps["onDeleteElement"];
}) {
  const sortableId = `column-sort:${stageId}:${containerId}:${rowId}:${column.id}`;
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: sortableId,
    data: {
      kind: "column",
      location: { stageId, containerId, rowId, columnId: column.id },
    },
  });

  const { setNodeRef: setElementDropRef, isOver } = useDroppable({
    id: `column-drop:${stageId}:${containerId}:${rowId}:${column.id}`,
    data: {
      kind: "column",
      location: { stageId, containerId, rowId, columnId: column.id },
    },
  });

  const sortableItems = column.elements.map((element) =>
    toElementDragId(stageId, containerId, rowId, column.id, element.id)
  );

  const columnRecord = column as Record<string, unknown>;
  const settings =
    columnRecord.settings && typeof columnRecord.settings === "object" && !Array.isArray(columnRecord.settings)
      ? (columnRecord.settings as LayoutSettings)
      : undefined;
  const badge = settings?.badge?.trim() ?? "";
  const tagPosition = asTagPosition(settings?.tagPosition);
  const tagSize = asTagSize(settings?.tagSize);
  const tagShape = asTagShape(settings?.tagShape);
  const emojiIcon = settings?.emojiIcon?.trim() ?? "";
  const hasElements = column.elements.length > 0;
  const structural = getStructuralStyles(settings);

  return (
    <div
      ref={setNodeRef}
      className={`relative overflow-visible flex w-full min-w-0 flex-1 flex-col gap-4 ${
        isOver ? "rounded-md bg-primary/5 ring-1 ring-primary/60 p-2" : ""
      } ${isDragging ? "opacity-70" : ""} ${hasElements ? "min-h-0" : "min-h-[2rem]"} ${
        structural.className
      }`}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        ...structural.style,
      }}
    >
      {badge ? (
        <span
          className={`absolute z-20 bg-primary text-primary-foreground shadow-sm ${getTagPositionClasses(
            tagPosition
          )} ${getTagSizeClasses(tagSize)} ${getTagShapeClasses(tagShape)}`}
          style={getTagInlineStyle({
            backgroundColor: settings?.tagBgColor,
            textColor: settings?.tagTextColor,
            borderStyle: asTagBorderStyle(settings?.tagBorderStyle),
            borderWidth: asTagBorderWidth(settings?.tagBorderWidth),
          })}
        >
          {badge}
        </span>
      ) : null}
      {emojiIcon ? (
        <span className="absolute left-2 top-1 text-2xl leading-none">{emojiIcon}</span>
      ) : null}

      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          className="rounded border border-border p-1 hover:bg-background"
          onClick={() =>
            onSelectLayoutNode({ kind: "column", stageId, containerId, rowId, columnId: column.id })
          }
        >
          <Settings className="h-3 w-3" />
        </button>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="flex items-center gap-1 rounded-md border border-border px-2 py-1 text-[10px] hover:bg-surface"
            onClick={() => onDuplicateColumn(stageId, containerId, rowId, column.id)}
          >
            <Copy className="h-3 w-3" />
            <span>{t("duplicate")}</span>
          </button>
          <button
            type="button"
            className="rounded-md border border-danger/40 px-2 py-1 text-[10px] text-danger hover:bg-danger/10"
            onClick={() => onDeleteColumn(stageId, containerId, rowId, column.id)}
          >
            {t("delete")}
          </button>
          <button
            type="button"
            className={`rounded border border-border p-1 ${isDragging ? "cursor-grabbing" : "cursor-grab"}`}
            {...attributes}
            {...listeners}
          >
            <span className="text-[10px]">::</span>
          </button>
        </div>
      </div>

      <div ref={setElementDropRef} className={!hasElements ? "min-h-[2rem]" : undefined}>
        <SortableContext items={sortableItems} strategy={verticalListSortingStrategy}>
          <div className="flex flex-col gap-4">
            {column.elements.map((element) => {
              const isSelected =
                selectedElement?.stageId === stageId &&
                selectedElement?.containerId === containerId &&
                selectedElement?.rowId === rowId &&
                selectedElement?.columnId === column.id &&
                selectedElement?.elementId === element.id;
              const elementRecord = element as Record<string, unknown>;
              const styleOverrides =
                elementRecord.styleOverrides &&
                typeof elementRecord.styleOverrides === "object" &&
                !Array.isArray(elementRecord.styleOverrides)
                  ? (elementRecord.styleOverrides as Record<string, unknown>)
                  : {};
              return (
                <SortableElementBlock
                  key={element.id}
                  sortableId={toElementDragId(stageId, containerId, rowId, column.id, element.id)}
                  elementTypeLabel={t(element.type as DictionaryKey)}
                  isSelected={isSelected}
                  badgeText={typeof elementRecord.badgeText === "string" ? elementRecord.badgeText : ""}
                  tagPosition={typeof elementRecord.tagPosition === "string" ? elementRecord.tagPosition : ""}
                  tagSize={typeof elementRecord.tagSize === "string" ? elementRecord.tagSize : ""}
                  tagBgColor={typeof elementRecord.tagBgColor === "string" ? elementRecord.tagBgColor : ""}
                  tagTextColor={typeof elementRecord.tagTextColor === "string" ? elementRecord.tagTextColor : ""}
                  tagBorderStyle={
                    typeof elementRecord.tagBorderStyle === "string"
                      ? elementRecord.tagBorderStyle
                      : ""
                  }
                  tagBorderWidth={
                    typeof elementRecord.tagBorderWidth === "string"
                      ? elementRecord.tagBorderWidth
                      : ""
                  }
                  tagShape={typeof elementRecord.tagShape === "string" ? elementRecord.tagShape : ""}
                  emojiIcon={typeof elementRecord.emojiIcon === "string" ? elementRecord.emojiIcon : ""}
                  borderWidth={
                    typeof elementRecord.borderWidth === "number"
                      ? elementRecord.borderWidth
                      : undefined
                  }
                  borderColor={
                    typeof elementRecord.borderColor === "string"
                      ? elementRecord.borderColor
                      : ""
                  }
                  styleOverrides={{
                    textColor: typeof styleOverrides.textColor === "string" ? styleOverrides.textColor : "",
                    backgroundColor:
                      typeof styleOverrides.backgroundColor === "string"
                        ? styleOverrides.backgroundColor
                        : "",
                    border: typeof styleOverrides.border === "string" ? styleOverrides.border : "",
                    shadow: typeof styleOverrides.shadow === "string" ? styleOverrides.shadow : "",
                  }}
                  onSelect={() =>
                    onSelectElement({
                      stageId,
                      containerId,
                      rowId,
                      columnId: column.id,
                      elementId: element.id,
                    })
                  }
                  onDelete={() => onDeleteElement(stageId, containerId, rowId, column.id, element.id)}
                  dragData={{
                    kind: "element",
                    location: { stageId, containerId, rowId, columnId: column.id, elementId: element.id },
                    type: element.type,
                  }}
                />
              );
            })}
          </div>
        </SortableContext>
      </div>
    </div>
  );
}

function RowBlock({
  stageId,
  containerId,
  row,
  selectedElement,
  onAddColumn,
  onDeleteRow,
  onDuplicateRow,
  onDeleteColumn,
  onDuplicateColumn,
  onSelectElement,
  onSelectLayoutNode,
  onDeleteElement,
}: {
  stageId: string;
  containerId: string;
  row: {
    id: string;
    columns: Array<{ id: string; elements: Array<{ id: string; type: string }>; settings?: LayoutSettings }>;
    settings?: LayoutSettings;
  };
  selectedElement: SelectedElementRef | null;
  onAddColumn: BuilderCanvasProps["onAddColumn"];
  onDeleteRow: BuilderCanvasProps["onDeleteRow"];
  onDuplicateRow: BuilderCanvasProps["onDuplicateRow"];
  onDeleteColumn: BuilderCanvasProps["onDeleteColumn"];
  onDuplicateColumn: BuilderCanvasProps["onDuplicateColumn"];
  onSelectElement: BuilderCanvasProps["onSelectElement"];
  onSelectLayoutNode: BuilderCanvasProps["onSelectLayoutNode"];
  onDeleteElement: BuilderCanvasProps["onDeleteElement"];
}) {
  const sortableId = `row-sort:${stageId}:${containerId}:${row.id}`;
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: sortableId,
    data: { kind: "row", location: { stageId, containerId, rowId: row.id } },
  });

  const { setNodeRef: setColumnDropRef, isOver: isColumnDropOver } = useDroppable({
    id: `row-columns-drop:${stageId}:${containerId}:${row.id}`,
    data: { kind: "column-drop", location: { stageId, containerId, rowId: row.id } },
  });

  const columnItems = row.columns.map(
    (column) => `column-sort:${stageId}:${containerId}:${row.id}:${column.id}`
  );
  const hasColumns = row.columns.length > 0;
  const badge = row.settings?.badge?.trim() ?? "";
  const tagPosition = asTagPosition(row.settings?.tagPosition);
  const tagSize = asTagSize(row.settings?.tagSize);
  const tagShape = asTagShape(row.settings?.tagShape);
  const emojiIcon = row.settings?.emojiIcon?.trim() ?? "";

  return (
    <div
      ref={setNodeRef}
      className={`relative overflow-visible flex flex-col gap-4 rounded-lg border border-border/70 ${getEditModePaddingClass(
        row.settings
      )} ${
        isDragging ? "opacity-70" : ""
      } ${getNodeShadowClass(row.settings)}`}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        ...getNodeStyle(row.settings),
      }}
    >
      {badge ? (
        <span
          className={`absolute z-20 bg-primary text-primary-foreground shadow-sm ${getTagPositionClasses(
            tagPosition
          )} ${getTagSizeClasses(tagSize)} ${getTagShapeClasses(tagShape)}`}
          style={getTagInlineStyle({
            backgroundColor: row.settings?.tagBgColor,
            textColor: row.settings?.tagTextColor,
            borderStyle: asTagBorderStyle(row.settings?.tagBorderStyle),
            borderWidth: asTagBorderWidth(row.settings?.tagBorderWidth),
          })}
        >
          {badge}
        </span>
      ) : null}
      {emojiIcon ? (
        <span className="absolute left-2 top-1 text-2xl leading-none">{emojiIcon}</span>
      ) : null}

      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          className="rounded border border-border p-1 hover:bg-background"
          onClick={() => onSelectLayoutNode({ kind: "row", stageId, containerId, rowId: row.id })}
        >
          <Settings className="h-3 w-3" />
        </button>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="rounded-md border border-border px-2 py-1 text-xs hover:bg-surface"
            onClick={() => onAddColumn(stageId, containerId, row.id)}
          >
            {t("addColumn")}
          </button>
          <button
            type="button"
            className="flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs hover:bg-surface"
            onClick={() => onDuplicateRow(stageId, containerId, row.id)}
          >
            <Copy className="h-3 w-3" />
            <span>{t("duplicate")}</span>
          </button>
          <button
            type="button"
            className="rounded-md border border-danger/40 px-2 py-1 text-xs text-danger hover:bg-danger/10"
            onClick={() => onDeleteRow(stageId, containerId, row.id)}
          >
            {t("delete")}
          </button>
          <button
            type="button"
            className={`rounded border border-border p-1 ${isDragging ? "cursor-grabbing" : "cursor-grab"}`}
            {...attributes}
            {...listeners}
          >
            <span className="text-[10px]">::</span>
          </button>
        </div>
      </div>

      <div
        ref={setColumnDropRef}
        className={`${
          isColumnDropOver ? "rounded border border-primary/50 bg-primary/5 p-1" : ""
        } ${hasColumns ? "" : "min-h-[2rem]"}`}
      >
        <SortableContext items={columnItems} strategy={horizontalListSortingStrategy}>
          <div className="flex flex-col gap-4 md:flex-row">
            {row.columns.map((column) => (
              <ColumnBlock
                key={column.id}
                stageId={stageId}
                containerId={containerId}
                rowId={row.id}
                column={column}
                selectedElement={selectedElement}
                onDeleteColumn={onDeleteColumn}
                onDuplicateColumn={onDuplicateColumn}
                onSelectElement={onSelectElement}
                onSelectLayoutNode={onSelectLayoutNode}
                onDeleteElement={onDeleteElement}
              />
            ))}
          </div>
        </SortableContext>
      </div>
    </div>
  );
}

function ContainerBlock({
  stageId,
  container,
  selectedElement,
  onAddRow,
  onAddColumn,
  onDeleteContainer,
  onDuplicateContainer,
  onDeleteRow,
  onDuplicateRow,
  onDeleteColumn,
  onDuplicateColumn,
  onSelectElement,
  onSelectLayoutNode,
  onDeleteElement,
}: {
  stageId: string;
  container: {
    id: string;
    rows: Array<{
      id: string;
      columns: Array<{ id: string; elements: Array<{ id: string; type: string }>; settings?: LayoutSettings }>;
      settings?: LayoutSettings;
    }>;
    settings?: LayoutSettings;
  };
  selectedElement: SelectedElementRef | null;
  onAddRow: (stageId: string, containerId: string) => void;
  onAddColumn: (stageId: string, containerId: string, rowId: string) => void;
  onDeleteContainer: (stageId: string, containerId: string) => void;
  onDuplicateContainer: BuilderCanvasProps["onDuplicateContainer"];
  onDeleteRow: (stageId: string, containerId: string, rowId: string) => void;
  onDuplicateRow: BuilderCanvasProps["onDuplicateRow"];
  onDeleteColumn: (stageId: string, containerId: string, rowId: string, columnId: string) => void;
  onDuplicateColumn: BuilderCanvasProps["onDuplicateColumn"];
  onSelectElement: BuilderCanvasProps["onSelectElement"];
  onSelectLayoutNode: BuilderCanvasProps["onSelectLayoutNode"];
  onDeleteElement: BuilderCanvasProps["onDeleteElement"];
}) {
  const sortableId = `container-sort:${stageId}:${container.id}`;
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: sortableId,
    data: { kind: "container", location: { stageId, containerId: container.id } },
  });

  const { setNodeRef: setRowDropRef, isOver: isRowDropOver } = useDroppable({
    id: `container-rows-drop:${stageId}:${container.id}`,
    data: { kind: "row-drop", location: { stageId, containerId: container.id } },
  });

  const rowItems = container.rows.map((row) => `row-sort:${stageId}:${container.id}:${row.id}`);
  const hasRows = container.rows.length > 0;

  const containerRecord = container as Record<string, unknown>;
  const settings =
    containerRecord.settings &&
    typeof containerRecord.settings === "object" &&
    !Array.isArray(containerRecord.settings)
      ? (containerRecord.settings as LayoutSettings)
      : undefined;
  const badge = settings?.badge?.trim() ?? "";
  const tagPosition = asTagPosition(settings?.tagPosition);
  const tagSize = asTagSize(settings?.tagSize);
  const tagShape = asTagShape(settings?.tagShape);
  const emojiIcon = settings?.emojiIcon?.trim() ?? "";

  return (
    <div
      ref={setNodeRef}
      className={`relative overflow-visible flex flex-col gap-4 rounded-lg border-2 border-dashed border-border/80 ${getEditModePaddingClass(
        settings
      )} ${
        isDragging ? "opacity-70" : ""
      } ${getNodeShadowClass(settings)}`}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        ...getNodeStyle(settings),
      }}
    >
      {badge ? (
        <span
          className={`absolute z-20 bg-primary text-primary-foreground shadow-sm ${getTagPositionClasses(
            tagPosition
          )} ${getTagSizeClasses(tagSize)} ${getTagShapeClasses(tagShape)}`}
          style={getTagInlineStyle({
            backgroundColor: settings?.tagBgColor,
            textColor: settings?.tagTextColor,
            borderStyle: asTagBorderStyle(settings?.tagBorderStyle),
            borderWidth: asTagBorderWidth(settings?.tagBorderWidth),
          })}
        >
          {badge}
        </span>
      ) : null}
      {emojiIcon ? (
        <span className="absolute left-2 top-1 text-2xl leading-none">{emojiIcon}</span>
      ) : null}

      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          className="rounded border border-border p-1 hover:bg-background"
          onClick={() => onSelectLayoutNode({ kind: "container", stageId, containerId: container.id })}
        >
          <Settings className="h-3 w-3" />
        </button>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="rounded-md border border-border px-2 py-1 text-xs hover:bg-surface"
            onClick={() => onAddRow(stageId, container.id)}
          >
            {t("addRow")}
          </button>
          <button
            type="button"
            className="flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs hover:bg-surface"
            onClick={() => onDuplicateContainer(stageId, container.id)}
          >
            <Copy className="h-3 w-3" />
            <span>{t("duplicate")}</span>
          </button>
          <button
            type="button"
            className="rounded-md border border-danger/40 px-2 py-1 text-xs text-danger hover:bg-danger/10"
            onClick={() => onDeleteContainer(stageId, container.id)}
          >
            {t("delete")}
          </button>
          <button
            type="button"
            className={`rounded border border-border p-1 ${isDragging ? "cursor-grabbing" : "cursor-grab"}`}
            {...attributes}
            {...listeners}
          >
            <span className="text-[10px]">::</span>
          </button>
        </div>
      </div>

      <div
        ref={setRowDropRef}
        className={`${
          isRowDropOver ? "rounded border border-primary/50 bg-primary/5 p-1" : ""
        } ${hasRows ? "" : "min-h-[2rem]"}`}
      >
        <SortableContext items={rowItems} strategy={verticalListSortingStrategy}>
          <div className="flex flex-col gap-4">
            {container.rows.map((row) => (
              <RowBlock
                key={row.id}
                stageId={stageId}
                containerId={container.id}
                row={row}
                selectedElement={selectedElement}
                onAddColumn={onAddColumn}
                onDeleteRow={onDeleteRow}
                onDuplicateRow={onDuplicateRow}
                onDeleteColumn={onDeleteColumn}
                onDuplicateColumn={onDuplicateColumn}
                onSelectElement={onSelectElement}
                onSelectLayoutNode={onSelectLayoutNode}
                onDeleteElement={onDeleteElement}
              />
            ))}
          </div>
        </SortableContext>
      </div>
    </div>
  );
}

function StageBlock({
  stage,
  selectedElement,
  onUpdateStageTitle,
  onDeleteStage,
  onAddContainer,
  onDeleteContainer,
  onDuplicateContainer,
  onAddRow,
  onDeleteRow,
  onDuplicateRow,
  onAddColumn,
  onDeleteColumn,
  onDuplicateColumn,
  onSelectElement,
  onSelectLayoutNode,
  onDeleteElement,
}: {
  stage: HackathonDefinition["stages"][number];
  selectedElement: SelectedElementRef | null;
  onUpdateStageTitle: BuilderCanvasProps["onUpdateStageTitle"];
  onDeleteStage: BuilderCanvasProps["onDeleteStage"];
  onAddContainer: BuilderCanvasProps["onAddContainer"];
  onDeleteContainer: BuilderCanvasProps["onDeleteContainer"];
  onDuplicateContainer: BuilderCanvasProps["onDuplicateContainer"];
  onAddRow: BuilderCanvasProps["onAddRow"];
  onDeleteRow: BuilderCanvasProps["onDeleteRow"];
  onDuplicateRow: BuilderCanvasProps["onDuplicateRow"];
  onAddColumn: BuilderCanvasProps["onAddColumn"];
  onDeleteColumn: BuilderCanvasProps["onDeleteColumn"];
  onDuplicateColumn: BuilderCanvasProps["onDuplicateColumn"];
  onSelectElement: BuilderCanvasProps["onSelectElement"];
  onSelectLayoutNode: BuilderCanvasProps["onSelectLayoutNode"];
  onDeleteElement: BuilderCanvasProps["onDeleteElement"];
}) {
  const sortableId = `stage-sort:${stage.id}`;
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: sortableId,
    data: { kind: "stage", stageId: stage.id },
  });

  const { setNodeRef: setContainerDropRef, isOver: isContainerDropOver } = useDroppable({
    id: `stage-container-drop:${stage.id}`,
    data: { kind: "container-drop", stageId: stage.id },
  });

  const containerItems = stage.containers.map(
    (container) => `container-sort:${stage.id}:${container.id}`
  );
  const hasContainers = stage.containers.length > 0;
  const settings = stage.settings;
  const badge = settings?.badge?.trim() ?? "";
  const tagPosition = asTagPosition(settings?.tagPosition);
  const tagSize = asTagSize(settings?.tagSize);
  const tagShape = asTagShape(settings?.tagShape);
  const emojiIcon = settings?.emojiIcon?.trim() ?? "";
  const [isFolded, setIsFolded] = useState(false);

  return (
    <article
      ref={setNodeRef}
      className={`relative overflow-visible space-y-2 rounded-lg border-2 border-dashed border-border p-4 ${
        isDragging ? "opacity-70" : ""
      } ${getNodeShadowClass(settings)}`}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        ...getNodeStyle(settings),
      }}
    >
      {badge ? (
        <span
          className={`absolute z-20 bg-primary text-primary-foreground shadow-sm ${getTagPositionClasses(
            tagPosition
          )} ${getTagSizeClasses(tagSize)} ${getTagShapeClasses(tagShape)}`}
          style={getTagInlineStyle({
            backgroundColor: settings?.tagBgColor,
            textColor: settings?.tagTextColor,
            borderStyle: asTagBorderStyle(settings?.tagBorderStyle),
            borderWidth: asTagBorderWidth(settings?.tagBorderWidth),
          })}
        >
          {badge}
        </span>
      ) : null}
      {emojiIcon ? (
        <span className="absolute left-2 top-1 text-3xl leading-none">{emojiIcon}</span>
      ) : null}

      <div className="flex items-center justify-between gap-2">
        <input
          type="text"
          value={stage.title}
          placeholder={t("stageTitlePlaceholder")}
          className="w-full max-w-xs rounded-md border border-border bg-background px-2 py-1 text-sm font-semibold text-foreground outline-none focus:border-primary"
          onChange={(event) => onUpdateStageTitle(stage.id, event.target.value)}
        />
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="rounded border border-border p-1 hover:bg-background"
            onClick={() => setIsFolded((current) => !current)}
          >
            {isFolded ? <ChevronLeft className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </button>
          <button
            type="button"
            className="rounded border border-border p-1 hover:bg-background"
            onClick={() => onSelectLayoutNode({ kind: "stage", stageId: stage.id })}
          >
            <Settings className="h-3 w-3" />
          </button>
          <button
            type="button"
            className="rounded-md border border-border px-2 py-1 text-xs hover:bg-surface"
            onClick={() => onAddContainer(stage.id)}
          >
            {t("addContainer")}
          </button>
          <button
            type="button"
            className="rounded-md border border-danger/40 px-2 py-1 text-xs text-danger hover:bg-danger/10"
            onClick={() => onDeleteStage(stage.id)}
          >
            {t("delete")}
          </button>
          <button
            type="button"
            className={`rounded border border-border p-1 ${isDragging ? "cursor-grabbing" : "cursor-grab"}`}
            {...attributes}
            {...listeners}
          >
            <span className="text-[10px]">::</span>
          </button>
        </div>
      </div>

      {!isFolded ? (
        <div
          ref={setContainerDropRef}
          className={`${
            isContainerDropOver ? "rounded border border-primary/50 bg-primary/5 p-1" : ""
          } ${hasContainers ? "" : "min-h-[2rem]"}`}
        >
          <SortableContext items={containerItems} strategy={verticalListSortingStrategy}>
            <div className="space-y-2">
              {stage.containers.map((container) => (
              <ContainerBlock
                key={container.id}
                stageId={stage.id}
                container={container}
                selectedElement={selectedElement}
                onAddRow={onAddRow}
                onAddColumn={onAddColumn}
                onDeleteContainer={onDeleteContainer}
                onDuplicateContainer={onDuplicateContainer}
                onDeleteRow={onDeleteRow}
                onDuplicateRow={onDuplicateRow}
                onDeleteColumn={onDeleteColumn}
                onDuplicateColumn={onDuplicateColumn}
                onSelectElement={onSelectElement}
                onSelectLayoutNode={onSelectLayoutNode}
                onDeleteElement={onDeleteElement}
                />
              ))}
            </div>
          </SortableContext>
        </div>
      ) : null}
    </article>
  );
}

export function BuilderCanvas({
  definition,
  hackathonTitle,
  hackathonDescription,
  selectedElement,
  onAddStage,
  onUpdateStageTitle,
  onDeleteStage,
  onAddContainer,
  onDeleteContainer,
  onDuplicateContainer,
  onAddRow,
  onDeleteRow,
  onDuplicateRow,
  onAddColumn,
  onDeleteColumn,
  onDuplicateColumn,
  onSelectElement,
  onSelectLayoutNode,
  onDeleteElement,
}: BuilderCanvasProps) {
  const stageItems = definition.stages.map((stage) => `stage-sort:${stage.id}`);

  return (
    <section className="h-full overflow-y-auto bg-background p-4 md:p-6">
      <div className="mx-auto max-w-5xl space-y-4">
        <header className="rounded-lg border border-border bg-surface-raised p-4">
          <h2 className="text-lg font-semibold text-foreground">
            {hackathonTitle || definition.title || t("builderTitle")}
          </h2>
          {hackathonDescription ? (
            <p className="mt-1 text-sm text-foreground/70">{hackathonDescription}</p>
          ) : null}
        </header>

        <button
          type="button"
          className="rounded-lg border border-border bg-surface-raised px-3 py-2 text-sm font-medium text-foreground hover:bg-surface"
          onClick={onAddStage}
        >
          {t("addStage")}
        </button>

        <SortableContext items={stageItems} strategy={verticalListSortingStrategy}>
          <div className="space-y-4">
            {definition.stages.map((stage) => (
              <StageBlock
                key={stage.id}
                stage={stage}
                selectedElement={selectedElement}
                onUpdateStageTitle={onUpdateStageTitle}
                onDeleteStage={onDeleteStage}
                onAddContainer={onAddContainer}
                onDeleteContainer={onDeleteContainer}
                onDuplicateContainer={onDuplicateContainer}
                onAddRow={onAddRow}
                onDeleteRow={onDeleteRow}
                onDuplicateRow={onDuplicateRow}
                onAddColumn={onAddColumn}
                onDeleteColumn={onDeleteColumn}
                onDuplicateColumn={onDuplicateColumn}
                onSelectElement={onSelectElement}
                onSelectLayoutNode={onSelectLayoutNode}
                onDeleteElement={onDeleteElement}
              />
            ))}
          </div>
        </SortableContext>
      </div>
    </section>
  );
}
