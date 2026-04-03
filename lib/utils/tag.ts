export type TagPosition =
  | "top-right"
  | "top-left"
  | "bottom-right"
  | "bottom-left"
  | "top-center"
  | "bottom-center";

export type TagSize = "small" | "medium" | "large";

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
