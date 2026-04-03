"use client";

import { useEffect, useRef, useState } from "react";
import { t } from "@/lib/i18n";
import type { Element, ElementType } from "@/lib/types";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  AlertTriangle,
  FileText,
  FlaskConical,
  Image as ImageIcon,
  LayoutGrid,
  LayoutTemplate,
  List,
  ListOrdered,
  ListChecks,
  Link as LinkIcon,
  Megaphone,
  Sparkles,
  Rows3,
  TextCursorInput,
  Type,
  Video,
} from "lucide-react";
import { THEME_NAMES, type ThemeName } from "@/lib/themes";
import type { DictionaryKey } from "@/lib/i18n";
import { asTagPosition, asTagSize } from "@/lib/utils/tag";
import { DraggablePaletteItem } from "./DraggablePaletteItem";
import { IconPicker } from "./IconPicker";
import { TextRichEditor } from "./TextRichEditor";

interface SelectedElementData {
  stageId: string;
  containerId: string;
  rowId: string;
  columnId: string;
  elementId: string;
  element: Element;
}

interface SelectedLayoutNodeData {
  kind: "stage" | "container" | "row" | "column";
  stageId: string;
  containerId?: string;
  rowId?: string;
  columnId?: string;
  settings: {
    badge?: string;
    tagPosition?:
      | "top-right"
      | "top-left"
      | "bottom-right"
      | "bottom-left"
      | "top-center"
      | "bottom-center";
    tagSize?: "small" | "medium" | "large";
    emojiIcon?: string;
    backgroundColor?: string;
    borderColor?: string;
    borderWidth?: number;
  };
}

interface BuilderSidebarProps {
  onAddStage: () => void;
  selectedElement: SelectedElementData | null;
  selectedLayoutNode: SelectedLayoutNodeData | null;
  paletteTypes: ElementType[];
  onDeselect: () => void;
  onUpdateElementConfig: (
    stageId: string,
    containerId: string,
    rowId: string,
    columnId: string,
    elementId: string,
    configPatch: Record<string, unknown>
  ) => void;
  onUpdateElementGlobal: (
    stageId: string,
    containerId: string,
    rowId: string,
    columnId: string,
    elementId: string,
    globalProps: Record<string, unknown>
  ) => void;
  onUpdateLayoutSettings: (
    selected: SelectedLayoutNodeData,
    patch: Record<string, unknown>
  ) => void;
  /** Currently selected global theme name. */
  currentTheme?: ThemeName;
  /** Called when the user selects a different theme from the picker. */
  onThemeChange?: (theme: ThemeName) => void;
}

interface IconCardConfig {
  iconName: string;
  title: string;
  text: string;
}

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
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

function asFieldConfigs(
  value: unknown
): Array<{ id: string; placeholder: string }> {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter(
      (item): item is Record<string, unknown> =>
        !!item && typeof item === "object" && !Array.isArray(item)
    )
    .map((item) => ({
      id: asString(item.id),
      placeholder: asString(item.placeholder),
    }))
    .filter((item) => item.id);
}

function createFieldId(): string {
  return `fld-${crypto.randomUUID().slice(0, 8)}`;
}

function toColorInputValue(value: string, fallback: string): string {
  return /^#(?:[0-9a-fA-F]{3}){1,2}$/.test(value) ? value : fallback;
}

function toBorderWidth(value: unknown, fallback = 1): number {
  if (typeof value === "number" && [0, 1, 2, 4].includes(value)) {
    return value;
  }
  const parsed = Number(value);
  if ([0, 1, 2, 4].includes(parsed)) {
    return parsed;
  }
  return fallback;
}

function updateSelectedConfig(
  selected: SelectedElementData,
  patch: Record<string, unknown>,
  onUpdateElementConfig: BuilderSidebarProps["onUpdateElementConfig"]
) {
  onUpdateElementConfig(
    selected.stageId,
    selected.containerId,
    selected.rowId,
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
    selected.rowId,
    selected.columnId,
    selected.elementId,
    patch
  );
}

const SIDEBAR_DEBOUNCE_MS = 600;

// Typed map from theme name to its i18n dictionary key
const THEME_LABEL_KEYS: Record<ThemeName, DictionaryKey> = {
  simple: "themeSimple",
  pleasant: "themePleasant",
  formal: "themeFormal",
  playful: "themePlayful",
  subversive: "themeSubversive",
  print: "themePrint",
  tech: "themeTech",
  social: "themeSocial",
};

function IconCardConfigPanel({
  selectedElement,
  config,
  onUpdateElementConfig,
}: {
  selectedElement: SelectedElementData;
  config: Record<string, unknown>;
  onUpdateElementConfig: BuilderSidebarProps["onUpdateElementConfig"];
}) {
  const initialConfig: IconCardConfig = {
    iconName: asString(config.iconName, "Star"),
    title: asString(config.title),
    text: asString(config.text),
  };
  const [draft, setDraft] = useState(initialConfig);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedRef = useRef(JSON.stringify(initialConfig));

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  const saveNow = (nextDraft: IconCardConfig) => {
    const nextNormalized = JSON.stringify(nextDraft);
    if (nextNormalized === lastSavedRef.current) {
      return;
    }
    lastSavedRef.current = nextNormalized;
    onUpdateElementConfig(
      selectedElement.stageId,
      selectedElement.containerId,
      selectedElement.rowId,
      selectedElement.columnId,
      selectedElement.elementId,
      nextDraft as unknown as Record<string, unknown>
    );
  };

  const scheduleSave = (nextDraft: IconCardConfig) => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    timerRef.current = setTimeout(() => {
      saveNow(nextDraft);
    }, SIDEBAR_DEBOUNCE_MS);
  };

  const patchDraft = (patch: Partial<IconCardConfig>) => {
    const next = { ...draft, ...patch };
    setDraft(next);
    scheduleSave(next);
  };

  return (
    <>
      <IconPicker
        value={draft.iconName || "Star"}
        onChange={(iconName) => patchDraft({ iconName })}
      />

      <label className="block space-y-1">
        <span className="text-xs">{t("title")}</span>
        <input
          type="text"
          value={draft.title}
          className="w-full rounded border border-border bg-background px-2 py-1.5 text-sm"
          onChange={(event) => patchDraft({ title: event.target.value })}
          onBlur={() => {
            if (timerRef.current) {
              clearTimeout(timerRef.current);
            }
            saveNow(draft);
          }}
        />
      </label>

      <label className="block space-y-1">
        <span className="text-xs">{t("text")}</span>
        <textarea
          value={draft.text}
          className="min-h-20 w-full rounded border border-border bg-background px-2 py-1.5 text-sm"
          onChange={(event) => patchDraft({ text: event.target.value })}
          onBlur={() => {
            if (timerRef.current) {
              clearTimeout(timerRef.current);
            }
            saveNow(draft);
          }}
        />
      </label>
    </>
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
    case "info-card":
      return FileText;
    case "icon_card":
      return Sparkles;
    case "link_button":
      return LinkIcon;
    case "short_text":
      return TextCursorInput;
    case "long_text":
      return AlignLeft;
    case "repeater_list":
      return ListChecks;
    case "advanced_repeater":
      return Rows3;
    case "card_builder":
      return LayoutGrid;
    case "options_builder":
      return ListOrdered;
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

function isTextAlign(value: unknown): value is "left" | "center" | "right" {
  return value === "left" || value === "center" || value === "right";
}

export function BuilderSidebar({
  onAddStage,
  selectedElement,
  selectedLayoutNode,
  paletteTypes,
  onDeselect,
  onUpdateElementConfig,
  onUpdateElementGlobal,
  onUpdateLayoutSettings,
  currentTheme,
  onThemeChange,
}: BuilderSidebarProps) {
  if (!selectedElement && !selectedLayoutNode) {
    return (
      <aside className="h-full overflow-y-auto overflow-x-visible border-l border-border bg-surface-raised p-4">
        <div className="space-y-3">
          {/* ---------------------------------------------------------------- */}
          {/* Global theme picker                                              */}
          {/* ---------------------------------------------------------------- */}
          <div className="rounded-lg border border-border bg-background p-3 space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-foreground/60">
              {t("globalTheme")}
            </p>
            <select
              value={currentTheme ?? "simple"}
              className="w-full rounded border border-border bg-background px-2 py-1.5 text-sm"
              onChange={(e) => {
                const next = e.target.value as ThemeName;
                if (THEME_NAMES.includes(next)) {
                  onThemeChange?.(next);
                }
              }}
            >
              {THEME_NAMES.map((name) => (
                <option key={name} value={name}>
                  {t(THEME_LABEL_KEYS[name])}
                </option>
              ))}
            </select>
          </div>

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

  if (!selectedElement && selectedLayoutNode) {
    const settings = selectedLayoutNode.settings ?? {};
    const badge = asString(settings.badge);
    const tagPosition = asTagPosition(settings.tagPosition);
    const tagSize = asTagSize(settings.tagSize);
    const emojiIcon = asString(settings.emojiIcon);
    const backgroundColor = asString(settings.backgroundColor);
    const borderColor = asString(settings.borderColor);
    const borderWidth = toBorderWidth(settings.borderWidth, 1);

    return (
      <aside className="h-full overflow-y-auto overflow-x-visible border-l border-border bg-surface-raised p-4">
        <div className="space-y-3">
          <button
            type="button"
            className="rounded-lg border border-border bg-background px-3 py-1.5 text-sm"
            onClick={onDeselect}
          >
            {t("back")}
          </button>

          <p className="text-sm font-semibold">{t("designSettings")}</p>

          <label className="block space-y-1">
            <span className="text-xs">{t("badgeText")}</span>
            <input
              type="text"
              value={badge}
              className="w-full rounded border border-border bg-background px-2 py-1.5 text-sm"
              onChange={(event) =>
                onUpdateLayoutSettings(selectedLayoutNode, { badge: event.target.value })
              }
            />
          </label>

          <div className="grid grid-cols-2 gap-2">
            <label className="block space-y-1">
              <span className="text-xs">{t("tagPosition")}</span>
              <select
                value={tagPosition}
                className="w-full rounded border border-border bg-background px-2 py-1.5 text-sm"
                onChange={(event) =>
                  onUpdateLayoutSettings(selectedLayoutNode, {
                    tagPosition: event.target.value,
                  })
                }
              >
                <option value="top-right">{t("posTopRight")}</option>
                <option value="top-left">{t("posTopLeft")}</option>
                <option value="bottom-right">{t("posBottomRight")}</option>
                <option value="bottom-left">{t("posBottomLeft")}</option>
                <option value="top-center">{t("posTopCenter")}</option>
                <option value="bottom-center">{t("posBottomCenter")}</option>
              </select>
            </label>

            <label className="block space-y-1">
              <span className="text-xs">{t("tagSize")}</span>
              <select
                value={tagSize}
                className="w-full rounded border border-border bg-background px-2 py-1.5 text-sm"
                onChange={(event) =>
                  onUpdateLayoutSettings(selectedLayoutNode, {
                    tagSize: event.target.value,
                  })
                }
              >
                <option value="small">{t("sizeSmall")}</option>
                <option value="medium">{t("sizeMedium")}</option>
                <option value="large">{t("sizeLarge")}</option>
              </select>
            </label>
          </div>

          <label className="block space-y-1">
            <span className="text-xs">{t("emojiIcon")}</span>
            <input
              type="text"
              maxLength={4}
              value={emojiIcon}
              className="w-full rounded border border-border bg-background px-2 py-1.5 text-sm"
              onChange={(event) =>
                onUpdateLayoutSettings(selectedLayoutNode, { emojiIcon: event.target.value })
              }
            />
          </label>

          <label className="block space-y-1">
            <span className="text-xs">{t("backgroundColor")}</span>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={toColorInputValue(backgroundColor, "#ffffff")}
                className="h-9 w-full rounded border border-border bg-background p-1"
                onChange={(event) =>
                  onUpdateLayoutSettings(selectedLayoutNode, {
                    backgroundColor: event.target.value,
                  })
                }
              />
              <button
                type="button"
                className="rounded border border-border bg-background px-2 py-1.5 text-xs"
                onClick={() => onUpdateLayoutSettings(selectedLayoutNode, { backgroundColor: "" })}
              >
                {t("clearColor")}
              </button>
            </div>
          </label>

          <label className="block space-y-1">
            <span className="text-xs">{t("borderColor")}</span>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={toColorInputValue(borderColor, "#d4d4d8")}
                className="h-9 w-full rounded border border-border bg-background p-1"
                onChange={(event) =>
                  onUpdateLayoutSettings(selectedLayoutNode, {
                    borderColor: event.target.value,
                  })
                }
              />
              <button
                type="button"
                className="rounded border border-border bg-background px-2 py-1.5 text-xs"
                onClick={() => onUpdateLayoutSettings(selectedLayoutNode, { borderColor: "" })}
              >
                {t("clearColor")}
              </button>
            </div>
          </label>

          <label className="block space-y-1">
            <span className="text-xs">{t("borderWidth")}</span>
            <select
              value={borderWidth}
              className="w-full rounded border border-border bg-background px-2 py-1.5 text-sm"
              onChange={(event) =>
                onUpdateLayoutSettings(selectedLayoutNode, {
                  borderWidth: Number(event.target.value),
                })
              }
            >
              <option value={0}>0px</option>
              <option value={1}>1px</option>
              <option value={2}>2px</option>
              <option value={4}>4px</option>
            </select>
          </label>
        </div>
      </aside>
    );
  }

  if (!selectedElement) return null;

  const config = selectedElement.element.config;
  const elementRecord = selectedElement.element as Record<string, unknown>;
  const badgeText = asString(elementRecord.badgeText);
  const tagPosition = asTagPosition(elementRecord.tagPosition);
  const tagSize = asTagSize(elementRecord.tagSize);
  const emojiIcon = asString(elementRecord.emojiIcon);
  const elementBorderWidth = toBorderWidth(elementRecord.borderWidth, 1);
  const elementBorderColor = asString(elementRecord.borderColor);
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
  const advancedRepeaterFields = asFieldConfigs(config.fields);
  const cardLayout =
    config.layout === "horizontal" || config.layout === "grid"
      ? config.layout
      : "vertical";
  const cardGridColumns =
    typeof config.gridColumns === "number"
      ? Math.min(Math.max(Math.floor(config.gridColumns), 1), 4)
      : 2;
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
  const textBlockAlign = isTextAlign(config.textAlign) ? config.textAlign : "right";

  return (
    <aside className="h-full overflow-y-auto overflow-x-visible border-l border-border bg-surface-raised p-4">
      <div className="space-y-3">
        <button
          type="button"
          className="rounded-lg border border-border bg-background px-3 py-1.5 text-sm"
          onClick={onDeselect}
        >
          {t("back")}
        </button>

        <p className="text-sm font-semibold">{t(selectedElement.element.type)}</p>

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
              <span className="text-xs">{t("subHeading")}</span>
              <input
                type="text"
                value={asString(config.subHeading)}
                className="w-full rounded border border-border bg-background px-2 py-1.5 text-sm"
                onChange={(event) =>
                  updateSelectedConfig(
                    selectedElement,
                    { subHeading: event.target.value },
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
            <div className="space-y-1">
              <span className="text-xs">{t("align")}</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  aria-label={t("right")}
                  className={`rounded border px-2 py-1 ${
                    (isTextAlign(config.textAlign) ? config.textAlign : "right") === "right"
                      ? "border-primary bg-primary/10"
                      : "border-border bg-background"
                  }`}
                  onClick={() =>
                    updateSelectedConfig(
                      selectedElement,
                      { textAlign: "right" },
                      onUpdateElementConfig
                    )
                  }
                >
                  <AlignRight className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  aria-label={t("center")}
                  className={`rounded border px-2 py-1 ${
                    (isTextAlign(config.textAlign) ? config.textAlign : "right") === "center"
                      ? "border-primary bg-primary/10"
                      : "border-border bg-background"
                  }`}
                  onClick={() =>
                    updateSelectedConfig(
                      selectedElement,
                      { textAlign: "center" },
                      onUpdateElementConfig
                    )
                  }
                >
                  <AlignCenter className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  aria-label={t("left")}
                  className={`rounded border px-2 py-1 ${
                    (isTextAlign(config.textAlign) ? config.textAlign : "right") === "left"
                      ? "border-primary bg-primary/10"
                      : "border-border bg-background"
                  }`}
                  onClick={() =>
                    updateSelectedConfig(
                      selectedElement,
                      { textAlign: "left" },
                      onUpdateElementConfig
                    )
                  }
                >
                  <AlignLeft className="h-4 w-4" />
                </button>
              </div>
            </div>
            <label className="flex items-center gap-2 rounded border border-border bg-background px-3 py-2 text-sm">
              <input
                type="checkbox"
                checked={Boolean(config.showSeparator)}
                onChange={(event) =>
                  updateSelectedConfig(
                    selectedElement,
                    { showSeparator: event.target.checked },
                    onUpdateElementConfig
                  )
                }
              />
              <span>{t("showSeparator")}</span>
            </label>
            {Boolean(config.showSeparator) ? (
              <>
                <label className="block space-y-1">
                  <span className="text-xs">{t("separatorStyle")}</span>
                  <select
                    value={
                      config.separatorStyle === "dashed" || config.separatorStyle === "dotted"
                        ? config.separatorStyle
                        : "solid"
                    }
                    className="w-full rounded border border-border bg-background px-2 py-1.5 text-sm"
                    onChange={(event) =>
                      updateSelectedConfig(
                        selectedElement,
                        { separatorStyle: event.target.value },
                        onUpdateElementConfig
                      )
                    }
                  >
                    <option value="solid">{t("solid")}</option>
                    <option value="dashed">{t("dashed")}</option>
                    <option value="dotted">{t("dotted")}</option>
                  </select>
                </label>
                <label className="block space-y-1">
                  <span className="text-xs">{t("separatorColor")}</span>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={toColorInputValue(asString(config.separatorColor), "#d4d4d8")}
                      className="h-9 w-full rounded border border-border bg-background p-1"
                      onChange={(event) =>
                        updateSelectedConfig(
                          selectedElement,
                          { separatorColor: event.target.value },
                          onUpdateElementConfig
                        )
                      }
                    />
                    <button
                      type="button"
                      className="rounded border border-border bg-background px-2 py-1.5 text-xs"
                      onClick={() =>
                        updateSelectedConfig(
                          selectedElement,
                          { separatorColor: "" },
                          onUpdateElementConfig
                        )
                      }
                    >
                      {t("clearColor")}
                    </button>
                  </div>
                </label>
              </>
            ) : null}
            <label className="block space-y-1">
              <span className="text-xs">{t("subHeadingColor")}</span>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={toColorInputValue(asString(config.subHeadingColor), "#6b7280")}
                  className="h-9 w-full rounded border border-border bg-background p-1"
                  onChange={(event) =>
                    updateSelectedConfig(
                      selectedElement,
                      { subHeadingColor: event.target.value },
                      onUpdateElementConfig
                    )
                  }
                />
                <button
                  type="button"
                  className="rounded border border-border bg-background px-2 py-1.5 text-xs"
                  onClick={() =>
                    updateSelectedConfig(
                      selectedElement,
                      { subHeadingColor: "" },
                      onUpdateElementConfig
                    )
                  }
                >
                  {t("clearColor")}
                </button>
              </div>
            </label>
          </>
        ) : null}

        {selectedElement.element.type === "text" ? (
          <>
            <label className="block space-y-1">
              <span className="text-xs">{t("content")}</span>
              <TextRichEditor
                value={asString(config.content)}
                textAlign={textBlockAlign}
                onTextAlignChange={(nextAlign) =>
                  updateSelectedConfig(
                    selectedElement,
                    { textAlign: nextAlign },
                    onUpdateElementConfig
                  )
                }
                onChange={(html) =>
                  updateSelectedConfig(selectedElement, { content: html }, onUpdateElementConfig)
                }
              />
            </label>
          </>
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

        {selectedElement.element.type === "icon_card" ? (
          <IconCardConfigPanel
            key={selectedElement.elementId}
            selectedElement={selectedElement}
            config={config}
            onUpdateElementConfig={onUpdateElementConfig}
          />
        ) : null}

        {selectedElement.element.type === "info-card" ? (
          <>
            <label className="block space-y-1">
              <span className="text-xs">{t("cardTitle")}</span>
              <input
                type="text"
                value={asString(config.cardTitle)}
                className="w-full rounded border border-border bg-background px-2 py-1.5 text-sm"
                onChange={(event) =>
                  updateSelectedConfig(
                    selectedElement,
                    { cardTitle: event.target.value },
                    onUpdateElementConfig
                  )
                }
              />
            </label>

            <div className="space-y-1">
              <span className="text-xs">{t("titleAlignment")}</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  aria-label={t("right")}
                  className={`rounded border px-2 py-1 ${
                    (isTextAlign(config.titleAlignment) ? config.titleAlignment : "right") ===
                    "right"
                      ? "border-primary bg-primary/10"
                      : "border-border bg-background"
                  }`}
                  onClick={() =>
                    updateSelectedConfig(
                      selectedElement,
                      { titleAlignment: "right" },
                      onUpdateElementConfig
                    )
                  }
                >
                  <AlignRight className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  aria-label={t("center")}
                  className={`rounded border px-2 py-1 ${
                    (isTextAlign(config.titleAlignment) ? config.titleAlignment : "right") ===
                    "center"
                      ? "border-primary bg-primary/10"
                      : "border-border bg-background"
                  }`}
                  onClick={() =>
                    updateSelectedConfig(
                      selectedElement,
                      { titleAlignment: "center" },
                      onUpdateElementConfig
                    )
                  }
                >
                  <AlignCenter className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  aria-label={t("left")}
                  className={`rounded border px-2 py-1 ${
                    (isTextAlign(config.titleAlignment) ? config.titleAlignment : "right") ===
                    "left"
                      ? "border-primary bg-primary/10"
                      : "border-border bg-background"
                  }`}
                  onClick={() =>
                    updateSelectedConfig(
                      selectedElement,
                      { titleAlignment: "left" },
                      onUpdateElementConfig
                    )
                  }
                >
                  <AlignLeft className="h-4 w-4" />
                </button>
              </div>
            </div>

            <label className="block space-y-1">
              <span className="text-xs">{t("emojiIcon")}</span>
              <input
                type="text"
                maxLength={4}
                value={asString(config.emojiIcon)}
                className="w-full rounded border border-border bg-background px-2 py-1.5 text-sm"
                onChange={(event) =>
                  updateSelectedConfig(
                    selectedElement,
                    { emojiIcon: event.target.value },
                    onUpdateElementConfig
                  )
                }
              />
            </label>

            <label className="block space-y-1">
              <span className="text-xs">{t("cardText")}</span>
              <TextRichEditor
                value={asString(config.cardText)}
                onChange={(html) =>
                  updateSelectedConfig(
                    selectedElement,
                    { cardText: html },
                    onUpdateElementConfig
                  )
                }
              />
            </label>

            <label className="block space-y-1">
              <span className="text-xs">{t("titleBgColor")}</span>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={toColorInputValue(asString(config.titleBgColor), "#f4ede1")}
                  className="h-9 w-full rounded border border-border bg-background p-1"
                  onChange={(event) =>
                    updateSelectedConfig(
                      selectedElement,
                      { titleBgColor: event.target.value },
                      onUpdateElementConfig
                    )
                  }
                />
                <button
                  type="button"
                  className="rounded border border-border bg-background px-2 py-1.5 text-xs"
                  onClick={() =>
                    updateSelectedConfig(
                      selectedElement,
                      { titleBgColor: "" },
                      onUpdateElementConfig
                    )
                  }
                >
                  {t("clearColor")}
                </button>
              </div>
            </label>

            <label className="block space-y-1">
              <span className="text-xs">{t("titleTextColor")}</span>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={toColorInputValue(asString(config.titleTextColor), "#111827")}
                  className="h-9 w-full rounded border border-border bg-background p-1"
                  onChange={(event) =>
                    updateSelectedConfig(
                      selectedElement,
                      { titleTextColor: event.target.value },
                      onUpdateElementConfig
                    )
                  }
                />
                <button
                  type="button"
                  className="rounded border border-border bg-background px-2 py-1.5 text-xs"
                  onClick={() =>
                    updateSelectedConfig(
                      selectedElement,
                      { titleTextColor: "" },
                      onUpdateElementConfig
                    )
                  }
                >
                  {t("clearColor")}
                </button>
              </div>
            </label>

            <label className="block space-y-1">
              <span className="text-xs">{t("cardShadowColor")}</span>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={toColorInputValue(asString(config.cardShadowColor), "#111827")}
                  className="h-9 w-full rounded border border-border bg-background p-1"
                  onChange={(event) =>
                    updateSelectedConfig(
                      selectedElement,
                      { cardShadowColor: event.target.value },
                      onUpdateElementConfig
                    )
                  }
                />
                <button
                  type="button"
                  className="rounded border border-border bg-background px-2 py-1.5 text-xs"
                  onClick={() =>
                    updateSelectedConfig(
                      selectedElement,
                      { cardShadowColor: "" },
                      onUpdateElementConfig
                    )
                  }
                >
                  {t("clearColor")}
                </button>
              </div>
            </label>

            <label className="block space-y-1">
              <span className="text-xs">{t("cardBorderColor")}</span>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={toColorInputValue(asString(config.cardBorderColor), "#111827")}
                  className="h-9 w-full rounded border border-border bg-background p-1"
                  onChange={(event) =>
                    updateSelectedConfig(
                      selectedElement,
                      { cardBorderColor: event.target.value },
                      onUpdateElementConfig
                    )
                  }
                />
                <button
                  type="button"
                  className="rounded border border-border bg-background px-2 py-1.5 text-xs"
                  onClick={() =>
                    updateSelectedConfig(
                      selectedElement,
                      { cardBorderColor: "" },
                      onUpdateElementConfig
                    )
                  }
                >
                  {t("clearColor")}
                </button>
              </div>
            </label>
          </>
        ) : null}

        {selectedElement.element.type === "link_button" ? (
          <>
            <label className="block space-y-1">
              <span className="text-xs">{t("title")}</span>
              <input
                type="text"
                value={asString(config.label)}
                className="w-full rounded border border-border bg-background px-2 py-1.5 text-sm"
                onChange={(event) =>
                  updateSelectedConfig(
                    selectedElement,
                    { label: event.target.value },
                    onUpdateElementConfig
                  )
                }
              />
            </label>
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

        {selectedElement.element.type === "advanced_repeater" ? (
          <>
            <div className="space-y-2 rounded border border-border/70 p-2">
              <p className="text-xs font-medium">{t("fieldsConfig")}</p>
              {advancedRepeaterFields.map((field, index) => (
                <div key={field.id} className="space-y-1 rounded border border-border/60 p-2">
                  <label className="block space-y-1">
                    <span className="text-xs">{t("placeholder")}</span>
                    <input
                      type="text"
                      value={field.placeholder}
                      className="w-full rounded border border-border bg-background px-2 py-1.5 text-sm"
                      onChange={(event) => {
                        const nextFields = advancedRepeaterFields.map(
                          (currentField, currentIndex) =>
                            currentIndex === index
                              ? {
                                  ...currentField,
                                  placeholder: event.target.value,
                                }
                              : currentField
                        );
                        updateSelectedConfig(
                          selectedElement,
                          { fields: nextFields },
                          onUpdateElementConfig
                        );
                      }}
                    />
                  </label>
                  <button
                    type="button"
                    className="rounded border border-danger/40 px-2 py-1 text-xs text-danger hover:bg-danger/10"
                    onClick={() => {
                      const nextFields = advancedRepeaterFields.filter(
                        (currentField) => currentField.id !== field.id
                      );
                      updateSelectedConfig(
                        selectedElement,
                        { fields: nextFields },
                        onUpdateElementConfig
                      );
                    }}
                  >
                    {t("delete")}
                  </button>
                </div>
              ))}

              <button
                type="button"
                className="w-full rounded border border-border bg-background px-2 py-1.5 text-xs"
                onClick={() => {
                  const nextFields = [
                    ...advancedRepeaterFields,
                    { id: createFieldId(), placeholder: "" },
                  ];
                  updateSelectedConfig(
                    selectedElement,
                    { fields: nextFields },
                    onUpdateElementConfig
                  );
                }}
              >
                {t("addField")}
              </button>
            </div>

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

        {selectedElement.element.type === "card_builder" ? (
          <>
            <label className="block space-y-1">
              <span className="text-xs">{t("layout")}</span>
              <select
                value={cardLayout}
                className="w-full rounded border border-border bg-background px-2 py-1.5 text-sm"
                onChange={(event) =>
                  updateSelectedConfig(
                    selectedElement,
                    { layout: event.target.value },
                    onUpdateElementConfig
                  )
                }
              >
                <option value="vertical">{t("vertical")}</option>
                <option value="horizontal">{t("horizontal")}</option>
                <option value="grid">{t("grid")}</option>
              </select>
            </label>

            <label className="block space-y-1">
              <span className="text-xs">{t("gridColumns")}</span>
              <input
                type="number"
                min={1}
                max={4}
                value={cardGridColumns}
                disabled={cardLayout !== "grid"}
                className="w-full rounded border border-border bg-background px-2 py-1.5 text-sm disabled:opacity-60"
                onChange={(event) =>
                  updateSelectedConfig(
                    selectedElement,
                    {
                      gridColumns: Math.min(
                        Math.max(Number(event.target.value || 1), 1),
                        4
                      ),
                    },
                    onUpdateElementConfig
                  )
                }
              />
            </label>

            <label className="block space-y-1">
              <span className="text-xs">{t("titlePlaceholder")}</span>
              <input
                type="text"
                value={asString(config.titlePlaceholder)}
                className="w-full rounded border border-border bg-background px-2 py-1.5 text-sm"
                onChange={(event) =>
                  updateSelectedConfig(
                    selectedElement,
                    { titlePlaceholder: event.target.value },
                    onUpdateElementConfig
                  )
                }
              />
            </label>

            <label className="block space-y-1">
              <span className="text-xs">{t("descPlaceholder")}</span>
              <input
                type="text"
                value={asString(config.descPlaceholder)}
                className="w-full rounded border border-border bg-background px-2 py-1.5 text-sm"
                onChange={(event) =>
                  updateSelectedConfig(
                    selectedElement,
                    { descPlaceholder: event.target.value },
                    onUpdateElementConfig
                  )
                }
              />
            </label>

            <label className="block space-y-1">
              <span className="text-xs">{t("inputPlaceholder")}</span>
              <input
                type="text"
                value={asString(config.inputPlaceholder)}
                className="w-full rounded border border-border bg-background px-2 py-1.5 text-sm"
                onChange={(event) =>
                  updateSelectedConfig(
                    selectedElement,
                    { inputPlaceholder: event.target.value },
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

        {selectedElement.element.type === "options_builder" ? (
          <>
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

            <label className="block space-y-1">
              <span className="text-xs">{t("optionTitlePrefix")}</span>
              <input
                type="text"
                value={asString(config.optionTitlePrefix)}
                className="w-full rounded border border-border bg-background px-2 py-1.5 text-sm"
                onChange={(event) =>
                  updateSelectedConfig(
                    selectedElement,
                    { optionTitlePrefix: event.target.value },
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

          <div className="grid grid-cols-2 gap-2">
            <label className="block space-y-1">
              <span className="text-xs">{t("tagPosition")}</span>
              <select
                value={tagPosition}
                className="w-full rounded border border-border bg-background px-2 py-1.5 text-sm"
                onChange={(event) =>
                  updateSelectedGlobal(
                    selectedElement,
                    { tagPosition: event.target.value },
                    onUpdateElementGlobal
                  )
                }
              >
                <option value="top-right">{t("posTopRight")}</option>
                <option value="top-left">{t("posTopLeft")}</option>
                <option value="bottom-right">{t("posBottomRight")}</option>
                <option value="bottom-left">{t("posBottomLeft")}</option>
                <option value="top-center">{t("posTopCenter")}</option>
                <option value="bottom-center">{t("posBottomCenter")}</option>
              </select>
            </label>

            <label className="block space-y-1">
              <span className="text-xs">{t("tagSize")}</span>
              <select
                value={tagSize}
                className="w-full rounded border border-border bg-background px-2 py-1.5 text-sm"
                onChange={(event) =>
                  updateSelectedGlobal(
                    selectedElement,
                    { tagSize: event.target.value },
                    onUpdateElementGlobal
                  )
                }
              >
                <option value="small">{t("sizeSmall")}</option>
                <option value="medium">{t("sizeMedium")}</option>
                <option value="large">{t("sizeLarge")}</option>
              </select>
            </label>
          </div>

          <label className="block space-y-1">
            <span className="text-xs">{t("emojiIcon")}</span>
            <input
              type="text"
              maxLength={4}
              value={emojiIcon}
              className="w-full rounded border border-border bg-background px-2 py-1.5 text-sm"
              onChange={(event) =>
                updateSelectedGlobal(
                  selectedElement,
                  { emojiIcon: event.target.value },
                  onUpdateElementGlobal
                )
              }
            />
          </label>

          <label className="block space-y-1">
            <span className="text-xs">{t("borderWidth")}</span>
            <select
              value={elementBorderWidth}
              className="w-full rounded border border-border bg-background px-2 py-1.5 text-sm"
              onChange={(event) =>
                updateSelectedGlobal(
                  selectedElement,
                  { borderWidth: Number(event.target.value) },
                  onUpdateElementGlobal
                )
              }
            >
              <option value={0}>0px</option>
              <option value={1}>1px</option>
              <option value={2}>2px</option>
              <option value={4}>4px</option>
            </select>
          </label>

          <label className="block space-y-1">
            <span className="text-xs">{t("borderColor")}</span>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={toColorInputValue(elementBorderColor, "#d4d4d8")}
                className="h-9 w-full rounded border border-border bg-background p-1"
                onChange={(event) =>
                  updateSelectedGlobal(
                    selectedElement,
                    { borderColor: event.target.value },
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
                    { borderColor: "" },
                    onUpdateElementGlobal
                  )
                }
              >
                {t("clearColor")}
              </button>
            </div>
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
