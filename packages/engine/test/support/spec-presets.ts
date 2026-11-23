/**
 * The catalogs of presets.md read from the document, in the shape of the parsed
 * preset catalogs. Test support for `src/presets/spec.test.ts`.
 */
import {
  cell,
  code,
  codes,
  DASH,
  integer,
  list,
  lookup,
  section,
  tableOf,
  yesNo,
  type SpecName,
} from "./spec-markdown.ts";
import { specAptitudes } from "./spec-model.ts";

const PRESETS: SpecName = "presets";

const EXPOSURE = { não: "NONE", parcial: "PARTIAL", sim: "FULL" } as const;

/** §2: the places, without their grid templates. */
export function specPlaces() {
  return tableOf(PRESETS, "## 2. Lugares").rows.map((row) => ({
    id: code(cell(row, 0)),
    name: cell(row, 1),
    examples: list(cell(row, 2)),
    danger: integer(cell(row, 3)),
    comfort: integer(cell(row, 4)),
    privacy: integer(cell(row, 5)),
    noise: integer(cell(row, 6)),
    baseTemperature: cell(row, 7) === "clima" ? 0 : integer(cell(row, 7)),
    lit: yesNo(cell(row, 8)),
    tags: codes(cell(row, 9)),
    exposure: lookup(EXPOSURE, cell(row, 11)),
  }));
}

/** §2: the size (`W × H`) of the default grid of each place. */
export function specGridSizes() {
  return tableOf(PRESETS, "## 2. Lugares").rows.map((row) => {
    const size = /(\d+) × (\d+)/.exec(cell(row, 10));
    return { id: code(cell(row, 0)), width: Number(size?.[1]), height: Number(size?.[2]) };
  });
}

/** §2.1: the legend of the template rows, character → cell type. */
export function specGridLegend() {
  const rows = tableOf(PRESETS, "### 2.1 Gabaritos de grade", 1).rows;
  return Object.fromEntries(rows.map((row) => [code(cell(row, 0)), code(cell(row, 1))]));
}

/** §2.1: the traversable cell types, from the sentence under the legend. */
export function specTraversableCells() {
  const text = section(PRESETS, "### 2.1 Gabaritos de grade");
  const sentence = text.split("\n").find((line) => line.startsWith("Atravessáveis são"));
  return codes(sentence ?? "");
}

/** §3: the weathers. */
export function specWeathers() {
  return tableOf(PRESETS, "## 3. Climas").rows.map((row) => ({
    id: code(cell(row, 0)),
    name: cell(row, 1),
    temperature: integer(cell(row, 2)),
    extraNoise: integer(cell(row, 3)),
  }));
}

function cited(text: string): [string, number][] {
  return list(text).map((item) => [code(item), integer(item.slice(item.lastIndexOf(" ")))]);
}

function highAptitudes(text: string): string[] {
  const names = Object.fromEntries(specAptitudes().map((entry) => [entry.name, entry.id]));
  const words = text.replace(/ altas?$/, "");
  return text === DASH ? [] : words.split(" e ").map((name) => lookup(names, name));
}

/** §5: the character archetypes. */
export function specCharacterArchetypes() {
  return tableOf(PRESETS, "## 5. Arquétipos de personagem").rows.map((row) => ({
    id: code(cell(row, 0)),
    name: cell(row, 1),
    examples: list(cell(row, 2)),
    traits: Object.fromEntries(cited(cell(row, 3))),
    dominantDrives: codes(cell(row, 4)),
    highAptitudes: highAptitudes(cell(row, 5)),
    voice: cell(row, 6),
  }));
}

/** §6: the paragraph that starts with `start`, as one line. */
function paragraph(start: string): string {
  const text = section(PRESETS, "## 6. Arquétipos de laço");
  const from = text.slice(text.indexOf(start));
  return from.slice(0, from.indexOf("\n\n")).replaceAll("\n", " ");
}

/** §6: axis name used in the tables → axis id, from "confiança (`trust`), afeto (`affection`)…". */
export function axisNames(): Record<string, string> {
  const sentence = paragraph("Eixos do laço");
  const names = sentence.slice(sentence.indexOf(": ") + 2, sentence.indexOf(". Valores"));
  const pairs = names
    .split(/, | e /)
    .map((item): [string, string] => [item.split(" (")[0] ?? "", code(item)]);
  return Object.fromEntries(pairs);
}

interface SpecBondSide {
  label: string;
  axes: Record<string, number>;
  directedDrives: string[];
}

function bondSide(label: string, text: string): SpecBondSide {
  const side: SpecBondSide = { label, axes: {}, directedDrives: [] };
  const names = axisNames();
  for (const item of list(text)) {
    if (/^`\w+` dirigid[oa]$/.test(item)) {
      side.directedDrives.push(code(item));
    } else if (!item.startsWith("tudo em ")) {
      const cut = item.lastIndexOf(" ");
      side.axes[lookup(names, item.slice(0, cut))] = integer(item.slice(cut));
    }
  }
  return side;
}

/** §6: the bond archetypes; "idem" repeats A→B for B→A. */
export function specBondArchetypes() {
  const directional = codes(paragraph("Os arquétipos com papéis diferentes"));
  return tableOf(PRESETS, "## 6. Arquétipos de laço").rows.map((row) => {
    const id = code(cell(row, 0));
    const [labelA = "", labelB = ""] = codes(cell(row, 2));
    const aToB = bondSide(labelA, cell(row, 3));
    const bToA =
      cell(row, 4) === "idem" ? { ...aToB, label: labelB } : bondSide(labelB, cell(row, 4));
    const typicalEvents = codes(cell(row, 5));
    return {
      id,
      name: cell(row, 1),
      directional: directional.includes(id),
      aToB,
      bToA,
      typicalEvents,
    };
  });
}

/** §6: the ids named as directional in the paragraph under the table. */
export function specDirectionalBondArchetypes() {
  return codes(paragraph("Os arquétipos com papéis diferentes"));
}

/** §8: the association tags. */
export function specAssociationTags() {
  return tableOf(PRESETS, "## 8. Associações").rows.map((row) => ({
    id: code(cell(row, 0)),
    name: cell(row, 1),
  }));
}
