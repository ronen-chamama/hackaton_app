import type { CSSProperties } from "react";
import { ElementRenderer } from "@/components/elements/ElementRenderer";
import { t } from "@/lib/i18n";
import type { Element, GroupValueMap, Stage } from "@/lib/types";
import { asTagPosition, asTagSize, getTagPositionClasses, getTagSizeClasses } from "@/lib/utils/tag";

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
  if (border === "dashed") return "border-dashed";
  if (border === "none") return "border-transparent";
  return "border-solid";
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
  emojiIcon?: string;
  backgroundColor?: string;
  borderColor?: string;
  borderWidth?: number | string;
} {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }
  const input = value as Record<string, unknown>;
  return {
    badge: typeof input.badge === "string" ? input.badge : "",
    tagPosition: asTagPosition(input.tagPosition),
    tagSize: asTagSize(input.tagSize),
    emojiIcon: typeof input.emojiIcon === "string" ? input.emojiIcon : "",
    backgroundColor:
      typeof input.backgroundColor === "string" ? input.backgroundColor : "",
    borderColor: typeof input.borderColor === "string" ? input.borderColor : "",
    borderWidth:
      typeof input.borderWidth === "number" || typeof input.borderWidth === "string"
        ? input.borderWidth
        : undefined,
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
}): boolean {
  return hasVisibleBackground(settings) || hasVisibleBorderWidth(settings.borderWidth);
}

function getStructuralPaddingClass(settings: {
  backgroundColor?: string;
  borderWidth?: number | string;
}): string {
  return hasStructuralChrome(settings) ? "rounded-md p-4" : "";
}

function getStructuralStyle(settings: {
  backgroundColor?: string;
  borderColor?: string;
  borderWidth?: number | string;
}) {
  const normalizedBorderWidth = normalizeBorderWidth(settings.borderWidth);
  const hasVisibleBorder = Boolean(normalizedBorderWidth);

  return {
    backgroundColor: settings.backgroundColor || undefined,
    borderColor: settings.borderColor || undefined,
    borderWidth: normalizedBorderWidth,
    borderStyle: hasVisibleBorder ? "solid" : undefined,
  };
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
      className="relative overflow-visible space-y-4 rounded-xl border border-border bg-surface-raised p-4 shadow-sm"
      style={{
        backgroundColor: stageSettings.backgroundColor || undefined,
        borderColor: stageSettings.borderColor || undefined,
        borderWidth:
          typeof stageSettings.borderWidth === "number"
            ? `${stageSettings.borderWidth}px`
            : undefined,
      }}
    >
      {stageSettings.badge ? (
        <span
          className={`absolute z-20 rounded-full border border-border bg-primary text-primary-foreground shadow-sm ${getTagPositionClasses(
            asTagPosition(stageSettings.tagPosition)
          )} ${getTagSizeClasses(asTagSize(stageSettings.tagSize))}`}
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
          className={`relative overflow-visible ${getStructuralPaddingClass(containerSettings)}`}
          style={getStructuralStyle(containerSettings)}
        >
          {containerSettings.badge ? (
            <span
              className={`absolute z-20 rounded-full border border-border bg-primary text-primary-foreground shadow-sm ${getTagPositionClasses(
                asTagPosition(containerSettings.tagPosition)
              )} ${getTagSizeClasses(asTagSize(containerSettings.tagSize))}`}
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
              const rowSettings = asLayoutSettings(row.settings ?? {});
              const rowBorderWidth = normalizeBorderWidth(rowSettings.borderWidth);
              const hasRowChrome =
                hasVisibleBackground(rowSettings) ||
                Boolean(rowBorderWidth);
              const rowStyle = {
                ...getRowGridStyle(row.columns.length),
                backgroundColor: rowSettings.backgroundColor || undefined,
                borderColor: rowSettings.borderColor || undefined,
                borderWidth: rowBorderWidth,
                borderStyle: rowBorderWidth ? "solid" : undefined,
              } satisfies CSSProperties;

              return (
                <div
                  key={row.id}
                  className={`relative overflow-visible grid items-start gap-4 ${
                    hasRowChrome ? "rounded-md p-4" : ""
                  }`}
                  style={rowStyle}
                >
                  {rowSettings.badge ? (
                    <span
                      className={`absolute z-20 rounded-full border border-border bg-primary text-primary-foreground shadow-sm ${getTagPositionClasses(
                        asTagPosition(rowSettings.tagPosition)
                      )} ${getTagSizeClasses(asTagSize(rowSettings.tagSize))}`}
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
                    const columnSettings = asLayoutSettings(column.settings ?? {});
                    const columnBorderWidth = normalizeBorderWidth(columnSettings.borderWidth);
                    const hasColumnChrome =
                      hasVisibleBackground(columnSettings) ||
                      Boolean(columnBorderWidth);
                    const columnStyle = {
                      backgroundColor: columnSettings.backgroundColor || undefined,
                      borderColor: columnSettings.borderColor || undefined,
                      borderWidth: columnBorderWidth,
                      borderStyle: columnBorderWidth ? "solid" : undefined,
                    } satisfies CSSProperties;

                    return (
                      <div
                    key={column.id}
                    data-renderer="column"
                    className={`relative overflow-visible flex w-full min-w-0 flex-col gap-4 ${
                      hasColumnChrome ? "rounded-md p-4" : ""
                    }`}
                    style={columnStyle}
                  >
                    {columnSettings.badge ? (
                      <span
                        className={`absolute z-20 rounded-full border border-border bg-primary text-primary-foreground shadow-sm ${getTagPositionClasses(
                          asTagPosition(columnSettings.tagPosition)
                        )} ${getTagSizeClasses(asTagSize(columnSettings.tagSize))}`}
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
                    <article
                      key={`${element.id}:${groupValues[element.id]?.updated_at ?? "base"}`}
                      data-element-index={elementIndex}
                      data-container-index={containerIndex}
                      data-column-index={columnIndex}
                      data-social-time={socialTime}
                      data-print-tag={printTag}
                      className={`relative overflow-visible rounded border px-2 py-2 text-xs ${getBorderClass(border)} ${getShadowClass(shadow)} border-border bg-background`}
                      style={{
                        color: textColor || undefined,
                        backgroundColor: backgroundColor || undefined,
                        borderWidth:
                          typeof elementBorderWidth === "number"
                            ? `${elementBorderWidth}px`
                            : undefined,
                        borderColor: elementBorderColor || undefined,
                      }}
                      >
                      {badgeText ? (
                        <span
                          className={`absolute z-20 rounded-full border border-border bg-primary text-primary-foreground shadow-sm ${getTagPositionClasses(
                            tagPosition
                          )} ${getTagSizeClasses(tagSize)}`}
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
                        onValueSaved={onValueSaved}
                      />
                    </article>
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
