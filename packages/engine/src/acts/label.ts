/**
 * The label of an act (dialogue-acts §1): what is done (act × tone × topic) and
 * its values. Only types: validating a label and resolving it belong to the
 * acts rules (SOC-01); turning a free sentence into a label belongs to the AI
 * package (AI-01). The ids come from the preset catalogs (CORE-03), so a label
 * never holds free text and can live in the engine state and in the hash.
 */
import type { CharacterId, FactId, ThingId } from "../domain/ids.ts";
import type { Bp } from "../domain/bp.ts";
import type { ActId } from "../presets/acts.ts";
import type { BondAxisId } from "../presets/bonds.ts";
import type { EmotionId } from "../presets/emotions.ts";
import type { RequestObjectId } from "../presets/request-objects.ts";
import type { AssociationTagId } from "../presets/tags.ts";
import type { ToneId } from "../presets/tones.ts";
import type { Volume } from "../space/hearing.ts";

/**
 * The feeling a `FEELING` topic is about (dialogue-acts §4: "emoção ou eixo de
 * laço"): an emotion of simulation-model §5.2 or a bond axis of §5.4.
 */
export type Feeling =
  | { readonly kind: "EMOTION"; readonly emotion: EmotionId }
  | { readonly kind: "BOND"; readonly axis: BondAxisId };

/**
 * The place a `PLACE` topic is about (dialogue-acts §4: "tag ou o lugar da
 * cena"): an association tag, or `"SCENE"` for the place of the scene itself.
 */
export type PlaceRef = AssociationTagId | "SCENE";

/**
 * What an act is about (dialogue-acts §4), discriminated by `type`, with the
 * reference each type carries:
 *
 * - `PERSON`: a character (present, absent, the listener or the speaker);
 * - `THING`: an object, possession or attachment, by its {@link ThingId};
 * - `PLACE`: a tag or the place of the scene;
 * - `EVENT`, `SECRET` and `RUMOR`: a fact of the record, by its {@link FactId};
 * - `FEELING`: an emotion or a bond axis;
 * - `SMALL_TALK`: pleasantries, with no reference;
 * - `NONE`: acts without speech.
 */
export type Topic =
  | { readonly type: "PERSON"; readonly person: CharacterId }
  | { readonly type: "THING"; readonly thing: ThingId }
  | { readonly type: "PLACE"; readonly place: PlaceRef }
  | { readonly type: "EVENT" | "SECRET" | "RUMOR"; readonly fact: FactId }
  | { readonly type: "FEELING"; readonly feeling: Feeling }
  | { readonly type: "SMALL_TALK" }
  | { readonly type: "NONE" };

/** The type of a {@link Topic}: the ids of the `topicTypes` catalog. */
export type TopicType = Topic["type"];

/**
 * Who an act is addressed to (dialogue-acts §1 and §5): one or more characters,
 * sorted by increasing id; `"GROUP"`, everyone who hears it; `[]`, nobody in
 * particular (heard as usual, but it creates no obligation to answer).
 */
export type ActTargets = readonly CharacterId[] | "GROUP";

/**
 * An act as the engine decides and resolves it (dialogue-acts §1).
 *
 * @example
 * const greeting: ActLabel = {
 *   act: "GREET",
 *   tone: "WARM",
 *   targets: [father],
 *   topic: { type: "PERSON", person: father },
 *   intensity: toBp(3000),
 *   volume: "NORMAL",
 *   isFalse: false,
 * };
 */
export interface ActLabel {
  /** What is done (dialogue-acts §2). */
  readonly act: ActId;
  /** How it is done (dialogue-acts §3). */
  readonly tone: ToneId;
  /** To whom (see {@link ActTargets}). */
  readonly targets: ActTargets;
  /** About what (dialogue-acts §4); `{ type: "NONE" }` in acts without speech. */
  readonly topic: Topic;
  /** Strength of the act, `0..10000` bp (dialogue-acts §5). */
  readonly intensity: Bp;
  /** How loud (simulation-model §8.2). */
  readonly volume: Volume;
  /** The lie mark: it states as true something false (dialogue-acts §5). */
  readonly isFalse: boolean;
  /** What is asked for or offered: only in `REQUEST` and `OFFER`. */
  readonly object?: RequestObjectId;
  /** The cell index the character goes to: only in `MOVE`. */
  readonly destination?: number;
}

/**
 * The outcome band of a request (dialogue-acts §8.2), from the best answer to
 * the worst: drawn when the target in `AUTO` takes its turn, or read from what
 * the player did. It goes to the record and to the text model.
 */
export type OutcomeBand = "ENTHUSIASTIC" | "ACCEPT" | "PARTIAL" | "REFUSE" | "HARD_REFUSE";
