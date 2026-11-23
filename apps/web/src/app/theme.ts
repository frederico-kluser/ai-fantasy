/**
 * Light and dark themes (overview §6): the system choice by default, or one
 * picked by hand and kept in the browser. Storage may be blocked (private
 * windows, cleared data), so every access is guarded and the page works
 * without it.
 */

/** The themes: follow the system, or force light or dark. */
export const THEMES = ["system", "light", "dark"] as const;

/** A theme. */
export type Theme = (typeof THEMES)[number];

/** Key of the chosen theme in the browser storage. */
export const THEME_KEY = "ai-fantasy.theme";

/** What the theme needs of a storage (`localStorage` fits). */
export interface ThemeStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

function isTheme(value: string | null): value is Theme {
  return THEMES.some((theme) => theme === value);
}

/** The stored theme, or `system` when there is none, it is unknown or storage fails. */
export function readTheme(storage: ThemeStorage | null): Theme {
  try {
    const stored = storage?.getItem(THEME_KEY) ?? null;
    return isTheme(stored) ? stored : "system";
  } catch {
    return "system";
  }
}

/** Keeps the theme; a storage that fails is ignored (the choice lasts for the page only). */
export function saveTheme(storage: ThemeStorage | null, theme: Theme): void {
  try {
    storage?.setItem(THEME_KEY, theme);
  } catch {
    // Blocked storage: the theme still applies to this page.
  }
}

/** Marks `root` with the theme; `system` removes the mark, so `prefers-color-scheme` decides. */
export function applyTheme(root: HTMLElement, theme: Theme): void {
  if (theme === "system") {
    delete root.dataset["theme"];
    return;
  }
  root.dataset["theme"] = theme;
}

/** The browser storage, or `null` when the browser blocks it. */
export function browserStorage(): ThemeStorage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}
