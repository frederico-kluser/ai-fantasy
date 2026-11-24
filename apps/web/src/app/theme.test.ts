import { describe, expect, it } from "vitest";

import { applyTheme, readTheme, saveTheme, THEME_KEY, type ThemeStorage } from "./theme.ts";

function aStorage(
  entries: Record<string, string> = {},
): ThemeStorage & { entries: Record<string, string> } {
  return {
    entries,
    getItem: (key) => entries[key] ?? null,
    setItem: (key, value) => {
      entries[key] = value;
    },
  };
}

const BROKEN: ThemeStorage = {
  getItem: () => {
    throw new Error("blocked");
  },
  setItem: () => {
    throw new Error("blocked");
  },
};

describe("theme", () => {
  it("given nothing stored when reading then the theme follows the system", () => {
    expect(readTheme(aStorage())).toBe("system");
  });

  it.each(["light", "dark", "system"] as const)(
    "given %s stored when reading then it comes back",
    (theme) => {
      expect(readTheme(aStorage({ [THEME_KEY]: theme }))).toBe(theme);
    },
  );

  it("given garbage stored when reading then the theme follows the system", () => {
    expect(readTheme(aStorage({ [THEME_KEY]: "purple" }))).toBe("system");
  });

  it("given no storage when reading then the theme follows the system", () => {
    expect(readTheme(null)).toBe("system");
  });

  it("given a storage that throws when reading then the theme follows the system", () => {
    expect(readTheme(BROKEN)).toBe("system");
  });

  it("given a theme when saving then it is stored under the theme key", () => {
    const storage = aStorage();

    saveTheme(storage, "dark");

    expect(storage.entries).toStrictEqual({ "ai-fantasy.theme": "dark" });
  });

  it("given a storage that throws when saving then nothing breaks", () => {
    expect(() => {
      saveTheme(BROKEN, "dark");
      saveTheme(null, "dark");
    }).not.toThrow();
  });

  it.each(["light", "dark"] as const)(
    "given %s when applying then the root carries it",
    (theme) => {
      const root = document.createElement("html");

      applyTheme(root, theme);

      expect(root.dataset["theme"]).toBe(theme);
    },
  );

  it("given system when applying then the root follows the system again", () => {
    const root = document.createElement("html");
    applyTheme(root, "dark");

    applyTheme(root, "system");

    expect(root.hasAttribute("data-theme")).toBe(false);
  });
});
