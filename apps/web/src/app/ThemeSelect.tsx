/**
 * The theme picker (overview §6): system, light or dark, applied to the page
 * root and kept in the browser when it allows.
 */
import { useEffect, useState, type JSX } from "react";

import { SelectField, picker } from "../playground/fields.tsx";
import { applyTheme, browserStorage, readTheme, saveTheme, THEMES, type Theme } from "./theme.ts";

const THEME_NAMES: Readonly<Record<Theme, string>> = {
  system: "do sistema",
  light: "claro",
  dark: "escuro",
};

const OPTIONS = THEMES.map((theme) => ({ value: theme, label: THEME_NAMES[theme] }));

/** A labelled select of the theme. */
export function ThemeSelect(): JSX.Element {
  const [theme, setTheme] = useState<Theme>(() => readTheme(browserStorage()));
  useEffect(() => {
    applyTheme(document.documentElement, theme);
  }, [theme]);
  return (
    <SelectField
      label="Tema"
      value={theme}
      options={OPTIONS}
      onChange={picker(THEMES, (chosen) => {
        saveTheme(browserStorage(), chosen);
        setTheme(chosen);
      })}
    />
  );
}
