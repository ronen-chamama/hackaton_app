import type { ThemeTokens } from "@/lib/types";

// ---------------------------------------------------------------------------
// Theme name union — matches the data-theme CSS attribute values
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Component-level style tokens
// These JS objects are available to components that need theme-specific
// class overrides beyond what the global CSS handles automatically.
// ---------------------------------------------------------------------------

export interface ThemeComponentTokens {
  /** CSS classes for the main runtime header wrapper */
  headerClass: string;
  /** CSS classes for the stage navigation bar */
  stageNavClass: string;
  /** CSS classes for text inputs and textareas */
  inputClass: string;
  /** CSS classes for card-like container elements */
  cardClass: string;
  /** CSS classes for primary action buttons */
  buttonPrimaryClass: string;
  /** CSS classes for secondary / ghost buttons */
  buttonSecondaryClass: string;
  /** Decoration character shown in badges / tags */
  badgeDecor: string;
}

// ---------------------------------------------------------------------------
// Per-theme configuration object
// ---------------------------------------------------------------------------

export interface ThemeConfig {
  /** i18n key for the human-readable display name */
  labelKey: string;
  /**
   * CSS variable names pointing to the loaded next/font variables.
   * These are referenced in globals.css per [data-theme] block.
   */
  fonts: {
    heading: string;
    body: string;
  };
  /** Token snapshot stored in the DB alongside the hackathon definition */
  tokens: Partial<ThemeTokens>;
  /** JS-accessible component style tokens for runtime components */
  components: ThemeComponentTokens;
}

// ---------------------------------------------------------------------------
// Full registry
// ---------------------------------------------------------------------------

export const THEME_REGISTRY: Record<ThemeName, ThemeConfig> = {
  // -------------------------------------------------------------------------
  // SIMPLE — glassmorphism, lavender/purple/teal/pink, ultra-rounded
  // -------------------------------------------------------------------------
  simple: {
    labelKey: "themeSimple",
    fonts: { heading: "var(--font-heebo)", body: "var(--font-heebo)" },
    tokens: {
      colors: {
        primary: "#7c3aed",
        secondary: "#0ea5e9",
        accent: "#ec4899",
        background: "#f8f7ff",
        foreground: "#1e1b4b",
        border: "rgba(139, 92, 246, 0.2)",
      },
      fonts: { body: "heebo", heading: "heebo" },
      spacing: {},
      components: { themeName: "simple" },
    },
    components: {
      headerClass: "rounded-3xl border border-blue-200 bg-white shadow-md",
      stageNavClass: "rounded-3xl border border-blue-200 bg-white",
      inputClass: "rounded-xl border border-blue-200 bg-blue-50 focus:border-blue-600",
      cardClass: "rounded-3xl border border-blue-100 bg-white shadow-sm",
      buttonPrimaryClass: "rounded-full bg-blue-700 text-white font-semibold shadow-sm hover:bg-blue-600",
      buttonSecondaryClass: "rounded-full border border-blue-300 bg-white text-blue-800 hover:bg-blue-50",
      badgeDecor: "•",
    },
  },

  // -------------------------------------------------------------------------
  // PLEASANT — autumn forest, warm pastels, dashed organic borders
  // -------------------------------------------------------------------------
  pleasant: {
    labelKey: "themePleasant",
    fonts: { heading: "var(--font-varela)", body: "var(--font-varela)" },
    tokens: {
      colors: {
        primary: "#b45309",
        secondary: "#5a7a4e",
        accent: "#c17f6e",
        background: "#fdf6e8",
        foreground: "#3d2b1f",
        border: "#d4956a",
      },
      fonts: { body: "varela", heading: "varela" },
      spacing: {},
      components: { themeName: "pleasant" },
    },
    components: {
      headerClass: "rounded-lg border-2 border-dashed border-amber-300 bg-amber-50/60",
      stageNavClass: "rounded-lg border-2 border-dashed border-amber-300 bg-amber-50/40",
      inputClass: "rounded border border-dashed border-amber-300 bg-amber-50/40 focus:border-solid focus:border-amber-600",
      cardClass: "rounded-lg border-2 border-dashed border-amber-200 bg-white",
      buttonPrimaryClass: "rounded bg-amber-700 text-white font-semibold hover:bg-amber-600",
      buttonSecondaryClass: "rounded border border-dashed border-amber-400 bg-white text-amber-800 hover:bg-amber-50",
      badgeDecor: "✦",
    },
  },

  // -------------------------------------------------------------------------
  // FORMAL — official/governmental, Frank Ruhl Libre serif, navy + gold
  // -------------------------------------------------------------------------
  formal: {
    labelKey: "themeFormal",
    fonts: { heading: "var(--font-frank-ruhl)", body: "var(--font-arimo)" },
    tokens: {
      colors: {
        primary: "#1e3a5f",
        secondary: "#7c6d5a",
        accent: "#b8860b",
        background: "#fafaf8",
        foreground: "#1a1a1a",
        border: "#c5b9a8",
      },
      fonts: { body: "arimo", heading: "frank-ruhl" },
      spacing: {},
      components: { themeName: "formal" },
    },
    components: {
      headerClass: "rounded-none border-t-4 border-b border-t-navy border-b-stone-400 bg-stone-50 shadow-none",
      stageNavClass: "rounded-none border-b-2 border-navy bg-stone-50",
      inputClass: "rounded-none border border-stone-400 bg-white",
      cardClass: "rounded-none border border-stone-300 bg-white shadow-none",
      buttonPrimaryClass: "rounded-none bg-navy text-white font-bold uppercase tracking-widest text-xs px-6",
      buttonSecondaryClass: "rounded-none border border-stone-500 bg-transparent text-stone-800 uppercase tracking-widest text-xs font-bold",
      badgeDecor: "§",
    },
  },

  // -------------------------------------------------------------------------
  // PLAYFUL — comic book panels, halftone dots, thick black outlines
  // -------------------------------------------------------------------------
  playful: {
    labelKey: "themePlayful",
    fonts: { heading: "var(--font-secular)", body: "var(--font-varela)" },
    tokens: {
      colors: {
        primary: "#e53935",
        secondary: "#1565c0",
        accent: "#f9a825",
        background: "#fffde0",
        foreground: "#0d0d0d",
        border: "#0d0d0d",
      },
      fonts: { body: "varela", heading: "secular" },
      spacing: {},
      components: { themeName: "playful" },
    },
    components: {
      headerClass: "border-3 border-gray-900 bg-white",
      stageNavClass: "border-3 border-gray-900 bg-yellow-50",
      inputClass: "rounded-full border-2 border-gray-900 bg-yellow-50/40 font-medium",
      cardClass: "border-2 border-gray-900 bg-white",
      buttonPrimaryClass: "rounded-full bg-rose-600 text-white font-bold border-2 border-gray-900 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-1px] hover:translate-y-[-1px]",
      buttonSecondaryClass: "rounded-full border-2 border-gray-900 bg-white text-gray-900 font-bold shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]",
      badgeDecor: "★",
    },
  },

  // -------------------------------------------------------------------------
  // SUBVERSIVE — neo-brutalist street art: neon lime + dark, hard shadows, skew
  // -------------------------------------------------------------------------
  subversive: {
    labelKey: "themeSubversive",
    fonts: { heading: "var(--font-rubik)", body: "var(--font-rubik)" },
    tokens: {
      colors: {
        primary: "#c8f400",
        secondary: "#ff3d3d",
        accent: "#ff9f0a",
        background: "#0c0c0c",
        foreground: "#f0f0f0",
        border: "#000000",
      },
      fonts: { body: "rubik", heading: "rubik" },
      spacing: {},
      components: { themeName: "subversive" },
    },
    components: {
      headerClass: "rounded-none border-4 border-black bg-lime-400 text-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]",
      stageNavClass: "rounded-none border-4 border-black bg-yellow-400 text-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]",
      inputClass: "rounded-none border-3 border-black bg-yellow-300 text-black font-bold placeholder:text-black/50",
      cardClass: "rounded-none border-3 border-black bg-zinc-700 text-zinc-100 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]",
      buttonPrimaryClass: "rounded-none bg-lime-400 text-black font-black uppercase tracking-widest border-3 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-1px] hover:translate-y-[-1px]",
      buttonSecondaryClass: "rounded-none border-3 border-black bg-yellow-400 text-black font-black uppercase tracking-widest shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]",
      badgeDecor: "!!!",
    },
  },

  // -------------------------------------------------------------------------
  // PRINT — newspaper front page, Frank Ruhl Libre, CSS multi-column layout
  // -------------------------------------------------------------------------
  print: {
    labelKey: "themePrint",
    fonts: { heading: "var(--font-frank-ruhl)", body: "var(--font-frank-ruhl)" },
    tokens: {
      colors: {
        primary: "#1a1714",
        secondary: "#4a3f30",
        accent: "#1a1714",
        background: "#f4f0e8",
        foreground: "#1a1714",
        border: "#7a7060",
      },
      fonts: { body: "frank-ruhl", heading: "frank-ruhl" },
      spacing: {},
      components: { themeName: "print" },
    },
    components: {
      headerClass: "rounded-none border-t-4 border-b border-t-black border-b-gray-500 bg-[#f4f1ea] shadow-none",
      stageNavClass: "rounded-none border-t border-b border-gray-500 bg-[#f4f1ea] shadow-none",
      inputClass: "rounded-none border-0 border-b border-gray-500 bg-transparent font-serif",
      cardClass: "rounded-none border-0 border-b border-gray-300 bg-transparent shadow-none",
      buttonPrimaryClass: "rounded-none border border-black bg-black text-[#f4f1ea] font-serif font-bold tracking-wide",
      buttonSecondaryClass: "rounded-none border border-black bg-transparent text-black font-serif",
      badgeDecor: "¶",
    },
  },

  // -------------------------------------------------------------------------
  // TECH — GitHub dark, JetBrains Mono, zero radius, cyan glow
  // -------------------------------------------------------------------------
  tech: {
    labelKey: "themeTech",
    fonts: { heading: "var(--font-jetbrains)", body: "var(--font-jetbrains)" },
    tokens: {
      colors: {
        primary: "#58a6ff",
        secondary: "#3fb950",
        accent: "#f78166",
        background: "#0d1117",
        foreground: "#c9d1d9",
        border: "#30363d",
      },
      fonts: { body: "jetbrains", heading: "jetbrains" },
      spacing: {},
      components: { themeName: "tech" },
    },
    components: {
      headerClass: "rounded-none border border-[#30363d] bg-[#161b22] shadow-none",
      stageNavClass: "rounded-none border border-[#30363d] bg-[#161b22] shadow-none",
      inputClass: "rounded-none border border-[#30363d] bg-[#0d1117] text-[#c9d1d9] font-mono text-sm focus:border-[#58a6ff]",
      cardClass: "rounded-none border border-[#30363d] bg-[#161b22] shadow-none",
      buttonPrimaryClass: "rounded-none bg-[#58a6ff] text-[#0d1117] font-semibold font-mono tracking-wide hover:bg-[#79b8ff] shadow-[0_0_8px_rgba(88,166,255,0.3)]",
      buttonSecondaryClass: "rounded-none border border-[#30363d] bg-[#21262d] text-[#c9d1d9] font-mono hover:border-[#6e7681]",
      badgeDecor: "⟩",
    },
  },

  // -------------------------------------------------------------------------
  // SOCIAL — Facebook group wall: post cards, avatar headers, reaction bars
  // -------------------------------------------------------------------------
  social: {
    labelKey: "themeSocial",
    fonts: { heading: "var(--font-heebo)", body: "var(--font-heebo)" },
    tokens: {
      colors: {
        primary: "#1877f2",
        secondary: "#42b72a",
        accent: "#f02849",
        background: "#f0f2f5",
        foreground: "#050505",
        border: "#ccd0d5",
      },
      fonts: { body: "heebo", heading: "heebo" },
      spacing: {},
      components: { themeName: "social" },
    },
    components: {
      headerClass: "rounded-xl border border-[#ccd0d5] bg-white shadow-sm",
      stageNavClass: "rounded-xl border border-[#ccd0d5] bg-white shadow-sm",
      inputClass: "rounded-full border border-[#ccd0d5] bg-[#f0f2f5] text-[#050505] focus:border-[#1877f2] focus:bg-white",
      cardClass: "rounded-xl border border-[#ccd0d5] bg-white shadow-sm hover:shadow-md transition-shadow",
      buttonPrimaryClass: "rounded-xl bg-[#1877f2] text-white font-semibold hover:bg-[#166fe5] shadow-sm",
      buttonSecondaryClass: "rounded-xl border border-[#ccd0d5] bg-white text-[#050505] font-medium hover:bg-[#f0f2f5]",
      badgeDecor: "●",
    },
  },
};

// ---------------------------------------------------------------------------
// Backwards-compatibility exports
// ---------------------------------------------------------------------------

/** @deprecated Use THEME_REGISTRY[name].tokens instead */
export const THEME_DEFAULTS: Record<ThemeName, Partial<ThemeTokens>> =
  Object.fromEntries(
    THEME_NAMES.map((name) => [name, THEME_REGISTRY[name].tokens])
  ) as Record<ThemeName, Partial<ThemeTokens>>;

/** Returns the data-theme attribute value for a given theme name. */
export function getThemeAttr(theme: ThemeName): string {
  return theme;
}

/** Retrieve the full config object for a theme (safe — falls back to simple). */
export function getThemeConfig(theme: string | undefined): ThemeConfig {
  const name = THEME_NAMES.includes(theme as ThemeName)
    ? (theme as ThemeName)
    : "simple";
  return THEME_REGISTRY[name];
}
