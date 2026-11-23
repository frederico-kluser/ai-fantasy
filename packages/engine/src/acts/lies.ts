/**
 * Lies (dialogue-acts §5): a lie about a fact (a `TELL` of a fact with
 * `isFalse`, or a `REFUSE` that denies an accusation) is settled for each
 * `DIRECT` hearer, in id order: who holds a true copy with fidelity ≥ 5000 may
 * detect it; who holds another copy keeps it; who holds none may believe it
 * (and gets the `TOLD` copy of the false version through `recordAct`) or doubt
 * it. A lie without a fact (a false apology or promise) is discovered when a
 * `DIRECT` hearer reads the `lying` signal of the liar during the act's ticks.
 * Discovering a lie costs the liar trust, sincerity and predictability.
 */
import { bondToward } from "../character/bonds.ts";
import { perceptionPreview, perceptionToward } from "../character/perception.ts";
import type { CharacterState } from "../character/state.ts";
import { effectiveTrait } from "../character/traits.ts";
import { toBp, type Bp } from "../domain/bp.ts";
import { BOND_DELTA_CAP } from "../domain/constants.ts";
import { compareIds, type CharacterId, type FactId } from "../domain/ids.ts";
import { clampInt, div } from "../domain/math.ts";
import type { ActId } from "../presets/acts.ts";
import type { Drawer } from "../rng/drawer.ts";
import type { SignalPerceived } from "../signals/perceive.ts";
import type { StateDelta } from "./deltas.ts";
import type { ActLabel } from "./label.ts";

/** How a hearer came out of a lie about a fact. */
export type LieOutcomeKind = "DETECTED" | "KEPT" | "BELIEVED" | "DOUBTED";

/** One hearer's outcome. */
export interface LieOutcome {
  readonly listener: CharacterId;
  readonly kind: LieOutcomeKind;
}

/** A lie about a fact, as its hearers settle it. */
export interface FactLieInput {
  readonly author: CharacterState;
  readonly fact: FactId;
  /** The `DIRECT` hearers, the author excluded, in any order. */
  readonly hearers: readonly CharacterState[];
}

/** A lie without a fact, during the ticks of its act. */
export interface PendingLie {
  readonly author: CharacterId;
  /** The `DIRECT` hearers of the act. */
  readonly hearers: readonly CharacterId[];
  /** Who already discovered it. */
  readonly discovered: readonly CharacterId[];
}

/** Fidelity from which a true copy can detect a lie (dialogue-acts §5). */
const DETECTING_FIDELITY = 5000;
const DETECTION_BASE = 4000;
const BELIEF_MIN = 500;
const BELIEF_MAX = 9500;
/** The sincerity lost by doubting a lie. */
const DOUBT_SINCERITY = -1500;
/** What a discovered lie does (dialogue-acts §5): trust takes the whole cap of an act. */
const DISCOVERED = {
  trust: -BOND_DELTA_CAP,
  resentment: 1000,
  sincerity: -3000,
  predictability: 2000,
} as const;
/** The importance a discovered lie adds to the copy of its fact. */
export const DISCOVERED_LIE_IMPORTANCE = 3000;

/**
 * The fact a lie is about (dialogue-acts §5): the fact of a `TELL` with
 * `isFalse` about an `EVENT`, `SECRET` or `RUMOR`, or of a `REFUSE` with
 * `isFalse` that answers an `ACCUSE` (a denial); `null` for a truth or a lie
 * without a fact.
 */
export function factLie(label: ActLabel, answered: ActId | null): FactId | null {
  const { topic } = label;
  const aboutFact = "fact" in topic;
  const tells = label.act === "TELL";
  const denies = label.act === "REFUSE" && answered === "ACCUSE";
  return label.isFalse && aboutFact && (tells || denies) ? topic.fact : null;
}

/**
 * The chance that a hearer with a true copy detects the lie (dialogue-acts §5):
 * `4000 + perceptiveness / 2 − eloquence(author) / 4`. The clamp of the
 * specification to `0..9500` never binds: aptitudes in `0..10000` keep the
 * value in `1500..9000`.
 */
export function detectionChance(perceptiveness: Bp, eloquence: Bp): Bp {
  return toBp(DETECTION_BASE + div(perceptiveness, 2) - div(eloquence, 4));
}

/** The chance that a hearer without a copy believes the lie: `clamp((trust + sincerity) / 2, 500, 9500)`. */
export function beliefChance(trust: Bp, sincerity: Bp): Bp {
  return toBp(clampInt(div(trust + sincerity, 2), BELIEF_MIN, BELIEF_MAX));
}

function sincerityOf(hearer: CharacterState, author: CharacterId): Bp {
  const trust = effectiveTrait(hearer.traits, hearer.tendencies, "trustInOthers");
  const preview = perceptionPreview(bondToward(hearer.bonds, author), trust);
  return perceptionToward(hearer.perceptions, author, preview).perceivedSincerity;
}

function settle(drawer: Drawer, input: FactLieInput, hearer: CharacterState): LieOutcome {
  const { author } = input;
  const listener = hearer.id;
  const copy = hearer.memories.find((held) => held.fact === input.fact);
  if (copy === undefined) {
    const trust = bondToward(hearer.bonds, author.id).axes.trust;
    const chance = beliefChance(trust, sincerityOf(hearer, author.id));
    const believed = drawer.drawChance("resolution", chance, "LIE_BELIEF", listener);
    return { listener, kind: believed ? "BELIEVED" : "DOUBTED" };
  }
  if (copy.falseOffenders !== null || copy.fidelity < DETECTING_FIDELITY) {
    return { listener, kind: "KEPT" };
  }
  const chance = detectionChance(hearer.aptitudes.perceptiveness, author.aptitudes.eloquence);
  const detected = drawer.drawChance("perception", chance, "LIE_DETECT", listener);
  return { listener, kind: detected ? "DETECTED" : "KEPT" };
}

/**
 * Settles a lie about a fact for each `DIRECT` hearer, in increasing id order
 * (dialogue-acts §5): detection (`LIE_DETECT`, stream `perception`) for a true
 * copy with fidelity ≥ 5000; nothing for another copy; belief (`LIE_BELIEF`,
 * stream `resolution`) for a hearer without a copy, with chance
 * `clamp((trust + perceivedSincerity) / 2, 500, 9500)` toward the liar. Each
 * draw has the hearer as target.
 */
export function drawLieOutcomes(drawer: Drawer, input: FactLieInput): LieOutcome[] {
  return [...input.hearers]
    .sort((a, b) => compareIds(a.id, b.id))
    .map((hearer) => settle(drawer, input, hearer));
}

/**
 * What discovering a lie of `liar` does to `who` (dialogue-acts §5): `trust`
 * −1500 (the cap of an act), `resentment` +1000, `perceivedSincerity` −3000 and
 * `predictability` +2000. The +3000 of importance is {@link withLieImportance}.
 */
export function discoveredLieDeltas(who: CharacterId, liar: CharacterId): StateDelta[] {
  return [
    { kind: "BOND", who, toward: liar, axis: "trust", delta: DISCOVERED.trust },
    { kind: "BOND", who, toward: liar, axis: "resentment", delta: DISCOVERED.resentment },
    {
      kind: "PERCEPTION",
      who,
      toward: liar,
      value: "perceivedSincerity",
      delta: DISCOVERED.sincerity,
    },
    {
      kind: "DRIVE",
      who,
      drive: "predictability",
      toward: null,
      delta: DISCOVERED.predictability,
    },
  ];
}

/** What each outcome does: a detector discovers the lie; a doubter finds the liar less sincere. */
const OUTCOME_DELTAS: Readonly<
  Record<LieOutcomeKind, (who: CharacterId, liar: CharacterId) => StateDelta[]>
> = {
  DETECTED: discoveredLieDeltas,
  DOUBTED: (who, liar) => [
    { kind: "PERCEPTION", who, toward: liar, value: "perceivedSincerity", delta: DOUBT_SINCERITY },
  ],
  BELIEVED: () => [],
  KEPT: () => [],
};

/** The deltas of the outcomes of a lie of `liar` (dialogue-acts §5), in the order of the outcomes. */
export function lieOutcomeDeltas(outcomes: readonly LieOutcome[], liar: CharacterId): StateDelta[] {
  return outcomes.flatMap((outcome) => OUTCOME_DELTAS[outcome.kind](outcome.listener, liar));
}

/** The character with its copy of `fact` 3000 more important (clamped); unchanged without one. */
export function withLieImportance(character: CharacterState, fact: FactId): CharacterState {
  return {
    ...character,
    memories: character.memories.map((copy) =>
      copy.fact === fact
        ? { ...copy, importance: toBp(copy.importance + DISCOVERED_LIE_IMPORTANCE) }
        : copy,
    ),
  };
}

/**
 * Who discovers a lie without a fact in the signals of a tick (dialogue-acts
 * §5): the `DIRECT` hearers of the act who interpreted a signal of the liar as
 * `lying` and had not discovered it yet, once each, in increasing id order.
 */
export function lieDiscoveries(events: readonly SignalPerceived[], lie: PendingLie): CharacterId[] {
  const found = events
    .filter(
      (event) =>
        event.emitter === lie.author &&
        event.interpretedCause === "lying" &&
        lie.hearers.includes(event.observer) &&
        !lie.discovered.includes(event.observer),
    )
    .map((event) => event.observer);
  return [...new Set(found)].sort(compareIds);
}
