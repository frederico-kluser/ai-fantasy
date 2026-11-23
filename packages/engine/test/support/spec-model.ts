/**
 * The lists of the simulation model (simulation-model §5 and §7) read from the
 * document, in the shape of the parsed preset catalogs. Test support for
 * `src/presets/spec.test.ts`.
 */
import {
  cell,
  code,
  codes,
  lookup,
  pairedRows,
  section,
  tableOf,
  type SpecName,
} from "./spec-markdown.ts";

const MODEL: SpecName = "simulation-model";

/** §5.1: id, name and scale; the bipolar need is named in the sentence above the table. */
export function specBodyNeeds() {
  const text = section(MODEL, "### 5.1 Corpo");
  const sentence = text.split("\n").find((line) => line.startsWith("Necessidades unipolares"));
  const bipolar = codes(sentence ?? "");
  return tableOf(MODEL, "### 5.1 Corpo").rows.map((row) => {
    const id = code(cell(row, 0));
    return { id, name: cell(row, 1), scale: bipolar.includes(id) ? "BIPOLAR" : "UNIPOLAR" };
  });
}

/** §5.2: the ten emotions (two per row). */
export function specEmotions() {
  return pairedRows(tableOf(MODEL, "### 5.2 Emoções")).map((row) => ({
    id: code(cell(row, 0)),
    name: cell(row, 1),
  }));
}

const DIRECTED = " (dirigida)";

/** §5.3: level, id, name and whether the drive is directed. */
export function specDrives() {
  return tableOf(MODEL, "### 5.3 Vontades").rows.map((row) => {
    const name = cell(row, 2);
    return {
      id: code(cell(row, 1)),
      name: name.replace(DIRECTED, ""),
      level: Number(cell(row, 0).split(" ")[0]),
      directed: name.endsWith(DIRECTED),
    };
  });
}

/** §5.4: the eight bond axes (two per row). */
export function specBondAxes() {
  return pairedRows(tableOf(MODEL, "### 5.4 Laços")).map((row) => ({
    id: code(cell(row, 0)),
    name: cell(row, 1),
  }));
}

const LABEL_KINDS = { familiar: "FAMILY", "de papel": "ROLE", social: "SOCIAL" } as const;

/** §5.4: the bond labels with their kind and obligatory reciprocal. */
export function specBondLabels() {
  return tableOf(MODEL, "### 5.4 Laços", 1).rows.map((row) => {
    const reciprocal = codes(cell(row, 3));
    return {
      id: code(cell(row, 0)),
      name: cell(row, 1),
      kind: lookup(LABEL_KINDS, cell(row, 2)),
      reciprocal: reciprocal[0] ?? null,
    };
  });
}

/** §5.6: the ten traits (two per row) with their negative and positive poles. */
export function specTraits() {
  return pairedRows(tableOf(MODEL, "### 5.6 Traços e aptidões")).map((row) => {
    const [negativePole, positivePole] = cell(row, 1).split(" ↔ ");
    return { id: code(cell(row, 0)), negativePole, positivePole };
  });
}

/** §5.6: the aptitudes, from the sentence "`perceptiveness` (perspicácia: …)". */
export function specAptitudes() {
  const text = section(MODEL, "### 5.6 Traços e aptidões");
  const sentence = text.slice(text.indexOf("Aptidões unipolares"));
  const end = sentence.indexOf("\n\n");
  return [...sentence.slice(0, end).matchAll(/`(\w+)`\s+\(([^:]+):/g)].map((match) => ({
    id: match[1] ?? "",
    name: match[2] ?? "",
  }));
}

/** §7: the signal causes, in the order of the first table. */
export function specSignalCauses() {
  return tableOf(MODEL, "## 7. Sinais").rows.flatMap((row) => codes(cell(row, 0)));
}

const CHANNELS = { visual: "VISUAL", vocal: "VOCAL" } as const;

/** §7: the signals with their name, channel and possible causes (in order). */
export function specSignals() {
  return tableOf(MODEL, "## 7. Sinais", 1).rows.map((row) => ({
    id: code(cell(row, 0)),
    name: cell(row, 1),
    channel: lookup(CHANNELS, cell(row, 2)),
    causes: codes(cell(row, 3)),
  }));
}
