// ---------------------------------------------------------------------------
// Shared TypeScript types for the Chamama Hackathon System
// These types mirror the DB schema and are the single canonical shape
// used by both the renderer and the builder.
// ---------------------------------------------------------------------------

export type UserRole = "user" | "admin";

export interface AppUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  group_id: string | null;
}

export interface Group {
  id: string;
  name: string;
  hackathon_id: string;
}

// ---------------------------------------------------------------------------
// Hackathon definition — the JSON tree that drives the entire renderer and builder
// ---------------------------------------------------------------------------

export type ElementType =
  // Display
  | "heading"
  | "text"
  | "image"
  | "video"
  | "hero"
  | "alert"
  | "list"
  | "icon_card"
  // Input
  | "short_text"
  | "long_text"
  | "repeater_list"
  | "advanced_repeater"
  // Complex
  | "card_builder"
  | "options_builder"
  | "research_block"
  | "position_paper"
  | "pitch";

export interface Element {
  id: string;
  type: ElementType;
  config: Record<string, unknown>;
  // Index signature allows safe spreading and casting to/from Record<string, unknown>
  // in renderer and builder code without double-casting through `unknown`.
  [key: string]: unknown;
}

export interface Column {
  id: string;
  elements: Element[];
}

export interface Container {
  id: string;
  columns: Column[];
}

export interface Stage {
  id: string;
  title: string;
  containers: Container[];
}

export interface ThemeTokens {
  fonts: Record<string, string>;
  colors: Record<string, string>;
  spacing: Record<string, string>;
  components: Record<string, unknown>;
}

export interface HackathonDefinition {
  id: string;
  title: string;
  slogan: string;
  description: string;
  theme: ThemeTokens;
  /** The visual theme applied to the runtime view. Defaults to "simple". */
  themeName?: string;
  is_active: boolean;
  stages: Stage[];
}

export interface Hackathon {
  id: string;
  title: string;
  definition: HackathonDefinition;
  is_active: boolean;
  theme: ThemeTokens;
}

// ---------------------------------------------------------------------------
// Group values — per-group user input stored in the DB
// ---------------------------------------------------------------------------

export interface GroupValue {
  id: string;
  hackathon_id: string;
  group_id: string;
  element_id: string;
  value: unknown;
  updated_at: string;
  updated_by: string;
}

// Keyed by element_id for fast lookup in the renderer
export type GroupValueMap = Record<string, GroupValue>;
