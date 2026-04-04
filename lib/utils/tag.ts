export type TagPosition =
  | "top-right"
  | "top-left"
  | "bottom-right"
  | "bottom-left"
  | "top-center"
  | "bottom-center";

export type TagSize = "small" | "medium" | "large";
export type TagBorderStyle = "solid" | "dashed" | "dotted";
export type TagBorderWidth = "0px" | "1px" | "2px" | "4px";
export type TagShape = "square" | "rounded" | "pill";

export function asTagPosition(value: unknown): TagPosition {
  if (
    value === "top-left" ||
    value === "bottom-right" ||
    value === "bottom-left" ||
    value === "top-center" ||
    value === "bottom-center"
  ) {
    return value;
  }
  return "top-right";
}

export function asTagSize(value: unknown): TagSize {
  if (value === "medium" || value === "large") {
    return value;
  }
  return "small";
}

export function asTagBorderStyle(value: unknown): TagBorderStyle {
  if (value === "dashed" || value === "dotted") {
    return value;
  }
  return "solid";
}

export function asTagBorderWidth(value: unknown): TagBorderWidth {
  if (value === "1px" || value === "2px" || value === "4px") {
    return value;
  }
  return "0px";
}

export function asTagShape(value: unknown): TagShape {
  if (value === "square" || value === "pill") {
    return value;
  }
  return "rounded";
}

export function getTagPositionClasses(position: TagPosition): string {
  switch (position) {
    case "top-left":
      return "-top-3 -left-3";
    case "bottom-right":
      return "-bottom-3 -right-3";
    case "bottom-left":
      return "-bottom-3 -left-3";
    case "top-center":
      return "-top-3 left-1/2 -translate-x-1/2";
    case "bottom-center":
      return "-bottom-3 left-1/2 -translate-x-1/2";
    default:
      return "-top-3 -right-3";
  }
}

export function getTagSizeClasses(size: TagSize): string {
  switch (size) {
    case "medium":
      return "text-sm px-3 py-1.5";
    case "large":
      return "text-base px-4 py-2 font-bold";
    default:
      return "text-xs px-2 py-1";
  }
}

export function getTagShapeClasses(shape: TagShape): string {
  switch (shape) {
    case "square":
      return "rounded-none";
    case "pill":
      return "rounded-full px-4";
    default:
      return "rounded-md";
  }
}

export function getTagInlineStyle({
  backgroundColor,
  textColor,
  borderStyle,
  borderWidth,
}: {
  backgroundColor?: string;
  textColor?: string;
  borderStyle?: unknown;
  borderWidth?: unknown;
}) {
  const resolvedBorderWidth = asTagBorderWidth(borderWidth);
  const hasBorder = resolvedBorderWidth !== "0px";

  return {
    backgroundColor: backgroundColor || undefined,
    color: textColor || undefined,
    borderWidth: hasBorder ? resolvedBorderWidth : undefined,
    borderStyle: hasBorder ? asTagBorderStyle(borderStyle) : undefined,
  };
}
