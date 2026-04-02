import dictionary from "@/locales/he.json";

type DictionaryKey = keyof typeof dictionary;

/**
 * Returns the Hebrew string for a given locale key.
 * All user-facing text must pass through this function — never hardcode Hebrew in components.
 */
export function t(key: DictionaryKey): string {
  return dictionary[key];
}

export { dictionary };
export type { DictionaryKey };
