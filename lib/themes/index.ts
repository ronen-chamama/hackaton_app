import type { ThemeTokens } from "@/lib/types";

// Theme names correspond to the data-theme CSS attribute values defined in globals.css
export type ThemeName =
  | "simple"
  | "pleasant"
  | "formal"
  | "playful"
  | "subversive"
  | "print"
  | "tech"
  | "social";

export const THEME_NAMES: ThemeName[] = [
  "simple",
  "pleasant",
  "formal",
  "playful",
  "subversive",
  "print",
  "tech",
  "social",
];

/**
 * Default token values for each theme.
 * These are used when saving a hackathon definition to the DB so the
 * renderer can apply the correct tokens without re-reading CSS.
 * Phase 7 will expand these with full font, spacing, and component tokens.
 */
export const THEME_DEFAULTS: Record<ThemeName, Partial<ThemeTokens>> = {
  simple: {
    colors: { primary: "#374151", secondary: "#6b7280", accent: "#9ca3af" },
  },
  pleasant: {
    colors: { primary: "#0d9488", secondary: "#6366f1", accent: "#f59e0b" },
  },
  formal: {
    colors: { primary: "#1e3a5f", secondary: "#7c6d5a", accent: "#b8860b" },
  },
  playful: {
    colors: { primary: "#ec4899", secondary: "#f97316", accent: "#a855f7" },
  },
  subversive: {
    colors: { primary: "#dc2626", secondary: "#1d1d1d", accent: "#facc15" },
  },
  print: {
    colors: { primary: "#000000", secondary: "#444444", accent: "#000000" },
  },
  tech: {
    colors: { primary: "#06b6d4", secondary: "#8b5cf6", accent: "#10b981" },
  },
  social: {
    colors: { primary: "#3b82f6", secondary: "#ef4444", accent: "#f59e0b" },
  },
};

/**
 * Returns the data-theme attribute value for a given theme name.
 * Apply this to the root element or the renderer container.
 */
export function getThemeAttr(theme: ThemeName): string {
  return theme;
}
