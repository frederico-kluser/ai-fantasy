/**
 * The character (simulation-model §4): the state that the rules read and the
 * hash covers, apart from the identity, which is presentation only. Every
 * per-person collection is a list sorted by `CharacterId`, never an object
 * keyed by id, so the canonical serialization (§15) has an explicit order.
 */
import type { Bp, BipolarBp } from "../domain/bp.ts";
import type { CharacterId, FactId, ThingId } from "../domain/ids.ts";
import type { FactCopy } from "../memory/copy.ts";
import type { CharacterArchetypeId } from "../presets/character-archetypes.ts";
import type { AssociationTagId } from "../presets/tags.ts";
import type { Body } from "./body.ts";
import type { Bond } from "./bonds.ts";
import type { Drives } from "./drives.ts";
import { emotionBaselines, type EmotionShifts, type Emotions } from "./emotions.ts";
import type { Perception } from "./perception.ts";
import type { Aptitudes, Traits } from "./traits.ts";

/** What an association is with (simulation-model §5.7): a tag, a thing or an absent person. */
export type AssociationSubject =
  | { readonly kind: "TAG"; readonly tag: AssociationTagId }
  | { readonly kind: "THING"; readonly thing: ThingId }
  | { readonly kind: "PERSON"; readonly person: CharacterId };

/** A fear (negative valence) or an attachment (positive) of a character (simulation-model §5.7). */
export interface Association {
  readonly subject: AssociationSubject;
  readonly valence: BipolarBp;
}

/**
 * The state of a character: only integers, booleans, ids of the catalogs and
 * lists in an explicit order, so `canonicalize` and `hashState` accept it.
 * The scene state (SOC-05) holds one per present character, with the
 * movement, obligations and counters of the slice.
 */
export interface CharacterState {
  readonly id: CharacterId;
  /** The index of the cell where the character stands. */
  readonly cell: number;
  /** The stable traits (simulation-model §5.6). */
  readonly traits: Traits;
  /** The recent tendency of each trait (simulation-model §13); 0 at first. */
  readonly tendencies: Traits;
  readonly aptitudes: Aptitudes;
  /** The baseline shifts left by the history (presets §7); never limited. */
  readonly baselineShifts: EmotionShifts;
  /**
   * The emotion baselines (simulation-model §5.2): always
   * `emotionBaselines(traits, baselineShifts)`; see {@link refreshBaselines}.
   */
  readonly baselines: Emotions;
  readonly emotions: Emotions;
  readonly body: Body;
  readonly drives: Drives;
  /** One bond per known person, sorted by target id (simulation-model §5.4). */
  readonly bonds: readonly Bond[];
  /** Up to 3 associations, in the order they were made (presets §8). */
  readonly associations: readonly Association[];
  /** One perception per present person that signals or acts touched, sorted by target id (§5.5). */
  readonly perceptions: readonly Perception[];
  /** Copies of the facts the character knows, sorted by fact id (simulation-model §12). */
  readonly memories: readonly FactCopy[];
  /**
   * The history facts whose effects on this character as side B were applied
   * after it learned of them (presets §7: "esperam até B receber uma cópia do
   * fato e então se aplicam uma vez"), sorted by fact id; empty at generation.
   */
  readonly historyApplied: readonly FactId[];
  /** The threat of the last tick (simulation-model §6), read by the leave rule and the signals. */
  readonly threat: Bp;
}

/** The age bands of presets §10, in order: presentation only. */
export const AGE_BANDS = ["CHILD", "TEEN", "YOUNG", "ADULT", "ELDER"] as const;

/** An age band (presets §10): presentation only. */
export type AgeBand = (typeof AGE_BANDS)[number];

/** The registers of speech of presets §10, in order: presentation only. */
export const SPEECH_REGISTERS = ["FORMAL", "COLLOQUIAL", "RUSTIC", "CULTURED", "ARCHAIC"] as const;

/** A register of speech (presets §10): presentation only. */
export type SpeechRegister = (typeof SPEECH_REGISTERS)[number];

/**
 * How a character is presented (simulation-model §4, invariant 3): free text
 * and display choices, kept apart from the state and out of the hash. The
 * text model reads it; no rule does.
 */
export interface CharacterIdentity {
  readonly id: CharacterId;
  readonly name: string;
  readonly pronouns: string;
  readonly description: string;
  /** The archetype the character was generated from, for display; `null` when made by hand. */
  readonly archetype: CharacterArchetypeId | null;
  readonly ageBand: AgeBand;
  /** The role in the story ("o ferreiro", "a filha do prefeito"): free text for display. */
  readonly role: string;
  readonly speechRegister: SpeechRegister;
}

/** The valences of the associations with tags present in the scene (simulation-model §5.7). */
export function tagValences(
  associations: readonly Association[],
  present: readonly AssociationTagId[],
): number[] {
  return associations.flatMap(({ subject, valence }) =>
    subject.kind === "TAG" && present.includes(subject.tag) ? [valence] : [],
  );
}

/**
 * The character with its baselines recomputed from the traits and the history
 * shifts (simulation-model §5.2): at generation and whenever a trait
 * crystallizes (§13 item 5).
 */
export function refreshBaselines(character: CharacterState): CharacterState {
  return { ...character, baselines: emotionBaselines(character.traits, character.baselineShifts) };
}
