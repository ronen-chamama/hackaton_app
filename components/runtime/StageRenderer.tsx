import type { CSSProperties } from "react";
import { ElementRenderer } from "@/components/elements/ElementRenderer";
import { t } from "@/lib/i18n";
import type { Element, GroupValueMap, Stage } from "@/lib/types";
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

interface StageRendererProps {
  stage: Stage | null;
  groupValues: GroupValueMap;
  hackathonId: string;
  groupId: string | null;
  userId: string | null;
  groupMembers?: string[];
  groupName?: string;
  hackathonName?: string;
  onValueSaved: (value: GroupValueMap[string]) => void;
}

// Varied social timestamps — resolved from i18n, never hardcoded Hebrew
const SOCIAL_TIMESTAMPS = [
  "socialJustNow",
  "social3min",
  "social7min",
  "social15min",
  "social1hour",
  "social2hours",
  "socialYesterday",
] as const;

// Print tag labels — resolved from i18n
const PRINT_TAGS = [
  "printBreaking",
  "printFlash",
  "printExclusive",
  "printAnalysis",
] as const;

function getBorderClass(border?: string): string {
  if (border === "dashed") return "border border-dashed border-border";
  if (border === "solid") return "border border-solid border-border";
  if (border === "none") return "border border-transparent";
  return "";
}

function getShadowClass(shadow?: string): string {
  if (shadow === "sm") return "shadow-sm";
  if (shadow === "md") return "shadow-md";
  if (shadow === "lg") return "shadow-lg";
  return "";
}

function normalizeBorderWidth(value: unknown): string | undefined {
  if (typeof value === "number") {
    return value > 0 ? `${value}px` : undefined;
  }

  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  if (!trimmed || trimmed === "0" || trimmed === "0px") {
    return undefined;
  }

  if (/^\d+$/.test(trimmed)) {
    return `${trimmed}px`;
  }

  if (/^\d+px$/.test(trimmed)) {
    return trimmed;
  }

  return trimmed;
}

function hasVisibleBorderWidth(value: unknown): boolean {
  return Boolean(normalizeBorderWidth(value));
}

function asLayoutSettings(value: unknown): {
  badge?: string;
  tagPosition?:
    | "top-right"
    | "top-left"
    | "bottom-right"
    | "bottom-left"
    | "top-center"
    | "bottom-center";
  tagSize?: "small" | "medium" | "large";
  tagBgColor?: string;
  tagTextColor?: string;
  tagBorderStyle?: "solid" | "dashed" | "dotted";
  tagBorderWidth?: "0px" | "1px" | "2px" | "4px";
  tagShape?: "square" | "rounded" | "pill";
  emojiIcon?: string;
  backgroundColor?: string;
  borderColor?: string;
  borderWidth?: number | string;
  enableCustomWrapper?: boolean;
  borderStyle?: "solid" | "dashed" | "dotted";
  boxShadow?: "none" | "sm" | "md" | "lg";
  radiusTR?: number;
  radiusTL?: number;
  radiusBR?: number;
  radiusBL?: number;
} {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }
  const input = value as Record<string, unknown>;
  return {
    badge: typeof input.badge === "string" ? input.badge : "",
    tagPosition: asTagPosition(input.tagPosition),
    tagSize: asTagSize(input.tagSize),
    tagBgColor: typeof input.tagBgColor === "string" ? input.tagBgColor : "",
    tagTextColor: typeof input.tagTextColor === "string" ? input.tagTextColor : "",
    tagBorderStyle: asTagBorderStyle(input.tagBorderStyle),
    tagBorderWidth: asTagBorderWidth(input.tagBorderWidth),
    tagShape: asTagShape(input.tagShape),
    emojiIcon: typeof input.emojiIcon === "string" ? input.emojiIcon : "",
    backgroundColor:
      typeof input.backgroundColor === "string" ? input.backgroundColor : "",
    borderColor: typeof input.borderColor === "string" ? input.borderColor : "",
    borderWidth:
      typeof input.borderWidth === "number" || typeof input.borderWidth === "string"
        ? input.borderWidth
        : undefined,
    enableCustomWrapper: input.enableCustomWrapper === true,
    borderStyle:
      input.borderStyle === "solid" ||
      input.borderStyle === "dashed" ||
      input.borderStyle === "dotted"
        ? input.borderStyle
        : undefined,
    boxShadow:
      input.boxShadow === "sm" || input.boxShadow === "md" || input.boxShadow === "lg"
        ? input.boxShadow
        : "none",
    radiusTR: typeof input.radiusTR === "number" ? input.radiusTR : undefined,
    radiusTL: typeof input.radiusTL === "number" ? input.radiusTL : undefined,
    radiusBR: typeof input.radiusBR === "number" ? input.radiusBR : undefined,
    radiusBL: typeof input.radiusBL === "number" ? input.radiusBL : undefined,
  };
}

function hasVisibleBackground(settings: {
  backgroundColor?: string;
  borderWidth?: number | string;
}): boolean {
  const backgroundColor = settings.backgroundColor?.trim();
  return Boolean(backgroundColor && backgroundColor !== "transparent" && backgroundColor !== "none");
}

function hasStructuralChrome(settings: {
  backgroundColor?: string;
  borderWidth?: number | string;
  enableCustomWrapper?: boolean;
}): boolean {
  if (!settings.enableCustomWrapper) {
    return false;
  }
  return hasVisibleBackground(settings) || hasVisibleBorderWidth(settings.borderWidth);
}

function getStructuralPaddingClass(settings: {
  backgroundColor?: string;
  borderWidth?: number | string;
  enableCustomWrapper?: boolean;
}): string {
  return hasStructuralChrome(settings) ? "rounded-md p-4" : "";
}

function getStructuralStyle(settings: {
  backgroundColor?: string;
  borderColor?: string;
  borderWidth?: number | string;
  enableCustomWrapper?: boolean;
  borderStyle?: "solid" | "dashed" | "dotted";
  radiusTR?: number;
  radiusTL?: number;
  radiusBR?: number;
  radiusBL?: number;
}) {
  if (!settings.enableCustomWrapper) {
    return {};
  }
  const normalizedBorderWidth = normalizeBorderWidth(settings.borderWidth);
  const hasVisibleBorder = Boolean(normalizedBorderWidth);

  return {
    backgroundColor: settings.backgroundColor || undefined,
    borderColor: settings.borderColor || undefined,
    borderWidth: normalizedBorderWidth,
    borderStyle: settings.borderStyle || (hasVisibleBorder ? "solid" : undefined),
    borderTopRightRadius:
      typeof settings.radiusTR === "number" ? `${settings.radiusTR}px` : undefined,
    borderTopLeftRadius:
      typeof settings.radiusTL === "number" ? `${settings.radiusTL}px` : undefined,
    borderBottomRightRadius:
      typeof settings.radiusBR === "number" ? `${settings.radiusBR}px` : undefined,
    borderBottomLeftRadius:
      typeof settings.radiusBL === "number" ? `${settings.radiusBL}px` : undefined,
  };
}

function getStructuralShadowClass(settings: {
  boxShadow?: "none" | "sm" | "md" | "lg";
  enableCustomWrapper?: boolean;
}): string {
  if (!settings.enableCustomWrapper) {
    return "";
  }
  if (settings.boxShadow === "sm") return "shadow-sm";
  if (settings.boxShadow === "md") return "shadow-md";
  if (settings.boxShadow === "lg") return "shadow-lg";
  return "";
}

function getContainerRows(container: Stage["containers"][number]) {
  const record = container as unknown as Record<string, unknown>;
  if (Array.isArray(record.rows)) {
    return record.rows as Array<{
      id: string;
      columns: Array<{ id: string; elements: Element[]; settings?: unknown }>;
      settings?: unknown;
    }>;
  }
  if (Array.isArray(record.columns)) {
    return [
      {
        id: `${container.id}-legacy-row`,
        columns: record.columns as Array<{
        id: string;
        elements: Element[];
        settings?: unknown;
      }>,
        settings: {},
      },
    ];
  }
  return [];
}

function getViewStructuralProps(settingsValue: unknown) {
  const settings = asLayoutSettings(settingsValue ?? {});
  if (!settings.enableCustomWrapper) {
    return {
      settings,
      structuralStyles: {} satisfies CSSProperties,
      paddingClass: "",
    };
  }
  const normalizedBorderWidth = normalizeBorderWidth(settings.borderWidth);
  const hasBorder = Boolean(normalizedBorderWidth && normalizedBorderWidth !== "0px");
  const hasBackground = hasVisibleBackground(settings);

  return {
    settings,
    structuralStyles: {
      backgroundColor: settings.backgroundColor || undefined,
      borderColor: settings.borderColor || undefined,
      borderWidth: hasBorder ? normalizedBorderWidth : undefined,
      borderStyle: settings.borderStyle || (hasBorder ? "solid" : undefined),
      borderTopRightRadius:
        typeof settings.radiusTR === "number" ? `${settings.radiusTR}px` : undefined,
      borderTopLeftRadius:
        typeof settings.radiusTL === "number" ? `${settings.radiusTL}px` : undefined,
      borderBottomRightRadius:
        typeof settings.radiusBR === "number" ? `${settings.radiusBR}px` : undefined,
      borderBottomLeftRadius:
        typeof settings.radiusBL === "number" ? `${settings.radiusBL}px` : undefined,
    } satisfies CSSProperties,
    paddingClass: hasBorder || hasBackground ? "p-4 rounded-md" : "",
  };
}

function getRowGridStyle(columnCount: number) {
  return {
    gridTemplateColumns: `repeat(${Math.max(columnCount, 1)}, minmax(0, 1fr))`,
  };
}

export function StageRenderer({
  stage,
  groupValues,
  hackathonId,
  groupId,
  userId,
  groupMembers = [],
  groupName = "",
  hackathonName = "",
  onValueSaved,
}: StageRendererProps) {
  if (!stage) return null;
  const stageSettings = asLayoutSettings(stage.settings);

  // Global element counter across containers/columns for deterministic decoration
  let globalElementIndex = 0;

  return (
    <section
      className={`relative overflow-visible space-y-4 rounded-xl border border-border bg-surface-raised p-4 shadow-sm ${getStructuralShadowClass(
        stageSettings
      )}`}
      style={{
        ...getStructuralStyle(stageSettings),
      }}
    >
      {stageSettings.badge ? (
        <span
          className={`absolute z-20 bg-primary text-primary-foreground shadow-sm ${getTagPositionClasses(
            asTagPosition(stageSettings.tagPosition)
          )} ${getTagSizeClasses(asTagSize(stageSettings.tagSize))} ${getTagShapeClasses(
            asTagShape(stageSettings.tagShape)
          )}`}
          style={getTagInlineStyle({
            backgroundColor: stageSettings.tagBgColor,
            textColor: stageSettings.tagTextColor,
            borderStyle: asTagBorderStyle(stageSettings.tagBorderStyle),
            borderWidth: asTagBorderWidth(stageSettings.tagBorderWidth),
          })}
        >
          {stageSettings.badge}
        </span>
      ) : null}
      {stageSettings.emojiIcon ? (
        <span className="absolute left-2 top-1 text-3xl leading-none">
          {stageSettings.emojiIcon}
        </span>
      ) : null}
      {stage.containers.map((container, containerIndex) => (
        (() => {
          const containerSettings = asLayoutSettings(container.settings);
          return (
            <div
          key={container.id}
          data-renderer="container"
          {...(hasStructuralChrome(containerSettings) ? { "data-custom-wrapper": "" } : {})}
          className={`relative overflow-visible ${getStructuralPaddingClass(
            containerSettings
          )} ${getStructuralShadowClass(containerSettings)}`}
          style={getStructuralStyle(containerSettings)}
        >
          {containerSettings.badge ? (
            <span
              className={`absolute z-20 bg-primary text-primary-foreground shadow-sm ${getTagPositionClasses(
                asTagPosition(containerSettings.tagPosition)
              )} ${getTagSizeClasses(asTagSize(containerSettings.tagSize))} ${getTagShapeClasses(
                asTagShape(containerSettings.tagShape)
              )}`}
              style={getTagInlineStyle({
                backgroundColor: containerSettings.tagBgColor,
                textColor: containerSettings.tagTextColor,
                borderStyle: asTagBorderStyle(containerSettings.tagBorderStyle),
                borderWidth: asTagBorderWidth(containerSettings.tagBorderWidth),
              })}
            >
              {containerSettings.badge}
            </span>
          ) : null}
          {containerSettings.emojiIcon ? (
            <span className="absolute left-2 top-1 text-2xl leading-none">
              {containerSettings.emojiIcon}
            </span>
          ) : null}
          <div className="flex flex-col gap-4">
            {getContainerRows(container).map((row) => {
              const {
                settings: rowSettings,
                structuralStyles: rowStructuralStyles,
                paddingClass: rowPaddingClass,
              } = getViewStructuralProps(row.settings || {});
              const rowStyle = {
                ...getRowGridStyle(row.columns.length),
                ...rowStructuralStyles,
              } satisfies CSSProperties;

              return (
                <div
                  key={row.id}
                  className={`relative overflow-visible grid items-start gap-4 ${rowPaddingClass} ${getStructuralShadowClass(
                    rowSettings
                  )}`}
                  style={rowStyle}
                >
                  {rowSettings.badge ? (
                    <span
                      className={`absolute z-20 bg-primary text-primary-foreground shadow-sm ${getTagPositionClasses(
                        asTagPosition(rowSettings.tagPosition)
                      )} ${getTagSizeClasses(asTagSize(rowSettings.tagSize))} ${getTagShapeClasses(
                        asTagShape(rowSettings.tagShape)
                      )}`}
                      style={getTagInlineStyle({
                        backgroundColor: rowSettings.tagBgColor,
                        textColor: rowSettings.tagTextColor,
                        borderStyle: asTagBorderStyle(rowSettings.tagBorderStyle),
                        borderWidth: asTagBorderWidth(rowSettings.tagBorderWidth),
                      })}
                    >
                      {rowSettings.badge}
                    </span>
                  ) : null}
                  {rowSettings.emojiIcon ? (
                    <span className="absolute left-2 top-1 text-2xl leading-none">
                      {rowSettings.emojiIcon}
                    </span>
                  ) : null}
                  {row.columns.map((column, columnIndex) => (
                  (() => {
                    const {
                      settings: columnSettings,
                      structuralStyles: columnStructuralStyles,
                      paddingClass: columnPaddingClass,
                    } = getViewStructuralProps(column.settings || {});

                    return (
                      <div
                    key={column.id}
                    data-renderer="column"
                    {...(columnSettings.enableCustomWrapper ? { "data-custom-wrapper": "" } : {})}
                    className={`relative flex min-w-0 flex-col gap-4 overflow-visible ${columnPaddingClass} ${getStructuralShadowClass(
                      columnSettings
                    )}`}
                    style={columnStructuralStyles}
                  >
                    {columnSettings.badge ? (
                      <span
                        className={`absolute z-20 bg-primary text-primary-foreground shadow-sm ${getTagPositionClasses(
                          asTagPosition(columnSettings.tagPosition)
                        )} ${getTagSizeClasses(asTagSize(columnSettings.tagSize))} ${getTagShapeClasses(
                          asTagShape(columnSettings.tagShape)
                        )}`}
                        style={getTagInlineStyle({
                          backgroundColor: columnSettings.tagBgColor,
                          textColor: columnSettings.tagTextColor,
                          borderStyle: asTagBorderStyle(columnSettings.tagBorderStyle),
                          borderWidth: asTagBorderWidth(columnSettings.tagBorderWidth),
                        })}
                      >
                        {columnSettings.badge}
                      </span>
                    ) : null}
                    {columnSettings.emojiIcon ? (
                      <span className="absolute left-2 top-1 text-2xl leading-none">
                        {columnSettings.emojiIcon}
                      </span>
                    ) : null}
                    {column.elements.map((element) => {
                  const elementIndex = globalElementIndex++;
                  const elementRecord = element as Record<string, unknown>;

                  const badgeText =
                    typeof elementRecord.badgeText === "string"
                      ? elementRecord.badgeText
                      : "";
                  const tagPosition = asTagPosition(elementRecord.tagPosition);
                  const tagSize = asTagSize(elementRecord.tagSize);
                  const tagBgColor =
                    typeof elementRecord.tagBgColor === "string"
                      ? elementRecord.tagBgColor
                      : "";
                  const tagTextColor =
                    typeof elementRecord.tagTextColor === "string"
                      ? elementRecord.tagTextColor
                      : "";
                  const tagBorderStyle = asTagBorderStyle(elementRecord.tagBorderStyle);
                  const tagBorderWidth = asTagBorderWidth(elementRecord.tagBorderWidth);
                  const tagShape = asTagShape(elementRecord.tagShape);
                  const emojiIcon =
                    typeof elementRecord.emojiIcon === "string"
                      ? elementRecord.emojiIcon
                      : "";
                  const elementBorderWidth =
                    typeof elementRecord.borderWidth === "number"
                      ? elementRecord.borderWidth
                      : undefined;
                  const elementBorderColor =
                    typeof elementRecord.borderColor === "string"
                      ? elementRecord.borderColor
                      : "";
                  const styleOverrides =
                    elementRecord.styleOverrides &&
                    typeof elementRecord.styleOverrides === "object" &&
                    !Array.isArray(elementRecord.styleOverrides)
                      ? (elementRecord.styleOverrides as Record<string, unknown>)
                      : {};
                  const textColor =
                    typeof styleOverrides.textColor === "string"
                      ? styleOverrides.textColor
                      : "";
                  const backgroundColor =
                    typeof styleOverrides.backgroundColor === "string"
                      ? styleOverrides.backgroundColor
                      : "";
                  const border =
                    typeof styleOverrides.border === "string"
                      ? styleOverrides.border
                      : undefined;
                  const shadow =
                    typeof styleOverrides.shadow === "string"
                      ? styleOverrides.shadow
                      : undefined;

                  // Social theme: varied timestamp per element (deterministic)
                  const socialTimeKey =
                    SOCIAL_TIMESTAMPS[elementIndex % SOCIAL_TIMESTAMPS.length];
                  const socialTime = t(socialTimeKey);

                  // Print theme: tag label for odd-indexed elements only
                  const printTagKey =
                    PRINT_TAGS[Math.floor(elementIndex / 2) % PRINT_TAGS.length];
                  const printTag = elementIndex % 3 !== 2 ? t(printTagKey) : "";

                  return (
                    <div
                      key={`${element.id}:${groupValues[element.id]?.updated_at ?? "base"}`}
                      className={`relative overflow-visible rounded px-2 py-2 text-xs ${getBorderClass(
                        border
                      )} ${getShadowClass(shadow)}`}
                      style={{
                        color: textColor || undefined,
                        backgroundColor: backgroundColor || undefined,
                        borderStyle:
                          border === "dashed" || border === "solid"
                            ? border
                            : border === "none"
                              ? "solid"
                              : typeof elementBorderWidth === "number"
                                ? "solid"
                                : undefined,
                        borderWidth:
                          typeof elementBorderWidth === "number"
                            ? `${elementBorderWidth}px`
                            : border && border !== "none"
                              ? "1px"
                            : undefined,
                        borderColor: elementBorderColor || undefined,
                      }}
                    >
                      {badgeText ? (
                        <span
                          className={`absolute z-20 bg-primary text-primary-foreground shadow-sm ${getTagPositionClasses(
                            tagPosition
                          )} ${getTagSizeClasses(tagSize)} ${getTagShapeClasses(tagShape)}`}
                          style={getTagInlineStyle({
                            backgroundColor: tagBgColor,
                            textColor: tagTextColor,
                            borderStyle: tagBorderStyle,
                            borderWidth: tagBorderWidth,
                          })}
                        >
                          {badgeText}
                        </span>
                      ) : null}
                      {emojiIcon ? (
                        <span className="absolute left-2 top-1 text-2xl leading-none">
                          {emojiIcon}
                        </span>
                      ) : null}

                      <ElementRenderer
                        element={element}
                        groupValue={groupValues[element.id]}
                        hackathonId={hackathonId}
                        groupId={groupId}
                        userId={userId}
                        groupMembers={groupMembers}
                        groupName={groupName}
                        hackathonName={hackathonName}
                        themeMeta={{
                          elementIndex,
                          containerIndex,
                          columnIndex,
                          socialTime,
                          printTag,
                        }}
                        onValueSaved={onValueSaved}
                      />
                    </div>
                  );
                    })}
                      </div>
                    );
                  })()
                ))}
                </div>
              );
            })}
          </div>
            </div>
          );
        })()
      ))}
    </section>
  );
}
