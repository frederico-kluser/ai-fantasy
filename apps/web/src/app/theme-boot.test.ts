import { readFileSync } from "node:fs";

import { afterEach, describe, expect, it, vi } from "vitest";

import { THEME_KEY } from "./theme.ts";

/** The page of the site, read from the package (also inside the Stryker sandbox). */
const PAGE = readFileSync(new URL("../../index.html", import.meta.url), "utf8");

/** The inline script of the page head: the first `<script>` without attributes. */
const BOOT = /<script>([\s\S]*?)<\/script>/.exec(PAGE)?.[1] ?? "";

function runBoot(): void {
  // The script is the page's own code; running it here is what the browser does first.
  // A script of the page takes no arguments and returns nothing.
  // eslint-disable-next-line @typescript-eslint/no-implied-eval
  const boot = new Function(BOOT) as () => void;
  boot();
}

afterEach(() => {
  vi.restoreAllMocks();
  window.localStorage.clear();
  delete document.documentElement.dataset["theme"];
});

describe("theme before the first paint (index.html)", () => {
  it("given the page when reading it then the boot script comes before the app script", () => {
    expect(PAGE.indexOf("<script>")).toBeLessThan(PAGE.indexOf('<script type="module"'));
  });

  it("given the boot script when reading it then it reads the key of the theme picker", () => {
    expect(BOOT).toContain(`"${THEME_KEY}"`);
  });

  it.each(["light", "dark"])(
    "given %s stored when the page boots then the root carries it",
    (theme) => {
      window.localStorage.setItem(THEME_KEY, theme);

      runBoot();

      expect(document.documentElement.dataset["theme"]).toBe(theme);
    },
  );

  it.each(["system", "purple"])(
    "given %s stored when the page boots then the system decides",
    (theme) => {
      window.localStorage.setItem(THEME_KEY, theme);

      runBoot();

      expect(document.documentElement.hasAttribute("data-theme")).toBe(false);
    },
  );

  it("given a browser that blocks storage when the page boots then nothing breaks", () => {
    vi.spyOn(window, "localStorage", "get").mockImplementation(() => {
      throw new Error("blocked");
    });

    expect(runBoot).not.toThrow();
  });
});
