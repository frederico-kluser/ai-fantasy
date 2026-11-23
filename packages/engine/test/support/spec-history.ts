/**
 * The history events (presets §7) and day states (presets §9) read from the
 * document, in the shape of the parsed preset catalogs. Test support for
 * `src/presets/spec.test.ts`.
 */
import {
  cell,
  code,
  codes,
  DASH,
  integer,
  list,
  lookup,
  tableOf,
  type SpecName,
} from "./spec-markdown.ts";
import { specBodyNeeds, specEmotions } from "./spec-model.ts";
import { axisNames } from "./spec-presets.ts";

const PRESETS: SpecName = "presets";

interface SpecEffects {
  bond: Record<string, number>;
  drives: Record<string, number>;
  baselines: Record<string, number>;
  baselinesIfHonest: Record<string, number>;
}

const IF_HONEST = " se `honesty` > 0";
const BASELINE = /^(.+) de base ([+−-]\d+)$/;
const DRIVE = /^`(\w+)`( dirigida)? ([+−-]\d+)$/;
/** Notes of the effect cells that are not effects. */
const NOTES = [" (só se B sabe)", " (B não sabe)"];

function emotionId(name: string): string {
  const names = Object.fromEntries(specEmotions().map((entry) => [entry.name, entry.id]));
  return lookup(names, name);
}

function addBaseline(effects: SpecEffects, item: string): boolean {
  const honest = item.endsWith(IF_HONEST);
  const baseline = BASELINE.exec(item.replace(IF_HONEST, ""));
  if (baseline === null) {
    return false;
  }
  const target = honest ? effects.baselinesIfHonest : effects.baselines;
  target[emotionId(baseline[1] ?? "")] = integer(baseline[2] ?? "");
  return true;
}

function addEffect(effects: SpecEffects, item: string): void {
  const drive = DRIVE.exec(item);
  if (item === "atração mantida" || addBaseline(effects, item)) {
    return;
  }
  if (drive !== null) {
    effects.drives[drive[1] ?? ""] = integer(drive[3] ?? "");
    return;
  }
  const cut = item.lastIndexOf(" ");
  effects.bond[lookup(axisNames(), item.slice(0, cut))] = integer(item.slice(cut));
}

function effectsOf(text: string): SpecEffects {
  const effects: SpecEffects = { bond: {}, drives: {}, baselines: {}, baselinesIfHonest: {} };
  const clean = NOTES.reduce((current, note) => current.replace(note, ""), text);
  const items = clean === DASH ? [] : clean.split(/[,;] /);
  for (const item of items) {
    addEffect(effects, item.trim());
  }
  return effects;
}

/**
 * §7: every drive named in an effect cell, with whether the cell marks it as
 * "dirigida", in table order; the test compares the mark with the drive catalog.
 */
export function specEventDriveMarks() {
  const cells = tableOf(PRESETS, "## 7. Acontecimentos de história").rows.flatMap((row) => [
    cell(row, 2),
    cell(row, 3),
  ]);
  return cells
    .flatMap((text) => text.split(/[,;] /))
    .map((item) => DRIVE.exec(item.trim()))
    .flatMap((match) =>
      match === null ? [] : [{ drive: match[1] ?? "", directed: match[2] !== undefined }],
    );
}

const OFFENDERS = { [DASH]: "NONE", A: "A", B: "B", ambos: "BOTH" } as const;

function secretChance(text: string): number {
  if (text.startsWith("com chance ")) {
    return integer(text.slice("com chance ".length));
  }
  return text.startsWith("sim") ? 10000 : 0;
}

/** §7: the history events; "idem" repeats the effects on A for B. */
export function specHistoryEvents() {
  return tableOf(PRESETS, "## 7. Acontecimentos de história").rows.map((row) => {
    const onA = effectsOf(cell(row, 2));
    return {
      id: code(cell(row, 0)),
      name: cell(row, 1),
      onA,
      onB: cell(row, 3) === "idem" ? onA : effectsOf(cell(row, 3)),
      offender: lookup(OFFENDERS, cell(row, 4)),
      secretChance: secretChance(cell(row, 5)),
      knownBy: cell(row, 6).includes("só A") ? "A" : "BOTH",
    };
  });
}

function rangeOf(text: string) {
  const [min = 0, max = min] = text.replaceAll("`", "").split("..").map(integer);
  return { min, max };
}

function scaleIds(scale: string): string[] {
  return specBodyNeeds()
    .filter((entry) => entry.scale === scale)
    .map((entry) => entry.id);
}

function rangesOf(item: string): [string, { min: number; max: number }][] {
  const value = rangeOf(item.slice(item.lastIndexOf(" ") + 1));
  if (item.startsWith("todas as necessidades em ")) {
    return scaleIds("UNIPOLAR").map((id) => [id, value]);
  }
  if (item.startsWith("térmico ")) {
    return scaleIds("BIPOLAR").map((id) => [id, value]);
  }
  return [[codes(item)[0] ?? "", value]];
}

function valuesOf(text: string) {
  return Object.fromEntries(text === DASH ? [] : list(text).flatMap(rangesOf));
}

/** §9: the day states, with the body and emotion ranges they set. */
export function specDayStates() {
  return tableOf(PRESETS, "## 9. Estado do dia").rows.map((row) => ({
    id: code(cell(row, 0)),
    name: cell(row, 1),
    body: valuesOf(cell(row, 2)),
    emotions: valuesOf(cell(row, 3)),
  }));
}
