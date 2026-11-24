import { loadPresets } from "@ai-fantasy/engine";
import { describe, expect, it } from "vitest";

import { PRESETS, presetsOrThrow } from "./presets.ts";

describe("presets of the site", () => {
  it("given the default catalogs when loading then the presets come back", () => {
    expect(presetsOrThrow(loadPresets())).toStrictEqual(PRESETS);
  });

  it("given broken catalogs when loading then the error names the first problem and what to do", () => {
    expect(() => presetsOrThrow(loadPresets({}))).toThrow(
      /^Erro: os catálogos de presets não carregam \(.+\) — Solução: rode npm run test -w @ai-fantasy\/engine e corrija o catálogo\.$/,
    );
  });

  it("given a failure without problems when loading then the error still says what to do", () => {
    expect(() => presetsOrThrow({ ok: false, error: [] })).toThrow(
      "Erro: os catálogos de presets não carregam () — Solução: rode npm run test -w @ai-fantasy/engine e corrija o catálogo.",
    );
  });
});
