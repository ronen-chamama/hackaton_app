"use client";

import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { t } from "@/lib/i18n";
import type { HackathonDefinition } from "@/lib/types";
import { SortableElementBlock } from "./SortableElementBlock";

interface SelectedElementRef {
  stageId: string;
  containerId: string;
  columnId: string;
  elementId: string;
}

interface BuilderCanvasProps {
  definition: HackathonDefinition;
  fallbackTitle: string;
  selectedElement: SelectedElementRef | null;
  onAddStage: () => void;
  onUpdateStageTitle: (stageId: string, title: string) => void;
  onDeleteStage: (stageId: string) => void;
  onAddContainer: (stageId: string) => void;
  onDeleteContainer: (stageId: string, containerId: string) => void;
  onAddColumn: (stageId: string, containerId: string) => void;
  onDeleteColumn: (stageId: string, containerId: string, columnId: string) => void;
  onSelectElement: (selected: SelectedElementRef | null) => void;
  onDeleteElement: (
    stageId: string,
    containerId: string,
    columnId: string,
    elementId: string
  ) => void;
}

function toElementDragId(
  stageId: string,
  containerId: string,
  columnId: string,
  elementId: string
): string {
  return `element:${stageId}:${containerId}:${columnId}:${elementId}`;
}

function toColumnDropId(stageId: string, containerId: string, columnId: string): string {
  return `column:${stageId}:${containerId}:${columnId}`;
}

function DroppableColumn({
  stageId,
  containerId,
  columnId,
  elements,
  selectedElement,
  onDeleteColumn,
  onSelectElement,
  onDeleteElement,
}: {
  stageId: string;
  containerId: string;
  columnId: string;
  elements: Array<{ id: string; type: string }>;
  selectedElement: SelectedElementRef | null;
  onDeleteColumn: (stageId: string, containerId: string, columnId: string) => void;
  onSelectElement: BuilderCanvasProps["onSelectElement"];
  onDeleteElement: BuilderCanvasProps["onDeleteElement"];
}) {
  const { isOver, setNodeRef } = useDroppable({
    id: toColumnDropId(stageId, containerId, columnId),
    data: {
      kind: "column",
      location: { stageId, containerId, columnId },
    },
  });

  const sortableItems = elements.map((element) =>
    toElementDragId(stageId, containerId, columnId, element.id)
  );

  return (
    <div
      ref={setNodeRef}
      className={`space-y-2 rounded-md border-2 border-dashed p-2 ${
        isOver ? "border-primary bg-primary/5" : "border-border bg-surface"
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <div />
        <button
          type="button"
          className="rounded-md border border-danger/40 px-2 py-1 text-[10px] text-danger hover:bg-danger/10"
          onClick={() => onDeleteColumn(stageId, containerId, columnId)}
        >
          {t("delete")}
        </button>
      </div>

      <SortableContext items={sortableItems} strategy={verticalListSortingStrategy}>
        <div className="space-y-2">
          {elements.map((element) => {
            const isSelected =
              selectedElement?.stageId === stageId &&
              selectedElement?.containerId === containerId &&
              selectedElement?.columnId === columnId &&
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
                sortableId={toElementDragId(stageId, containerId, columnId, element.id)}
                elementTypeLabel={t(element.type)}
                isSelected={isSelected}
                badgeText={
                  typeof elementRecord.badgeText === "string"
                    ? elementRecord.badgeText
                    : ""
                }
                styleOverrides={{
                  textColor:
                    typeof styleOverrides.textColor === "string"
                      ? styleOverrides.textColor
                      : "",
                  backgroundColor:
                    typeof styleOverrides.backgroundColor === "string"
                      ? styleOverrides.backgroundColor
                      : "",
                  border:
                    typeof styleOverrides.border === "string"
                      ? styleOverrides.border
                      : "",
                  shadow:
                    typeof styleOverrides.shadow === "string"
                      ? styleOverrides.shadow
                      : "",
                }}
                onSelect={() =>
                  onSelectElement({
                    stageId,
                    containerId,
                    columnId,
                    elementId: element.id,
                  })
                }
                onDelete={() =>
                  onDeleteElement(stageId, containerId, columnId, element.id)
                }
                dragData={{
                  kind: "element",
                  location: { stageId, containerId, columnId, elementId: element.id },
                  type: element.type,
                }}
              />
            );
          })}
        </div>
      </SortableContext>
    </div>
  );
}

export function BuilderCanvas({
  definition,
  fallbackTitle,
  selectedElement,
  onAddStage,
  onUpdateStageTitle,
  onDeleteStage,
  onAddContainer,
  onDeleteContainer,
  onAddColumn,
  onDeleteColumn,
  onSelectElement,
  onDeleteElement,
}: BuilderCanvasProps) {
  return (
    <section className="h-full overflow-y-auto bg-background p-4 md:p-6">
      <div className="mx-auto max-w-5xl space-y-4">
        <header className="rounded-lg border border-border bg-surface-raised p-4">
          <h2 className="text-lg font-semibold text-foreground">
            {definition.title || fallbackTitle || t("builderTitle")}
          </h2>
        </header>

        <button
          type="button"
          className="rounded-lg border border-border bg-surface-raised px-3 py-2 text-sm font-medium text-foreground hover:bg-surface"
          onClick={onAddStage}
        >
          {t("addStage")}
        </button>

        {definition.stages.map((stage) => (
          <article
            key={stage.id}
            className="space-y-3 rounded-lg border-2 border-dashed border-border p-4"
          >
            <div className="flex items-center justify-between gap-2">
              <input
                type="text"
                value={stage.title}
                placeholder={t("stageTitlePlaceholder")}
                className="w-full max-w-xs rounded-md border border-border bg-background px-2 py-1 text-sm font-semibold text-foreground outline-none focus:border-primary"
                onChange={(event) =>
                  onUpdateStageTitle(stage.id, event.target.value)
                }
              />
              <div className="flex items-center gap-2">
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
              </div>
            </div>

            <div className="space-y-3">
              {stage.containers.map((container) => (
                <div
                  key={container.id}
                  className="space-y-2 rounded-lg border-2 border-dashed border-border/80 p-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div />
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        className="rounded-md border border-border px-2 py-1 text-xs hover:bg-surface"
                        onClick={() => onAddColumn(stage.id, container.id)}
                      >
                        {t("addColumn")}
                      </button>
                      <button
                        type="button"
                        className="rounded-md border border-danger/40 px-2 py-1 text-xs text-danger hover:bg-danger/10"
                        onClick={() => onDeleteContainer(stage.id, container.id)}
                      >
                        {t("delete")}
                      </button>
                    </div>
                  </div>

                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {container.columns.map((column) => (
                      <DroppableColumn
                        key={column.id}
                        stageId={stage.id}
                        containerId={container.id}
                        columnId={column.id}
                        elements={column.elements}
                        selectedElement={selectedElement}
                        onDeleteColumn={onDeleteColumn}
                        onSelectElement={onSelectElement}
                        onDeleteElement={onDeleteElement}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
