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
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { BuilderHeader } from "@/components/builder/BuilderHeader";
import { BuilderCanvas } from "@/components/builder/BuilderCanvas";
import { BuilderSidebar } from "@/components/builder/BuilderSidebar";
import { saveAsTemplate } from "@/lib/actions/hackathon";
import { t } from "@/lib/i18n";
import { createClient } from "@/lib/supabase/client";
import { THEME_NAMES, type ThemeName } from "@/lib/themes";
import type {
  Container,
  Element,
  ElementType,
  HackathonDefinition,
  Stage,
} from "@/lib/types";

interface BuilderClientProps {
  hackathonId: string;
  initialDefinition: HackathonDefinition;
  fallbackTitle: string;
}

type SaveState = "saved" | "saving";
type SelectedElementRef = {
  stageId: string;
  containerId: string;
  columnId: string;
  elementId: string;
};

type ColumnLocation = {
  stageId: string;
  containerId: string;
  columnId: string;
};

type ElementLocation = ColumnLocation & {
  elementId: string;
};

type DragData =
  | { kind: "palette"; type: ElementType }
  | { kind: "column"; location: ColumnLocation }
  | { kind: "element"; location: ElementLocation; type: ElementType };

type ActiveDrag =
  | null
  | { kind: "palette"; type: ElementType }
  | { kind: "element"; type: ElementType };

const SAVE_DEBOUNCE_MS = 1000;
const PALETTE_TYPES: ElementType[] = [
  "heading",
  "text",
  "image",
  "video",
  "hero",
  "alert",
  "list",
  "icon_card",
  "short_text",
  "long_text",
  "repeater_list",
  "advanced_repeater",
  "card_builder",
  "options_builder",
  "research_block",
  "position_paper",
  "pitch",
];

function createId(prefix: string): string {
  return `${prefix}-${crypto.randomUUID()}`;
}

function findColumn(definition: HackathonDefinition, location: ColumnLocation) {
  const stage = definition.stages.find((item) => item.id === location.stageId);
  if (!stage) {
    return null;
  }
  const container = stage.containers.find(
    (item) => item.id === location.containerId
  );
  if (!container) {
    return null;
  }
  const column = container.columns.find((item) => item.id === location.columnId);
  if (!column) {
    return null;
  }
  return { stage, container, column };
}

function resolveDropTarget(
  definition: HackathonDefinition,
  overData: DragData | undefined
): (ColumnLocation & { index: number }) | null {
  if (!overData) {
    return null;
  }

  if (overData.kind === "column") {
    const found = findColumn(definition, overData.location);
    if (!found) {
      return null;
    }
    return {
      ...overData.location,
      index: found.column.elements.length,
    };
  }

  if (overData.kind === "element") {
    const found = findColumn(definition, overData.location);
    if (!found) {
      return null;
    }
    const index = found.column.elements.findIndex(
      (item) => item.id === overData.location.elementId
    );
    if (index < 0) {
      return null;
    }
    return { ...overData.location, index };
  }

  return null;
}

export default function BuilderClient({
  hackathonId,
  initialDefinition,
  fallbackTitle,
}: BuilderClientProps) {
  const supabase = useMemo(() => createClient(), []);
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    })
  );
  const [draft, setDraft] = useState<HackathonDefinition>(initialDefinition);
  const [saveState, setSaveState] = useState<SaveState>("saved");
  const [selectedElement, setSelectedElement] = useState<SelectedElementRef | null>(
    null
  );
  const [activeDrag, setActiveDrag] = useState<ActiveDrag>(null);
  const [isSavingTemplate, startSavingTemplate] = useTransition();
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMountedRef = useRef(true);
  const isFirstRenderRef = useRef(true);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (isFirstRenderRef.current) {
      isFirstRenderRef.current = false;
      return;
    }

    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }

    saveTimerRef.current = setTimeout(async () => {
      const { error } = await supabase
        .from("hackathons")
        .update({ definition: draft })
        .eq("id", hackathonId);

      if (!error && isMountedRef.current) {
        setSaveState("saved");
      }
    }, SAVE_DEBOUNCE_MS);
  }, [draft, hackathonId, supabase]);

  const updateDraft = (
    updater: (previous: HackathonDefinition) => HackathonDefinition
  ) => {
    setSaveState("saving");
    setDraft((previous) => updater(previous));
  };

  const addStage = () => {
    const stage: Stage = {
      id: createId("stage"),
      title: "",
      containers: [],
    };
    updateDraft((prev) => ({ ...prev, stages: [...prev.stages, stage] }));
  };

  const deleteStage = (stageId: string) => {
    updateDraft((prev) => ({
      ...prev,
      stages: prev.stages.filter((stage) => stage.id !== stageId),
    }));
    if (selectedElement?.stageId === stageId) {
      setSelectedElement(null);
    }
  };

  const updateStageTitle = (stageId: string, title: string) => {
    updateDraft((prev) => ({
      ...prev,
      stages: prev.stages.map((stage) =>
        stage.id === stageId ? { ...stage, title } : stage
      ),
    }));
  };

  const addContainer = (stageId: string) => {
    const container: Container = {
      id: createId("container"),
      columns: [],
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
              containers: stage.containers.filter(
                (container) => container.id !== containerId
              ),
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
  };

  const addColumn = (stageId: string, containerId: string) => {
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
                      columns: [
                        ...container.columns,
                        { id: createId("column"), elements: [] },
                      ],
                    }
                  : container
              ),
            }
          : stage
      ),
    }));
  };

  const deleteColumn = (
    stageId: string,
    containerId: string,
    columnId: string
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
                      columns: container.columns.filter(
                        (column) => column.id !== columnId
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
      selectedElement?.columnId === columnId
    ) {
      setSelectedElement(null);
    }
  };

  function getDefaultElementConfig(type: ElementType): Record<string, unknown> {
    switch (type) {
      case "heading":
        return { text: "", level: "h2" };
      case "text":
        return { content: "" };
      case "image":
        return { url: "", alt: "" };
      case "video":
        return { youtubeId: "" };
      case "hero":
        return { title: "", subtitle: "", align: "right" };
      case "alert":
        return { type: "info", text: "" };
      case "list":
        return { items: [], style: "bullets" };
      case "icon_card":
        return {
          iconName: "Star",
          title: "",
          text: "",
        };
      case "short_text":
      case "long_text":
        return { placeholder: "" };
      case "repeater_list":
        return { placeholder: "", addButtonText: "" };
      case "advanced_repeater":
        return {
          fields: [{ id: createId("field").slice(-8), placeholder: "" }],
          addButtonText: "",
        };
      case "card_builder":
        return {
          layout: "vertical",
          gridColumns: 2,
          addButtonText: "",
          titlePlaceholder: "",
          descPlaceholder: "",
          inputPlaceholder: "",
        };
      case "options_builder":
        return {
          addButtonText: "",
          optionTitlePrefix: "",
        };
      case "research_block":
        return { title: "", findings: [], sources: [], summary: "" };
      case "position_paper":
        return {
          subject: "",
          recipient: "",
          background: "",
          problem: "",
          affected: "",
          solution: "",
          advantages: "",
          objections: "",
          action_plan: "",
        };
      case "pitch":
        return { hook: "", story: "", message: "", ask: "", closing: "" };
      default:
        return {};
    }
  }

  const insertElement = (
    stageId: string,
    containerId: string,
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
      const found = findColumn(next, { stageId, containerId, columnId });
      if (!found) {
        return prev;
      }
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
    columnId: string,
    elementId: string
  ) => {
    updateDraft((prev) => {
      const next = structuredClone(prev) as HackathonDefinition;
      const found = findColumn(next, { stageId, containerId, columnId });
      if (!found) {
        return prev;
      }
      found.column.elements = found.column.elements.filter(
        (element) => element.id !== elementId
      );
      return next;
    });

    if (
      selectedElement?.stageId === stageId &&
      selectedElement?.containerId === containerId &&
      selectedElement?.columnId === columnId &&
      selectedElement?.elementId === elementId
    ) {
      setSelectedElement(null);
    }
  };

  const updateElementConfig = (
    stageId: string,
    containerId: string,
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
                      columns: container.columns.map((column) =>
                        column.id === columnId
                          ? {
                              ...column,
                              elements: column.elements.map((element) =>
                                element.id === elementId
                                  ? {
                                      ...element,
                                      config: {
                                        ...element.config,
                                        ...configPatch,
                                      },
                                    }
                                  : element
                              ),
                            }
                          : column
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
                      columns: container.columns.map((column) =>
                        column.id === columnId
                          ? {
                              ...column,
                              elements: column.elements.map((element) => {
                                if (element.id !== elementId) {
                                  return element;
                                }
                                return {
                                  ...(element as Record<string, unknown>),
                                  ...globalProps,
                                } as Element;
                              }),
                            }
                          : column
                      ),
                    }
                  : container
              ),
            }
          : stage
      ),
    }));
  };

  const selectedElementData = selectedElement
    ? (() => {
        const stage = draft.stages.find((item) => item.id === selectedElement.stageId);
        const container = stage?.containers.find(
          (item) => item.id === selectedElement.containerId
        );
        const column = container?.columns.find(
          (item) => item.id === selectedElement.columnId
        );
        const element = column?.elements.find(
          (item) => item.id === selectedElement.elementId
        );
        if (!stage || !container || !column || !element) {
          return null;
        }
        return { ...selectedElement, element };
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

    setActiveDrag(null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const activeData = event.active.data.current as DragData | undefined;
    const overData = event.over?.data.current as DragData | undefined;

    setActiveDrag(null);

    if (!activeData || !event.over) {
      return;
    }

    const target = resolveDropTarget(draft, overData);
    if (!target) {
      return;
    }

    if (activeData.kind === "palette") {
      const newElementId = insertElement(
        target.stageId,
        target.containerId,
        target.columnId,
        activeData.type,
        target.index
      );
      setSelectedElement({
        stageId: target.stageId,
        containerId: target.containerId,
        columnId: target.columnId,
        elementId: newElementId,
      });
      return;
    }

    if (activeData.kind !== "element") {
      return;
    }

    const source = activeData.location;
    updateDraft((prev) => {
      const next = structuredClone(prev) as HackathonDefinition;
      const sourceFound = findColumn(next, source);
      const targetFound = findColumn(next, target);
      if (!sourceFound || !targetFound) {
        return prev;
      }

      const fromIndex = sourceFound.column.elements.findIndex(
        (item) => item.id === source.elementId
      );
      if (fromIndex < 0) {
        return prev;
      }

      const sameColumn =
        source.stageId === target.stageId &&
        source.containerId === target.containerId &&
        source.columnId === target.columnId;

      if (sameColumn) {
        const currentColumn = sourceFound.column;
        const toIndex = Math.max(
          0,
          Math.min(target.index, currentColumn.elements.length - 1)
        );
        if (toIndex === fromIndex) {
          return prev;
        }
        currentColumn.elements = arrayMove(currentColumn.elements, fromIndex, toIndex);
      } else {
        const [moved] = sourceFound.column.elements.splice(fromIndex, 1);
        const insertIndex = Math.max(
          0,
          Math.min(target.index, targetFound.column.elements.length)
        );
        targetFound.column.elements.splice(insertIndex, 0, moved);

        if (selectedElement?.elementId === moved.id) {
          setSelectedElement({
            stageId: target.stageId,
            containerId: target.containerId,
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

  const handleSaveAsTemplate = () => {
    startSavingTemplate(async () => {
      const result = await saveAsTemplate(hackathonId);
      if (result.ok) {
        window.alert(t("templateSaved"));
        return;
      }
      window.alert(result.error ?? t("errorGeneric"));
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
          hackathonId={hackathonId}
          saveLabel={saveState === "saving" ? t("saving") : t("saved")}
          isSavingTemplate={isSavingTemplate}
          onSaveAsTemplate={handleSaveAsTemplate}
        />
        <div className="grid min-h-0 flex-1 grid-cols-[20rem_1fr]">
          <BuilderSidebar
            saveLabel={saveState === "saving" ? t("saving") : t("saved")}
            onAddStage={addStage}
            selectedElement={selectedElementData}
            onDeselect={() => setSelectedElement(null)}
            onUpdateElementConfig={updateElementConfig}
            onUpdateElementGlobal={updateElementGlobal}
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
            fallbackTitle={fallbackTitle}
            onAddStage={addStage}
            onUpdateStageTitle={updateStageTitle}
            onDeleteStage={deleteStage}
            onAddContainer={addContainer}
            onDeleteContainer={deleteContainer}
            onAddColumn={addColumn}
            onDeleteColumn={deleteColumn}
            selectedElement={selectedElement}
            onSelectElement={setSelectedElement}
            onDeleteElement={deleteElement}
          />
        </div>
      </div>
      <DragOverlay>
        {activeDrag ? (
          <div className="rounded-lg border border-primary bg-primary/10 px-3 py-2 text-sm font-medium text-foreground shadow-sm">
            {t(activeDrag.type)}
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
