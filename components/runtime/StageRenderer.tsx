import { ElementRenderer } from "@/components/elements/ElementRenderer";
import { t } from "@/lib/i18n";
import type { GroupValueMap, Stage } from "@/lib/types";

interface StageRendererProps {
  stage: Stage | null;
  groupValues: GroupValueMap;
  hackathonId: string;
  groupId: string | null;
  userId: string | null;
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

export function StageRenderer({
  stage,
  groupValues,
  hackathonId,
  groupId,
  userId,
  onValueSaved,
}: StageRendererProps) {
  if (!stage) return null;

  // Global element counter across containers/columns for deterministic decoration
  let globalElementIndex = 0;

  return (
    <section className="space-y-4 rounded-xl border border-border bg-surface-raised p-4 shadow-sm">
      {stage.containers.map((container, containerIndex) => (
        <div
          key={container.id}
          data-renderer="container"
          className="rounded-lg border border-border/80 p-3"
        >
          <div
            className="grid gap-3"
            style={{
              gridTemplateColumns: `repeat(${Math.max(container.columns.length, 1)}, minmax(0, 1fr))`,
            }}
          >
            {container.columns.map((column, columnIndex) => (
              <div
                key={column.id}
                data-renderer="column"
                className="min-h-28 space-y-2 rounded-lg border border-dashed border-border bg-background p-2"
              >
                {column.elements.map((element) => {
                  const elementIndex = globalElementIndex++;
                  const elementRecord = element as Record<string, unknown>;

                  const badgeText =
                    typeof elementRecord.badgeText === "string"
                      ? elementRecord.badgeText
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
                      className={`relative rounded border px-2 py-2 text-xs ${getBorderClass(border)} ${getShadowClass(shadow)} border-border bg-background`}
                      style={{
                        color: textColor || undefined,
                        backgroundColor: backgroundColor || undefined,
                      }}
                    >
                      {badgeText ? (
                        <span className="absolute -top-2 -right-2 rounded-full border border-border bg-primary px-2 py-0.5 text-[10px] font-semibold text-primary-foreground">
                          {badgeText}
                        </span>
                      ) : null}

                      <ElementRenderer
                        element={element}
                        groupValue={groupValues[element.id]}
                        hackathonId={hackathonId}
                        groupId={groupId}
                        userId={userId}
                        onValueSaved={onValueSaved}
                      />
                    </article>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      ))}
    </section>
  );
}
