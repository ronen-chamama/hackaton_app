import { ElementRenderer } from "@/components/elements/ElementRenderer";
import type { GroupValueMap, Stage } from "@/lib/types";

interface StageRendererProps {
  stage: Stage | null;
  groupValues: GroupValueMap;
  hackathonId: string;
  groupId: string | null;
  userId: string | null;
  onValueSaved: (value: GroupValueMap[string]) => void;
}

export function StageRenderer({
  stage,
  groupValues,
  hackathonId,
  groupId,
  userId,
  onValueSaved,
}: StageRendererProps) {
  const getBorderClass = (border?: string) => {
    if (border === "dashed") {
      return "border-dashed";
    }
    if (border === "none") {
      return "border-transparent";
    }
    return "border-solid";
  };

  const getShadowClass = (shadow?: string) => {
    if (shadow === "sm") {
      return "shadow-sm";
    }
    if (shadow === "md") {
      return "shadow-md";
    }
    if (shadow === "lg") {
      return "shadow-lg";
    }
    return "";
  };

  if (!stage) {
    return null;
  }

  return (
    <section className="space-y-4 rounded-xl border border-border bg-surface-raised p-4 shadow-sm">
      {stage.containers.map((container) => (
        <div key={container.id} className="rounded-lg border border-border/80 p-3">
          <div
            className="grid gap-3"
            style={{
              gridTemplateColumns: `repeat(${Math.max(container.columns.length, 1)}, minmax(0, 1fr))`,
            }}
          >
            {container.columns.map((column) => (
              <div
                key={column.id}
                className="min-h-28 space-y-2 rounded-lg border border-dashed border-border bg-background p-2"
              >
                {column.elements.map((element) => {
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

                  return (
                    <article
                      key={`${element.id}:${groupValues[element.id]?.updated_at ?? "base"}`}
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
