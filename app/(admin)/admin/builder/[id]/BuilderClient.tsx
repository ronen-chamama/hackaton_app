"use client";

import {
  DndContext,
  PointerSensor,
  DragOverlay,
  type DragEndEvent,
  type DragStartEvent,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { BuilderHeader } from "@/components/builder/BuilderHeader";
import { BuilderCanvas } from "@/components/builder/BuilderCanvas";
import { BuilderSidebar } from "@/components/builder/BuilderSidebar";
import { saveAsTemplate, updateHackathonSettings } from "@/lib/actions/hackathon";
import { t } from "@/lib/i18n";
import { createClient } from "@/lib/supabase/client";
import { THEME_NAMES, type ThemeName } from "@/lib/themes";
import type {
  Column,
  Container,
  Element,
  ElementType,
  HackathonDefinition,
  LayoutSettings,
  Row,
  Stage,
} from "@/lib/types";

interface BuilderClientProps {
  hackathonId: string;
  initialDefinition: HackathonDefinition;
  initialTitle: string;
  initialDescription: string;
  initialIsTemplate: boolean;
}

type SelectedElementRef = {
  stageId: string;
  containerId: string;
  rowId: string;
  columnId: string;
  elementId: string;
};

type SelectedLayoutNodeRef =
  | { kind: "stage"; stageId: string }
  | { kind: "container"; stageId: string; containerId: string }
  | { kind: "row"; stageId: string; containerId: string; rowId: string }
  | { kind: "column"; stageId: string; containerId: string; rowId: string; columnId: string };

type ColumnLocation = {
  stageId: string;
  containerId: string;
  rowId: string;
  columnId: string;
};

type ElementLocation = ColumnLocation & {
  elementId: string;
};

type ContainerLocation = {
  stageId: string;
  containerId: string;
};

type RowLocation = {
  stageId: string;
  containerId: string;
  rowId: string;
};

type DragData =
  | { kind: "palette"; type: ElementType }
  | { kind: "stage"; stageId: string }
  | { kind: "container"; location: ContainerLocation }
  | { kind: "container-drop"; stageId: string }
  | { kind: "row"; location: RowLocation }
  | { kind: "row-drop"; location: { stageId: string; containerId: string } }
  | { kind: "column"; location: ColumnLocation }
  | { kind: "column-drop"; location: { stageId: string; containerId: string; rowId: string } }
  | { kind: "element"; location: ElementLocation; type: ElementType };

type ActiveDrag =
  | null
  | { kind: "palette"; type: ElementType }
  | { kind: "element"; type: ElementType }
  | { kind: "stage" }
  | { kind: "container" }
  | { kind: "row" }
  | { kind: "column" };

interface HistoryState {
  past: HackathonDefinition[];
  present: HackathonDefinition;
  future: HackathonDefinition[];
}

const SAVE_DEBOUNCE_MS = 1000;
const PALETTE_TYPES: ElementType[] = [
  "heading",
  "text",
  "image",
  "video",
  "alert",
  "list",
  "info-card",
  "icon_card",
  "link_button",
  "short_text",
  "long_text",
  "repeater_list",
  "advanced_repeater",
  "card_builder",
  "research_block",
  "position_paper",
  "pitch",
];

function createId(prefix: string): string {
  return `${prefix}-${crypto.randomUUID()}`;
}

function withBlockDesignDefaults(config: Record<string, unknown>) {
  return {
    ...config,
    tagPosition: "top-right",
    tagSize: "small",
    tagBgColor: "",
    tagTextColor: "",
    tagBorderStyle: "solid",
    tagBorderWidth: "0px",
    tagShape: "rounded",
    emojiIcon: "",
    borderWidth: 1,
    borderColor: "",
  };
}

type DuplicableNode = Container | Row | Column;

function duplicateElementNode(element: Element): Element {
  const nextElement = structuredClone(element) as Element;
  nextElement.id = createId("element");
  return nextElement;
}

function duplicateNode(node: Column): Column;
function duplicateNode(node: Row): Row;
function duplicateNode(node: Container): Container;
function duplicateNode(node: DuplicableNode): DuplicableNode {
  if ("rows" in node) {
    const nextContainer = structuredClone(node) as Container;
    nextContainer.id = createId("container");
    nextContainer.rows = nextContainer.rows.map((row) => duplicateNode(row));
    return nextContainer;
  }

  if ("columns" in node) {
    const nextRow = structuredClone(node) as Row;
    nextRow.id = createId("row");
    nextRow.columns = nextRow.columns.map((column) => duplicateNode(column));
    return nextRow;
  }

  const nextColumn = structuredClone(node) as Column;
  nextColumn.id = createId("column");
  nextColumn.elements = nextColumn.elements.map((element) => duplicateElementNode(element));
  return nextColumn;
}

function findStage(definition: HackathonDefinition, stageId: string) {
  return definition.stages.find((stage) => stage.id === stageId) ?? null;
}

function findContainer(definition: HackathonDefinition, location: ContainerLocation) {
  const stage = findStage(definition, location.stageId);
  if (!stage) return null;
  const container = stage.containers.find((item) => item.id === location.containerId);
  if (!container) return null;
  return { stage, container };
}

function findRow(definition: HackathonDefinition, location: RowLocation) {
  const foundContainer = findContainer(definition, {
    stageId: location.stageId,
    containerId: location.containerId,
  });
  if (!foundContainer) return null;
  const row = foundContainer.container.rows.find((item) => item.id === location.rowId);
  if (!row) return null;
  return { ...foundContainer, row };
}

function findColumn(definition: HackathonDefinition, location: ColumnLocation) {
  const foundRow = findRow(definition, {
    stageId: location.stageId,
    containerId: location.containerId,
    rowId: location.rowId,
  });
  if (!foundRow) return null;
  const column = foundRow.row.columns.find((item) => item.id === location.columnId);
  if (!column) return null;
  return { ...foundRow, column };
}

function resolveElementDropTarget(
  definition: HackathonDefinition,
  overData: DragData | undefined
): (ColumnLocation & { index: number }) | null {
  if (!overData) return null;

  if (overData.kind === "column-drop") {
    const found = findRow(definition, {
      stageId: overData.location.stageId,
      containerId: overData.location.containerId,
      rowId: overData.location.rowId,
    });
    if (!found || found.row.columns.length === 0) {
      return null;
    }
    const targetColumn = found.row.columns[0];
    return {
      stageId: overData.location.stageId,
      containerId: overData.location.containerId,
      rowId: overData.location.rowId,
      columnId: targetColumn.id,
      index: targetColumn.elements.length,
    };
  }

  if (overData.kind === "column") {
    const found = findColumn(definition, overData.location);
    if (!found) return null;
    return {
      ...overData.location,
      index: found.column.elements.length,
    };
  }

  if (overData.kind === "element") {
    const found = findColumn(definition, overData.location);
    if (!found) return null;
    const index = found.column.elements.findIndex(
      (item) => item.id === overData.location.elementId
    );
    if (index < 0) return null;
    return {
      stageId: overData.location.stageId,
      containerId: overData.location.containerId,
      rowId: overData.location.rowId,
      columnId: overData.location.columnId,
      index,
    };
  }

  return null;
}

export default function BuilderClient({
  hackathonId,
  initialDefinition,
  initialTitle,
  initialDescription,
  initialIsTemplate,
}: BuilderClientProps) {
  const supabase = useMemo(() => createClient(), []);
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    })
  );

  const [history, setHistory] = useState<HistoryState>({
    past: [],
    present: structuredClone(initialDefinition),
    future: [],
  });
  const [selectedElement, setSelectedElement] = useState<SelectedElementRef | null>(null);
  const [selectedLayoutNode, setSelectedLayoutNode] =
    useState<SelectedLayoutNodeRef | null>(null);
  const [activeDrag, setActiveDrag] = useState<ActiveDrag>(null);
  const [isSavingTemplate, startSavingTemplate] = useTransition();
  const [isUpdatingHackathonSettings, startUpdatingHackathonSettings] = useTransition();
  const [hackathonTitle, setHackathonTitle] = useState(initialTitle);
  const [hackathonDescription, setHackathonDescription] = useState(initialDescription);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMountedRef = useRef(true);
  const isFirstRenderRef = useRef(true);
  const draft = history.present;

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (isFirstRenderRef.current) {
      isFirstRenderRef.current = false;
      return;
    }

    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(async () => {
      await supabase.from("hackathons").update({ definition: draft }).eq("id", hackathonId);
    }, SAVE_DEBOUNCE_MS);
  }, [draft, hackathonId, supabase]);

  const updateDraft = (
    updater: (previous: HackathonDefinition) => HackathonDefinition,
    options?: { recordHistory?: boolean }
  ) => {
    const recordHistory = options?.recordHistory ?? true;
    setHistory((previous) => {
      const nextPresent = updater(previous.present);
      if (nextPresent === previous.present) {
        return previous;
      }

      if (!recordHistory) {
        return {
          ...previous,
          present: nextPresent,
        };
      }

      return {
        past: [...previous.past, structuredClone(previous.present)],
        present: nextPresent,
        future: [],
      };
    });
  };

  const canUndo = history.past.length > 0;
  const canRedo = history.future.length > 0;

  const handleUndo = useCallback(() => {
    setHistory((previous) => {
      if (previous.past.length === 0) {
        return previous;
      }
      const nextPast = previous.past.slice(0, -1);
      const nextPresent = structuredClone(previous.past[previous.past.length - 1]);
      return {
        past: nextPast,
        present: nextPresent,
        future: [structuredClone(previous.present), ...previous.future],
      };
    });
  }, []);

  const handleRedo = useCallback(() => {
    setHistory((previous) => {
      if (previous.future.length === 0) {
        return previous;
      }
      const [nextPresentRaw, ...nextFuture] = previous.future;
      return {
        past: [...previous.past, structuredClone(previous.present)],
        present: structuredClone(nextPresentRaw),
        future: nextFuture,
      };
    });
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const isModifier = event.ctrlKey || event.metaKey;
      if (!isModifier) {
        return;
      }

      const key = event.key.toLowerCase();
      if (key === "z" && !event.shiftKey) {
        event.preventDefault();
        handleUndo();
        return;
      }
      if (key === "y" || (key === "z" && event.shiftKey)) {
        event.preventDefault();
        handleRedo();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [handleRedo, handleUndo]);

  const addStage = () => {
    const stage: Stage = {
      id: createId("stage"),
      title: "",
      containers: [],
      settings: {},
    };
    updateDraft((prev) => ({ ...prev, stages: [...prev.stages, stage] }));
  };

  const deleteStage = (stageId: string) => {
    updateDraft((prev) => ({
      ...prev,
      stages: prev.stages.filter((stage) => stage.id !== stageId),
    }));
    if (selectedElement?.stageId === stageId) setSelectedElement(null);
    if (selectedLayoutNode?.kind === "stage" && selectedLayoutNode.stageId === stageId) {
      setSelectedLayoutNode(null);
    }
  };

  const updateStageTitle = (stageId: string, title: string) => {
    updateDraft((prev) => ({
      ...prev,
      stages: prev.stages.map((stage) => (stage.id === stageId ? { ...stage, title } : stage)),
    }));
  };

  const addContainer = (stageId: string) => {
    const container: Container = {
      id: createId("container"),
      rows: [],
      settings: {},
    };
    updateDraft((prev) => ({
      ...prev,
      stages: prev.stages.map((stage) =>
        stage.id === stageId
          ? { ...stage, containers: [...stage.containers, container] }
          : stage
      ),
    }));
  };

  const deleteContainer = (stageId: string, containerId: string) => {
    updateDraft((prev) => ({
      ...prev,
      stages: prev.stages.map((stage) =>
        stage.id === stageId
          ? {
              ...stage,
              containers: stage.containers.filter((container) => container.id !== containerId),
            }
          : stage
      ),
    }));
    if (
      selectedElement?.stageId === stageId &&
      selectedElement?.containerId === containerId
    ) {
      setSelectedElement(null);
    }
    if (
      selectedLayoutNode?.kind === "container" &&
      selectedLayoutNode.stageId === stageId &&
      selectedLayoutNode.containerId === containerId
    ) {
      setSelectedLayoutNode(null);
    }
    if (
      selectedLayoutNode?.kind === "row" &&
      selectedLayoutNode.stageId === stageId &&
      selectedLayoutNode.containerId === containerId
    ) {
      setSelectedLayoutNode(null);
    }
    if (
      selectedLayoutNode?.kind === "column" &&
      selectedLayoutNode.stageId === stageId &&
      selectedLayoutNode.containerId === containerId
    ) {
      setSelectedLayoutNode(null);
    }
  };

  const duplicateContainer = (stageId: string, containerId: string) => {
    updateDraft((prev) => ({
      ...prev,
      stages: prev.stages.map((stage) => {
        if (stage.id !== stageId) {
          return stage;
        }

        const containerIndex = stage.containers.findIndex((container) => container.id === containerId);
        if (containerIndex < 0) {
          return stage;
        }

        const duplicatedContainer = duplicateNode(stage.containers[containerIndex]) as Container;
        const nextContainers = [...stage.containers];
        nextContainers.splice(containerIndex + 1, 0, duplicatedContainer);
        return { ...stage, containers: nextContainers };
      }),
    }));
  };

  const addRow = (stageId: string, containerId: string) => {
    const row: Row = {
      id: createId("row"),
      columns: [],
      settings: {},
    };
    updateDraft((prev) => ({
      ...prev,
      stages: prev.stages.map((stage) =>
        stage.id === stageId
          ? {
              ...stage,
              containers: stage.containers.map((container) =>
                container.id === containerId
                  ? {
                      ...container,
                      rows: [...container.rows, row],
                    }
                  : container
              ),
            }
          : stage
      ),
    }));
  };

  const deleteRow = (stageId: string, containerId: string, rowId: string) => {
    updateDraft((prev) => ({
      ...prev,
      stages: prev.stages.map((stage) =>
        stage.id === stageId
          ? {
              ...stage,
              containers: stage.containers.map((container) =>
                container.id === containerId
                  ? {
                      ...container,
                      rows: container.rows.filter((row) => row.id !== rowId),
                    }
                  : container
              ),
            }
          : stage
      ),
    }));
    if (
      selectedElement?.stageId === stageId &&
      selectedElement?.containerId === containerId &&
      selectedElement?.rowId === rowId
    ) {
      setSelectedElement(null);
    }
    if (
      selectedLayoutNode?.kind === "row" &&
      selectedLayoutNode.stageId === stageId &&
      selectedLayoutNode.containerId === containerId &&
      selectedLayoutNode.rowId === rowId
    ) {
      setSelectedLayoutNode(null);
    }
  };

  const duplicateRow = (stageId: string, containerId: string, rowId: string) => {
    updateDraft((prev) => ({
      ...prev,
      stages: prev.stages.map((stage) => {
        if (stage.id !== stageId) {
          return stage;
        }

        return {
          ...stage,
          containers: stage.containers.map((container) => {
            if (container.id !== containerId) {
              return container;
            }

            const rowIndex = container.rows.findIndex((row) => row.id === rowId);
            if (rowIndex < 0) {
              return container;
            }

            const duplicatedRow = duplicateNode(container.rows[rowIndex]) as Row;
            const nextRows = [...container.rows];
            nextRows.splice(rowIndex + 1, 0, duplicatedRow);
            return { ...container, rows: nextRows };
          }),
        };
      }),
    }));
  };

  const addColumn = (stageId: string, containerId: string, rowId: string) => {
    updateDraft((prev) => ({
      ...prev,
      stages: prev.stages.map((stage) =>
        stage.id === stageId
          ? {
              ...stage,
              containers: stage.containers.map((container) =>
                container.id === containerId
                  ? {
                      ...container,
                      rows: container.rows.map((row) =>
                        row.id === rowId
                          ? {
                              ...row,
                              columns: [
                                ...row.columns,
                                { id: createId("column"), elements: [], settings: {} },
                              ],
                            }
                          : row
                      ),
                    }
                  : container
              ),
            }
          : stage
      ),
    }));
  };

  const deleteColumn = (stageId: string, containerId: string, rowId: string, columnId: string) => {
    updateDraft((prev) => ({
      ...prev,
      stages: prev.stages.map((stage) =>
        stage.id === stageId
          ? {
              ...stage,
              containers: stage.containers.map((container) =>
                container.id === containerId
                  ? {
                      ...container,
                      rows: container.rows.map((row) =>
                        row.id === rowId
                          ? {
                              ...row,
                              columns: row.columns.filter((column) => column.id !== columnId),
                            }
                          : row
                      ),
                    }
                  : container
              ),
            }
          : stage
      ),
    }));
    if (
      selectedElement?.stageId === stageId &&
      selectedElement?.containerId === containerId &&
      selectedElement?.rowId === rowId &&
      selectedElement?.columnId === columnId
    ) {
      setSelectedElement(null);
    }
    if (
      selectedLayoutNode?.kind === "column" &&
      selectedLayoutNode.stageId === stageId &&
      selectedLayoutNode.containerId === containerId &&
      selectedLayoutNode.rowId === rowId &&
      selectedLayoutNode.columnId === columnId
    ) {
      setSelectedLayoutNode(null);
    }
  };

  const duplicateColumn = (stageId: string, containerId: string, rowId: string, columnId: string) => {
    updateDraft((prev) => ({
      ...prev,
      stages: prev.stages.map((stage) => {
        if (stage.id !== stageId) {
          return stage;
        }

        return {
          ...stage,
          containers: stage.containers.map((container) => {
            if (container.id !== containerId) {
              return container;
            }

            return {
              ...container,
              rows: container.rows.map((row) => {
                if (row.id !== rowId) {
                  return row;
                }

                const columnIndex = row.columns.findIndex((column) => column.id === columnId);
                if (columnIndex < 0) {
                  return row;
                }

                const duplicatedColumn = duplicateNode(row.columns[columnIndex]) as Column;
                const nextColumns = [...row.columns];
                nextColumns.splice(columnIndex + 1, 0, duplicatedColumn);
                return { ...row, columns: nextColumns };
              }),
            };
          }),
        };
      }),
    }));
  };

  function getDefaultElementConfig(type: ElementType): Record<string, unknown> {
    switch (type) {
      case "heading":
        return {
          text: "",
          level: "h2",
          textAlign: "right",
          subHeading: "",
          showSeparator: false,
          separatorStyle: "solid",
          separatorColor: "",
          subHeadingColor: "",
        };
      case "text":
        return { content: "", textAlign: "right" };
      case "image":
        return withBlockDesignDefaults({ url: "", alt: "" });
      case "video":
        return withBlockDesignDefaults({ youtubeId: "" });
      case "alert":
        return withBlockDesignDefaults({ type: "info", text: "" });
      case "list":
        return withBlockDesignDefaults({ listItems: [], style: "bullets" });
      case "info-card":
        return withBlockDesignDefaults({
          cardTitle: "",
          cardText: "",
          titleBgColor: "#f4ede1",
          titleTextColor: "#111827",
          titleAlignment: "right",
          cardBorderColor: "",
          cardShadowColor: "",
          emojiIcon: "",
        });
      case "icon_card":
        return withBlockDesignDefaults({ iconName: "Star", title: "", text: "" });
      case "link_button":
        return withBlockDesignDefaults({ label: "", url: "", align: "right" });
      case "short_text":
      case "long_text":
        return withBlockDesignDefaults({ placeholder: "" });
      case "repeater_list":
        return withBlockDesignDefaults({ placeholder: "", addButtonText: "" });
      case "advanced_repeater":
        return withBlockDesignDefaults({
          fields: [{ id: createId("field").slice(-8), placeholder: "" }],
          addButtonText: "",
        });
      case "card_builder":
        return withBlockDesignDefaults({
          layout: "vertical",
          gridColumns: 2,
          addButtonText: "",
          titlePlaceholder: "",
          descPlaceholder: "",
          inputPlaceholder: "",
        });
      case "research_block":
        return withBlockDesignDefaults({ title: "", findings: [], sources: [], summary: "" });
      case "position_paper":
        return withBlockDesignDefaults({
          subject: "",
          recipient: "",
          background: "",
          problem: "",
          affected: "",
          solution: "",
          advantages: "",
          objections: "",
          action_plan: "",
        });
      case "pitch":
        return withBlockDesignDefaults({
          hook: "",
          story: "",
          message: "",
          ask: "",
          closing: "",
        });
      default:
        return {};
    }
  }

  const insertElement = (
    stageId: string,
    containerId: string,
    rowId: string,
    columnId: string,
    type: ElementType,
    index?: number
  ): string => {
    const newElement: Element = {
      id: createId("element"),
      type,
      config: getDefaultElementConfig(type),
    };

    updateDraft((prev) => {
      const next = structuredClone(prev) as HackathonDefinition;
      const found = findColumn(next, { stageId, containerId, rowId, columnId });
      if (!found) return prev;
      const insertIndex = Math.max(
        0,
        Math.min(index ?? found.column.elements.length, found.column.elements.length)
      );
      found.column.elements.splice(insertIndex, 0, newElement);
      return next;
    });

    return newElement.id;
  };

  const deleteElement = (
    stageId: string,
    containerId: string,
    rowId: string,
    columnId: string,
    elementId: string
  ) => {
    updateDraft((prev) => {
      const next = structuredClone(prev) as HackathonDefinition;
      const found = findColumn(next, { stageId, containerId, rowId, columnId });
      if (!found) return prev;
      found.column.elements = found.column.elements.filter((element) => element.id !== elementId);
      return next;
    });

    if (
      selectedElement?.stageId === stageId &&
      selectedElement?.containerId === containerId &&
      selectedElement?.rowId === rowId &&
      selectedElement?.columnId === columnId &&
      selectedElement?.elementId === elementId
    ) {
      setSelectedElement(null);
    }
  };

  const updateElementConfig = (
    stageId: string,
    containerId: string,
    rowId: string,
    columnId: string,
    elementId: string,
    configPatch: Record<string, unknown>
  ) => {
    updateDraft((prev) => ({
      ...prev,
      stages: prev.stages.map((stage) =>
        stage.id === stageId
          ? {
              ...stage,
              containers: stage.containers.map((container) =>
                container.id === containerId
                  ? {
                      ...container,
                      rows: container.rows.map((row) =>
                        row.id === rowId
                          ? {
                              ...row,
                              columns: row.columns.map((column) =>
                                column.id === columnId
                                  ? {
                                      ...column,
                                      elements: column.elements.map((element) =>
                                        element.id === elementId
                                          ? { ...element, config: { ...element.config, ...configPatch } }
                                          : element
                                      ),
                                    }
                                  : column
                              ),
                            }
                          : row
                      ),
                    }
                  : container
              ),
            }
          : stage
      ),
    }));
  };

  const updateElementGlobal = (
    stageId: string,
    containerId: string,
    rowId: string,
    columnId: string,
    elementId: string,
    globalProps: Record<string, unknown>
  ) => {
    updateDraft((prev) => ({
      ...prev,
      stages: prev.stages.map((stage) =>
        stage.id === stageId
          ? {
              ...stage,
              containers: stage.containers.map((container) =>
                container.id === containerId
                  ? {
                      ...container,
                      rows: container.rows.map((row) =>
                        row.id === rowId
                          ? {
                              ...row,
                              columns: row.columns.map((column) =>
                                column.id === columnId
                                  ? {
                                      ...column,
                                      elements: column.elements.map((element) =>
                                        element.id === elementId
                                          ? ({ ...(element as Record<string, unknown>), ...globalProps } as Element)
                                          : element
                                      ),
                                    }
                                  : column
                              ),
                            }
                          : row
                      ),
                    }
                  : container
              ),
            }
          : stage
      ),
    }));
  };

  const updateLayoutSettings = (
    selection: {
      kind: "stage" | "container" | "row" | "column";
      stageId: string;
      containerId?: string;
      rowId?: string;
      columnId?: string;
    },
    patch: Record<string, unknown>
  ) => {
    updateDraft((prev) => {
      const next = structuredClone(prev) as HackathonDefinition;

      if (selection.kind === "stage") {
        const stage = next.stages.find((item) => item.id === selection.stageId);
        if (!stage) return prev;
        stage.settings = { ...(stage.settings ?? {}), ...patch } as LayoutSettings;
        return next;
      }

      if (selection.kind === "container" && selection.containerId) {
        const found = findContainer(next, { stageId: selection.stageId, containerId: selection.containerId });
        if (!found) return prev;
        found.container.settings = { ...(found.container.settings ?? {}), ...patch } as LayoutSettings;
        return next;
      }

      if (selection.kind === "row" && selection.containerId && selection.rowId) {
        const found = findRow(next, {
          stageId: selection.stageId,
          containerId: selection.containerId,
          rowId: selection.rowId,
        });
        if (!found) return prev;
        found.row.settings = { ...(found.row.settings ?? {}), ...patch } as LayoutSettings;
        return next;
      }

      if (selection.kind === "column" && selection.containerId && selection.rowId && selection.columnId) {
        const found = findColumn(next, {
          stageId: selection.stageId,
          containerId: selection.containerId,
          rowId: selection.rowId,
          columnId: selection.columnId,
        });
        if (!found) return prev;
        found.column.settings = { ...(found.column.settings ?? {}), ...patch } as LayoutSettings;
        return next;
      }

      return prev;
    });
  };

  const selectedElementData = selectedElement
    ? (() => {
        const stage = draft.stages.find((item) => item.id === selectedElement.stageId);
        const container = stage?.containers.find((item) => item.id === selectedElement.containerId);
        const row = container?.rows.find((item) => item.id === selectedElement.rowId);
        const column = row?.columns.find((item) => item.id === selectedElement.columnId);
        const element = column?.elements.find((item) => item.id === selectedElement.elementId);
        if (!stage || !container || !row || !column || !element) return null;
        return { ...selectedElement, element };
      })()
    : null;

  const selectedLayoutNodeData = selectedLayoutNode
    ? (() => {
        if (selectedLayoutNode.kind === "stage") {
          const stage = draft.stages.find((item) => item.id === selectedLayoutNode.stageId);
          if (!stage) return null;
          return { ...selectedLayoutNode, settings: stage.settings ?? {} };
        }
        if (selectedLayoutNode.kind === "container") {
          const found = findContainer(draft, selectedLayoutNode);
          if (!found) return null;
          return { ...selectedLayoutNode, settings: found.container.settings ?? {} };
        }
        if (selectedLayoutNode.kind === "row") {
          const found = findRow(draft, selectedLayoutNode);
          if (!found) return null;
          return { ...selectedLayoutNode, settings: found.row.settings ?? {} };
        }
        const found = findColumn(draft, selectedLayoutNode);
        if (!found) return null;
        return { ...selectedLayoutNode, settings: found.column.settings ?? {} };
      })()
    : null;

  const handleDragStart = (event: DragStartEvent) => {
    const data = event.active.data.current as DragData | undefined;
    if (!data) {
      setActiveDrag(null);
      return;
    }
    if (data.kind === "palette") {
      setActiveDrag({ kind: "palette", type: data.type });
      return;
    }
    if (data.kind === "element") {
      setActiveDrag({ kind: "element", type: data.type });
      return;
    }
    if (data.kind === "stage") {
      setActiveDrag({ kind: "stage" });
      return;
    }
    if (data.kind === "container") {
      setActiveDrag({ kind: "container" });
      return;
    }
    if (data.kind === "row") {
      setActiveDrag({ kind: "row" });
      return;
    }
    if (data.kind === "column") {
      setActiveDrag({ kind: "column" });
      return;
    }
    setActiveDrag(null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const activeData = event.active.data.current as DragData | undefined;
    const overData = event.over?.data.current as DragData | undefined;
    setActiveDrag(null);
    if (!activeData || !event.over) return;

    if (activeData.kind === "stage" && overData?.kind === "stage") {
      updateDraft((prev) => {
        const fromIndex = prev.stages.findIndex((stage) => stage.id === activeData.stageId);
        const toIndex = prev.stages.findIndex((stage) => stage.id === overData.stageId);
        if (fromIndex < 0 || toIndex < 0 || fromIndex === toIndex) return prev;
        return { ...prev, stages: arrayMove(prev.stages, fromIndex, toIndex) };
      });
      return;
    }

    if (activeData.kind === "container" && overData) {
      updateDraft((prev) => {
        const next = structuredClone(prev) as HackathonDefinition;
        const sourceFound = findContainer(next, activeData.location);
        if (!sourceFound) return prev;

        const sourceStage = sourceFound.stage;
        const sourceIndex = sourceStage.containers.findIndex(
          (item) => item.id === activeData.location.containerId
        );
        if (sourceIndex < 0) return prev;

        const [movedContainer] = sourceStage.containers.splice(sourceIndex, 1);
        let targetStageId: string | null = null;
        let targetIndex = -1;

        if (overData.kind === "container") {
          targetStageId = overData.location.stageId;
          const targetStage = findStage(next, targetStageId);
          if (!targetStage) return prev;
          targetIndex = targetStage.containers.findIndex(
            (item) => item.id === overData.location.containerId
          );
          if (targetIndex < 0) targetIndex = targetStage.containers.length;
          targetStage.containers.splice(targetIndex, 0, movedContainer);
        } else if (overData.kind === "container-drop") {
          targetStageId = overData.stageId;
          const targetStage = findStage(next, targetStageId);
          if (!targetStage) return prev;
          targetStage.containers.push(movedContainer);
        } else {
          return prev;
        }

        if (selectedElement && selectedElement.containerId === movedContainer.id) {
          setSelectedElement({ ...selectedElement, stageId: targetStageId ?? selectedElement.stageId });
        }
        if (selectedLayoutNode?.kind === "container" && selectedLayoutNode.containerId === movedContainer.id) {
          setSelectedLayoutNode({
            kind: "container",
            stageId: targetStageId ?? selectedLayoutNode.stageId,
            containerId: movedContainer.id,
          });
        }
        if (selectedLayoutNode?.kind === "column" && selectedLayoutNode.containerId === movedContainer.id) {
          setSelectedLayoutNode({
            ...selectedLayoutNode,
            stageId: targetStageId ?? selectedLayoutNode.stageId,
          });
        }

        return next;
      });
      return;
    }

    if (activeData.kind === "row" && overData) {
      updateDraft((prev) => {
        const next = structuredClone(prev) as HackathonDefinition;
        const sourceFound = findRow(next, activeData.location);
        if (!sourceFound) return prev;

        const sourceRows = sourceFound.container.rows;
        const sourceIndex = sourceRows.findIndex((item) => item.id === activeData.location.rowId);
        if (sourceIndex < 0) return prev;
        const [movedRow] = sourceRows.splice(sourceIndex, 1);

        let targetLocation: { stageId: string; containerId: string; rowId?: string } | null = null;
        if (overData.kind === "row") {
          targetLocation = overData.location;
        } else if (overData.kind === "row-drop") {
          targetLocation = overData.location;
        } else {
          return prev;
        }

        const targetFound = findContainer(next, {
          stageId: targetLocation.stageId,
          containerId: targetLocation.containerId,
        });
        if (!targetFound) return prev;

        if (overData.kind === "row") {
          const targetIndex = targetFound.container.rows.findIndex((item) => item.id === targetLocation.rowId);
          targetFound.container.rows.splice(
            targetIndex >= 0 ? targetIndex : targetFound.container.rows.length,
            0,
            movedRow
          );
        } else {
          targetFound.container.rows.push(movedRow);
        }

        if (selectedElement && selectedElement.rowId === movedRow.id) {
          setSelectedElement({
            ...selectedElement,
            stageId: targetLocation.stageId,
            containerId: targetLocation.containerId,
          });
        }
        if (selectedLayoutNode?.kind === "row" && selectedLayoutNode.rowId === movedRow.id) {
          setSelectedLayoutNode({
            kind: "row",
            stageId: targetLocation.stageId,
            containerId: targetLocation.containerId,
            rowId: movedRow.id,
          });
        }
        if (selectedLayoutNode?.kind === "column" && selectedLayoutNode.rowId === movedRow.id) {
          setSelectedLayoutNode({
            ...selectedLayoutNode,
            stageId: targetLocation.stageId,
            containerId: targetLocation.containerId,
          });
        }

        return next;
      });
      return;
    }

    if (activeData.kind === "column" && overData) {
      updateDraft((prev) => {
        const next = structuredClone(prev) as HackathonDefinition;
        const sourceFound = findColumn(next, activeData.location);
        if (!sourceFound) return prev;

        const sourceColumns = sourceFound.row.columns;
        const sourceIndex = sourceColumns.findIndex((item) => item.id === activeData.location.columnId);
        if (sourceIndex < 0) return prev;
        const [movedColumn] = sourceColumns.splice(sourceIndex, 1);

        let targetLocation: { stageId: string; containerId: string; rowId: string; columnId?: string } | null = null;
        if (overData.kind === "column") {
          targetLocation = overData.location;
        } else if (overData.kind === "column-drop") {
          targetLocation = overData.location;
        } else {
          return prev;
        }

        const targetFound = findRow(next, {
          stageId: targetLocation.stageId,
          containerId: targetLocation.containerId,
          rowId: targetLocation.rowId,
        });
        if (!targetFound) return prev;

        if (overData.kind === "column") {
          const targetIndex = targetFound.row.columns.findIndex(
            (item) => item.id === targetLocation.columnId
          );
          targetFound.row.columns.splice(
            targetIndex >= 0 ? targetIndex : targetFound.row.columns.length,
            0,
            movedColumn
          );
        } else {
          targetFound.row.columns.push(movedColumn);
        }

        if (selectedElement && selectedElement.columnId === movedColumn.id) {
          setSelectedElement({
            ...selectedElement,
            stageId: targetLocation.stageId,
            containerId: targetLocation.containerId,
            rowId: targetLocation.rowId,
          });
        }
        if (selectedLayoutNode?.kind === "column" && selectedLayoutNode.columnId === movedColumn.id) {
          setSelectedLayoutNode({
            kind: "column",
            stageId: targetLocation.stageId,
            containerId: targetLocation.containerId,
            rowId: targetLocation.rowId,
            columnId: movedColumn.id,
          });
        }

        return next;
      });
      return;
    }

    const target = resolveElementDropTarget(draft, overData);
    if (!target) return;

    if (activeData.kind === "palette") {
      const newElementId = insertElement(
        target.stageId,
        target.containerId,
        target.rowId,
        target.columnId,
        activeData.type,
        target.index
      );
      setSelectedLayoutNode(null);
      setSelectedElement({
        stageId: target.stageId,
        containerId: target.containerId,
        rowId: target.rowId,
        columnId: target.columnId,
        elementId: newElementId,
      });
      return;
    }

    if (activeData.kind !== "element") return;

    const source = activeData.location;
    updateDraft((prev) => {
      const next = structuredClone(prev) as HackathonDefinition;
      const sourceFound = findColumn(next, source);
      const targetFound = findColumn(next, target);
      if (!sourceFound || !targetFound) return prev;

      const fromIndex = sourceFound.column.elements.findIndex((item) => item.id === source.elementId);
      if (fromIndex < 0) return prev;

      const sameColumn =
        source.stageId === target.stageId &&
        source.containerId === target.containerId &&
        source.rowId === target.rowId &&
        source.columnId === target.columnId;

      if (sameColumn) {
        const toIndex = Math.max(0, Math.min(target.index, sourceFound.column.elements.length - 1));
        if (toIndex === fromIndex) return prev;
        sourceFound.column.elements = arrayMove(sourceFound.column.elements, fromIndex, toIndex);
      } else {
        const [moved] = sourceFound.column.elements.splice(fromIndex, 1);
        const insertIndex = Math.max(0, Math.min(target.index, targetFound.column.elements.length));
        targetFound.column.elements.splice(insertIndex, 0, moved);
        if (selectedElement?.elementId === moved.id) {
          setSelectedElement({
            stageId: target.stageId,
            containerId: target.containerId,
            rowId: target.rowId,
            columnId: target.columnId,
            elementId: moved.id,
          });
        }
      }

      return next;
    });
  };

  const changeTheme = (theme: ThemeName) => {
    updateDraft((prev) => ({ ...prev, themeName: theme }));
  };

  const handleSaveAsTemplate = async (): Promise<{ ok: true; id: string } | { ok: false }> => {
    if (initialIsTemplate) {
      return { ok: false };
    }

    return new Promise<{ ok: true; id: string } | { ok: false }>((resolve) => {
      startSavingTemplate(async () => {
        const result = await saveAsTemplate(hackathonId);
        if (result.ok) {
          resolve(result);
          return;
        }
        window.alert(result.error ?? t("errorGeneric"));
        resolve({ ok: false });
      });
    });
  };

  const handleUpdateHackathonSettings = async (title: string, description: string) => {
    return new Promise<boolean>((resolve) => {
      startUpdatingHackathonSettings(async () => {
        const result = await updateHackathonSettings(hackathonId, title, description);
        if (!result.ok) {
          window.alert(result.error ?? t("errorGeneric"));
          resolve(false);
          return;
        }

        setHackathonTitle(title);
        setHackathonDescription(description);
        updateDraft((prev) => ({ ...prev, title, description }), { recordHistory: false });
        resolve(true);
      });
    });
  };

  return (
    <DndContext
      id="builder-dnd-context"
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex h-screen flex-col overflow-hidden">
        <BuilderHeader
          key={hackathonId}
          hackathonId={hackathonId}
          title={hackathonTitle}
          description={hackathonDescription}
          isTemplate={initialIsTemplate}
          isSavingTemplate={isSavingTemplate}
          isUpdatingHackathonSettings={isUpdatingHackathonSettings}
          onSaveAsTemplate={handleSaveAsTemplate}
          onUpdateHackathonSettings={handleUpdateHackathonSettings}
          canUndo={canUndo}
          canRedo={canRedo}
          onUndo={handleUndo}
          onRedo={handleRedo}
        />
        <div className="grid min-h-0 flex-1 grid-cols-[20rem_1fr]">
          <BuilderSidebar
            onAddStage={addStage}
            selectedElement={selectedElementData}
            selectedLayoutNode={selectedLayoutNodeData}
            onDeselect={() => {
              setSelectedElement(null);
              setSelectedLayoutNode(null);
            }}
            onUpdateElementConfig={updateElementConfig}
            onUpdateElementGlobal={updateElementGlobal}
            onUpdateLayoutSettings={updateLayoutSettings}
            paletteTypes={PALETTE_TYPES}
            currentTheme={
              THEME_NAMES.includes(draft.themeName as ThemeName)
                ? (draft.themeName as ThemeName)
                : "simple"
            }
            onThemeChange={changeTheme}
          />
          <BuilderCanvas
            definition={draft}
            hackathonTitle={hackathonTitle}
            hackathonDescription={hackathonDescription}
            onAddStage={addStage}
            onUpdateStageTitle={updateStageTitle}
            onDeleteStage={deleteStage}
            onAddContainer={addContainer}
            onDeleteContainer={deleteContainer}
            onDuplicateContainer={duplicateContainer}
            onAddRow={addRow}
            onDeleteRow={deleteRow}
            onDuplicateRow={duplicateRow}
            onAddColumn={addColumn}
            onDeleteColumn={deleteColumn}
            onDuplicateColumn={duplicateColumn}
            selectedElement={selectedElement}
            onSelectElement={(selected) => {
              setSelectedElement(selected);
              setSelectedLayoutNode(null);
            }}
            onSelectLayoutNode={(selected) => {
              setSelectedLayoutNode(selected);
              setSelectedElement(null);
            }}
            onDeleteElement={deleteElement}
          />
        </div>
      </div>
      <DragOverlay>
        {activeDrag ? (
          <div className="rounded-lg border border-primary bg-primary/10 px-3 py-2 text-sm font-medium text-foreground shadow-sm">
            {activeDrag.kind === "palette" || activeDrag.kind === "element"
              ? t(activeDrag.type)
              : t("builder")}
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
