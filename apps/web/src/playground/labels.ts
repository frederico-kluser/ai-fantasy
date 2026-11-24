/**
 * Display names of the form (overview §6). Preset names come from the
 * catalogs themselves (presets §2 to §9); the few lists that are not presets
 * (age bands, speech registers, day phases) have their names here.
 */
import type { AgeBand, DayPhase, SpeechRegister } from "@ai-fantasy/engine";

/** A preset with an id and a display name. */
export interface Named {
  readonly id: string;
  readonly name: string;
}

/** The display name of `id` in a catalog; the id itself if the catalog lacks it. */
export function nameIn(catalog: readonly Named[], id: string): string {
  return catalog.find((entry) => entry.id === id)?.name ?? id;
}

/** The age bands of presets §10 (presentation only). */
export const AGE_BAND_NAMES: Readonly<Record<AgeBand, string>> = {
  CHILD: "criança",
  TEEN: "adolescente",
  YOUNG: "jovem",
  ADULT: "adulto(a)",
  ELDER: "idoso(a)",
};

/** The speech registers of presets §10 (presentation only). */
export const SPEECH_REGISTER_NAMES: Readonly<Record<SpeechRegister, string>> = {
  FORMAL: "formal",
  COLLOQUIAL: "coloquial",
  RUSTIC: "rústico",
  CULTURED: "culto",
  ARCHAIC: "arcaico",
};

/** The phases of the day (simulation-model §3.2). */
export const DAY_PHASE_NAMES: Readonly<Record<DayPhase, string>> = {
  DAWN: "madrugada",
  MORNING: "manhã",
  AFTERNOON: "tarde",
  EVENING: "noite",
  LATE_NIGHT: "fim da noite",
};

/**
 * A catalog name with its placeholder `B` (presets §6 and §7: "medo de B",
 * "traiu B com outra pessoa") replaced by the name of the other person.
 */
export function withOther(text: string, other: string): string {
  return text.replace(/\bB\b/g, other);
}

/** How a character is called in the form: its name, or its place in the cast. */
export function displayName(name: string, index: number): string {
  const trimmed = name.trim();
  return trimmed === "" ? `Personagem ${String(index + 1)}` : trimmed;
}
