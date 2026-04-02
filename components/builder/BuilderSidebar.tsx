"use client";

import { t } from "@/lib/i18n";
import type { Element, ElementType } from "@/lib/types";
import {
  AlignLeft,
  AlertTriangle,
  FileText,
  FlaskConical,
  Image as ImageIcon,
  LayoutTemplate,
  List,
  ListChecks,
  Megaphone,
  TextCursorInput,
  Type,
  Video,
} from "lucide-react";
import { DraggablePaletteItem } from "./DraggablePaletteItem";

interface SelectedElementData {
  stageId: string;
  containerId: string;
  columnId: string;
  elementId: string;
  element: Element;
}

interface BuilderSidebarProps {
  saveLabel: string;
  onAddStage: () => void;
  selectedElement: SelectedElementData | null;
  paletteTypes: ElementType[];
  onDeselect: () => void;
  onUpdateElementConfig: (
    stageId: string,
    containerId: string,
    columnId: string,
    elementId: string,
    configPatch: Record<string, unknown>
  ) => void;
  onUpdateElementGlobal: (
    stageId: string,
    containerId: string,
    columnId: string,
    elementId: string,
    globalProps: Record<string, unknown>
  ) => void;
}

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((item): item is string => typeof item === "string");
}

function asStringList(value: unknown): string {
  return asStringArray(value).join(", ");
}

function toColorInputValue(value: string, fallback: string): string {
  return /^#(?:[0-9a-fA-F]{3}){1,2}$/.test(value) ? value : fallback;
}

function updateSelectedConfig(
  selected: SelectedElementData,
  patch: Record<string, unknown>,
  onUpdateElementConfig: BuilderSidebarProps["onUpdateElementConfig"]
) {
  onUpdateElementConfig(
    selected.stageId,
    selected.containerId,
    selected.columnId,
    selected.elementId,
    patch
  );
}

function updateSelectedGlobal(
  selected: SelectedElementData,
  patch: Record<string, unknown>,
  onUpdateElementGlobal: BuilderSidebarProps["onUpdateElementGlobal"]
) {
  onUpdateElementGlobal(
    selected.stageId,
    selected.containerId,
    selected.columnId,
    selected.elementId,
    patch
  );
}

function getPaletteIcon(type: ElementType) {
  switch (type) {
    case "heading":
      return Type;
    case "text":
      return AlignLeft;
    case "image":
      return ImageIcon;
    case "video":
      return Video;
    case "hero":
      return LayoutTemplate;
    case "alert":
      return AlertTriangle;
    case "list":
      return List;
    case "short_text":
      return TextCursorInput;
    case "long_text":
      return AlignLeft;
    case "repeater_list":
      return ListChecks;
    case "research_block":
      return FlaskConical;
    case "position_paper":
      return FileText;
    case "pitch":
      return Megaphone;
    default:
      return FileText;
  }
}

export function BuilderSidebar({
  saveLabel,
  onAddStage,
  selectedElement,
  paletteTypes,
  onDeselect,
  onUpdateElementConfig,
  onUpdateElementGlobal,
}: BuilderSidebarProps) {
  if (!selectedElement) {
    return (
      <aside className="h-full overflow-y-auto border-l border-border bg-surface-raised p-4">
        <div className="space-y-3">
          <p className="text-sm font-medium text-foreground/80">{saveLabel}</p>
          <button
            type="button"
            className="w-full rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground"
            onClick={onAddStage}
          >
            {t("addStage")}
          </button>
          <div className="grid grid-cols-2 gap-2 pt-2">
            {paletteTypes.map((type) => (
              <DraggablePaletteItem
                key={type}
                type={type}
                label={t(type)}
                Icon={getPaletteIcon(type)}
              />
            ))}
          </div>
        </div>
      </aside>
    );
  }

  const config = selectedElement.element.config;
  const elementRecord = selectedElement.element as Record<string, unknown>;
  const badgeText = asString(elementRecord.badgeText);
  const styleOverrides =
    elementRecord.styleOverrides &&
    typeof elementRecord.styleOverrides === "object" &&
    !Array.isArray(elementRecord.styleOverrides)
      ? (elementRecord.styleOverrides as Record<string, unknown>)
      : {};
  const textColor = asString(styleOverrides.textColor);
  const backgroundColor = asString(styleOverrides.backgroundColor);
  const borderStyle = asString(styleOverrides.border);
  const shadowStyle = asString(styleOverrides.shadow);
  const positionPaperFields = [
    { label: "subject", key: "subject" },
    { label: "recipient", key: "recipient" },
    { label: "background", key: "background" },
    { label: "problem", key: "problem" },
    { label: "affected", key: "affected" },
    { label: "solution", key: "solution" },
    { label: "advantages", key: "advantages" },
    { label: "objections", key: "objections" },
    { label: "actionPlan", key: "action_plan" },
  ] as const;
  const pitchFields = ["hook", "story", "message", "ask", "closing"] as const;

  return (
    <aside className="h-full overflow-y-auto border-l border-border bg-surface-raised p-4">
      <div className="space-y-3">
        <button
          type="button"
          className="rounded-lg border border-border bg-background px-3 py-1.5 text-sm"
          onClick={onDeselect}
        >
          {t("back")}
        </button>

        <p className="text-sm font-semibold">{t(selectedElement.element.type)}</p>
        <p className="text-xs text-foreground/70">{saveLabel}</p>

        {selectedElement.element.type === "heading" ? (
          <>
            <label className="block space-y-1">
              <span className="text-xs">{t("text")}</span>
              <input
                type="text"
                value={asString(config.text)}
                className="w-full rounded border border-border bg-background px-2 py-1.5 text-sm"
                onChange={(event) =>
                  updateSelectedConfig(
                    selectedElement,
                    { text: event.target.value },
                    onUpdateElementConfig
                  )
                }
              />
            </label>
            <label className="block space-y-1">
              <span className="text-xs">{t("level")}</span>
              <select
                value={
                  config.level === "h1" || config.level === "h3"
                    ? config.level
                    : "h2"
                }
                className="w-full rounded border border-border bg-background px-2 py-1.5 text-sm"
                onChange={(event) =>
                  updateSelectedConfig(
                    selectedElement,
                    { level: event.target.value },
                    onUpdateElementConfig
                  )
                }
              >
                <option value="h1">H1</option>
                <option value="h2">H2</option>
                <option value="h3">H3</option>
              </select>
            </label>
          </>
        ) : null}

        {selectedElement.element.type === "text" ? (
          <label className="block space-y-1">
            <span className="text-xs">{t("content")}</span>
            <textarea
              value={asString(config.content)}
              className="min-h-24 w-full rounded border border-border bg-background px-2 py-1.5 text-sm"
              onChange={(event) =>
                updateSelectedConfig(
                  selectedElement,
                  { content: event.target.value },
                  onUpdateElementConfig
                )
              }
            />
          </label>
        ) : null}

        {selectedElement.element.type === "image" ? (
          <>
            <label className="block space-y-1">
              <span className="text-xs">{t("url")}</span>
              <input
                type="text"
                value={asString(config.url)}
                className="w-full rounded border border-border bg-background px-2 py-1.5 text-sm"
                onChange={(event) =>
                  updateSelectedConfig(
                    selectedElement,
                    { url: event.target.value },
                    onUpdateElementConfig
                  )
                }
              />
            </label>
            <label className="block space-y-1">
              <span className="text-xs">{t("alt")}</span>
              <input
                type="text"
                value={asString(config.alt)}
                className="w-full rounded border border-border bg-background px-2 py-1.5 text-sm"
                onChange={(event) =>
                  updateSelectedConfig(
                    selectedElement,
                    { alt: event.target.value },
                    onUpdateElementConfig
                  )
                }
              />
            </label>
          </>
        ) : null}

        {selectedElement.element.type === "video" ? (
          <label className="block space-y-1">
            <span className="text-xs">{t("youtubeId")}</span>
            <input
              type="text"
              value={asString(config.youtubeId)}
              className="w-full rounded border border-border bg-background px-2 py-1.5 text-sm"
              onChange={(event) =>
                updateSelectedConfig(
                  selectedElement,
                  { youtubeId: event.target.value },
                  onUpdateElementConfig
                )
              }
            />
          </label>
        ) : null}

        {selectedElement.element.type === "hero" ? (
          <>
            <label className="block space-y-1">
              <span className="text-xs">{t("title")}</span>
              <input
                type="text"
                value={asString(config.title)}
                className="w-full rounded border border-border bg-background px-2 py-1.5 text-sm"
                onChange={(event) =>
                  updateSelectedConfig(
                    selectedElement,
                    { title: event.target.value },
                    onUpdateElementConfig
                  )
                }
              />
            </label>
            <label className="block space-y-1">
              <span className="text-xs">{t("subtitle")}</span>
              <input
                type="text"
                value={asString(config.subtitle)}
                className="w-full rounded border border-border bg-background px-2 py-1.5 text-sm"
                onChange={(event) =>
                  updateSelectedConfig(
                    selectedElement,
                    { subtitle: event.target.value },
                    onUpdateElementConfig
                  )
                }
              />
            </label>
            <label className="block space-y-1">
              <span className="text-xs">{t("align")}</span>
              <select
                value={config.align === "center" ? "center" : "right"}
                className="w-full rounded border border-border bg-background px-2 py-1.5 text-sm"
                onChange={(event) =>
                  updateSelectedConfig(
                    selectedElement,
                    { align: event.target.value },
                    onUpdateElementConfig
                  )
                }
              >
                <option value="right">{t("right")}</option>
                <option value="center">{t("center")}</option>
              </select>
            </label>
          </>
        ) : null}

        {selectedElement.element.type === "alert" ? (
          <>
            <label className="block space-y-1">
              <span className="text-xs">{t("alertType")}</span>
              <select
                value={
                  config.type === "warning" || config.type === "success"
                    ? config.type
                    : "info"
                }
                className="w-full rounded border border-border bg-background px-2 py-1.5 text-sm"
                onChange={(event) =>
                  updateSelectedConfig(
                    selectedElement,
                    { type: event.target.value },
                    onUpdateElementConfig
                  )
                }
              >
                <option value="info">{t("info")}</option>
                <option value="warning">{t("warning")}</option>
                <option value="success">{t("success")}</option>
              </select>
            </label>
            <label className="block space-y-1">
              <span className="text-xs">{t("text")}</span>
              <input
                type="text"
                value={asString(config.text)}
                className="w-full rounded border border-border bg-background px-2 py-1.5 text-sm"
                onChange={(event) =>
                  updateSelectedConfig(
                    selectedElement,
                    { text: event.target.value },
                    onUpdateElementConfig
                  )
                }
              />
            </label>
          </>
        ) : null}

        {selectedElement.element.type === "list" ? (
          <>
            <label className="block space-y-1">
              <span className="text-xs">{t("items")}</span>
              <textarea
                value={asStringList(config.items)}
                className="min-h-24 w-full rounded border border-border bg-background px-2 py-1.5 text-sm"
                onChange={(event) =>
                  updateSelectedConfig(
                    selectedElement,
                    {
                      items: event.target.value
                        .split(",")
                        .map((item) => item.trim())
                        .filter(Boolean),
                    },
                    onUpdateElementConfig
                  )
                }
              />
            </label>
            <label className="block space-y-1">
              <span className="text-xs">{t("style")}</span>
              <select
                value={config.style === "numbers" ? "numbers" : "bullets"}
                className="w-full rounded border border-border bg-background px-2 py-1.5 text-sm"
                onChange={(event) =>
                  updateSelectedConfig(
                    selectedElement,
                    { style: event.target.value },
                    onUpdateElementConfig
                  )
                }
              >
                <option value="bullets">{t("bullets")}</option>
                <option value="numbers">{t("numbers")}</option>
              </select>
            </label>
          </>
        ) : null}

        {selectedElement.element.type === "short_text" ||
        selectedElement.element.type === "long_text" ? (
          <label className="block space-y-1">
            <span className="text-xs">{t("placeholder")}</span>
            <input
              type="text"
              value={asString(config.placeholder)}
              className="w-full rounded border border-border bg-background px-2 py-1.5 text-sm"
              onChange={(event) =>
                updateSelectedConfig(
                  selectedElement,
                  { placeholder: event.target.value },
                  onUpdateElementConfig
                )
              }
            />
          </label>
        ) : null}

        {selectedElement.element.type === "repeater_list" ? (
          <>
            <label className="block space-y-1">
              <span className="text-xs">{t("placeholder")}</span>
              <input
                type="text"
                value={asString(config.placeholder)}
                className="w-full rounded border border-border bg-background px-2 py-1.5 text-sm"
                onChange={(event) =>
                  updateSelectedConfig(
                    selectedElement,
                    { placeholder: event.target.value },
                    onUpdateElementConfig
                  )
                }
              />
            </label>
            <label className="block space-y-1">
              <span className="text-xs">{t("addButtonText")}</span>
              <input
                type="text"
                value={asString(config.addButtonText)}
                className="w-full rounded border border-border bg-background px-2 py-1.5 text-sm"
                onChange={(event) =>
                  updateSelectedConfig(
                    selectedElement,
                    { addButtonText: event.target.value },
                    onUpdateElementConfig
                  )
                }
              />
            </label>
          </>
        ) : null}

        {selectedElement.element.type === "research_block" ? (
          <>
            <label className="block space-y-1">
              <span className="text-xs">{t("researchTitle")}</span>
              <input
                type="text"
                value={asString(config.title)}
                className="w-full rounded border border-border bg-background px-2 py-1.5 text-sm"
                onChange={(event) =>
                  updateSelectedConfig(
                    selectedElement,
                    { title: event.target.value },
                    onUpdateElementConfig
                  )
                }
              />
            </label>
            <label className="block space-y-1">
              <span className="text-xs">{t("summary")}</span>
              <textarea
                value={asString(config.summary)}
                className="min-h-20 w-full rounded border border-border bg-background px-2 py-1.5 text-sm"
                onChange={(event) =>
                  updateSelectedConfig(
                    selectedElement,
                    { summary: event.target.value },
                    onUpdateElementConfig
                  )
                }
              />
            </label>
          </>
        ) : null}

        {selectedElement.element.type === "position_paper" ? (
          <div className="space-y-2">
            {positionPaperFields.map((field) => {
              return (
                <label key={field.key} className="block space-y-1">
                  <span className="text-xs">{t(field.label)}</span>
                  <textarea
                    value={asString(config[field.key])}
                    className="min-h-16 w-full rounded border border-border bg-background px-2 py-1.5 text-sm"
                    onChange={(event) =>
                      updateSelectedConfig(
                        selectedElement,
                        { [field.key]: event.target.value },
                        onUpdateElementConfig
                      )
                    }
                  />
                </label>
              );
            })}
          </div>
        ) : null}

        {selectedElement.element.type === "pitch" ? (
          <div className="space-y-2">
            {pitchFields.map((key) => (
              <label key={key} className="block space-y-1">
                <span className="text-xs">{t(key)}</span>
                <textarea
                  value={asString(config[key])}
                  className="min-h-16 w-full rounded border border-border bg-background px-2 py-1.5 text-sm"
                  onChange={(event) =>
                    updateSelectedConfig(
                      selectedElement,
                      { [key]: event.target.value },
                      onUpdateElementConfig
                    )
                  }
                />
              </label>
            ))}
          </div>
        ) : null}

        <div className="mt-4 space-y-2 border-t border-border pt-3">
          <p className="text-xs font-semibold text-foreground/80">
            {t("designSettings")}
          </p>

          <label className="block space-y-1">
            <span className="text-xs">{t("badgeText")}</span>
            <input
              type="text"
              value={badgeText}
              placeholder={t("badgePlaceholder")}
              className="w-full rounded border border-border bg-background px-2 py-1.5 text-sm"
              onChange={(event) =>
                updateSelectedGlobal(
                  selectedElement,
                  { badgeText: event.target.value },
                  onUpdateElementGlobal
                )
              }
            />
          </label>

          <label className="block space-y-1">
            <span className="text-xs">{t("textColor")}</span>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={toColorInputValue(textColor, "#111827")}
                className="h-9 w-full rounded border border-border bg-background p-1"
                onChange={(event) =>
                  updateSelectedGlobal(
                    selectedElement,
                    {
                      styleOverrides: {
                        ...styleOverrides,
                        textColor: event.target.value,
                      },
                    },
                    onUpdateElementGlobal
                  )
                }
              />
              <button
                type="button"
                className="rounded border border-border bg-background px-2 py-1.5 text-xs"
                onClick={() =>
                  updateSelectedGlobal(
                    selectedElement,
                    {
                      styleOverrides: {
                        ...styleOverrides,
                        textColor: "",
                      },
                    },
                    onUpdateElementGlobal
                  )
                }
              >
                {t("clearColor")}
              </button>
            </div>
          </label>

          <label className="block space-y-1">
            <span className="text-xs">{t("backgroundColor")}</span>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={toColorInputValue(backgroundColor, "#ffffff")}
                className="h-9 w-full rounded border border-border bg-background p-1"
                onChange={(event) =>
                  updateSelectedGlobal(
                    selectedElement,
                    {
                      styleOverrides: {
                        ...styleOverrides,
                        backgroundColor: event.target.value,
                      },
                    },
                    onUpdateElementGlobal
                  )
                }
              />
              <button
                type="button"
                className="rounded border border-border bg-background px-2 py-1.5 text-xs"
                onClick={() =>
                  updateSelectedGlobal(
                    selectedElement,
                    {
                      styleOverrides: {
                        ...styleOverrides,
                        backgroundColor: "",
                      },
                    },
                    onUpdateElementGlobal
                  )
                }
              >
                {t("clearColor")}
              </button>
            </div>
          </label>

          <label className="block space-y-1">
            <span className="text-xs">{t("borderStyle")}</span>
            <select
              value={borderStyle}
              className="w-full rounded border border-border bg-background px-2 py-1.5 text-sm"
              onChange={(event) =>
                updateSelectedGlobal(
                  selectedElement,
                  {
                    styleOverrides: {
                      ...styleOverrides,
                      border: event.target.value,
                    },
                  },
                  onUpdateElementGlobal
                )
              }
            >
              <option value="">{t("none")}</option>
              <option value="solid">{t("solid")}</option>
              <option value="dashed">{t("dashed")}</option>
            </select>
          </label>

          <label className="block space-y-1">
            <span className="text-xs">{t("shadowStyle")}</span>
            <select
              value={shadowStyle}
              className="w-full rounded border border-border bg-background px-2 py-1.5 text-sm"
              onChange={(event) =>
                updateSelectedGlobal(
                  selectedElement,
                  {
                    styleOverrides: {
                      ...styleOverrides,
                      shadow: event.target.value,
                    },
                  },
                  onUpdateElementGlobal
                )
              }
            >
              <option value="">{t("none")}</option>
              <option value="sm">{t("shadowSm")}</option>
              <option value="md">{t("shadowMd")}</option>
              <option value="lg">{t("shadowLg")}</option>
            </select>
          </label>
        </div>
      </div>
    </aside>
  );
}
