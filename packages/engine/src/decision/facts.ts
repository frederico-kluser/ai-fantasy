/**
 * What the decision and the turns read of the record (simulation-model §10,
 * "Detalhes da decisão"): who an act was addressed to, the acts of this slice,
 * the last act addressed to someone, the offenders by a character's own copy
 * and the most important copy that passes a test.
 */
import type { CharacterState } from "../character/state.ts";
import type { CharacterId } from "../domain/ids.ts";
import type { FactCopy } from "../memory/copy.ts";
import type { ActFact, Fact } from "../memory/fact.ts";

/**
 * Whether an act was addressed to `who`: `who` is in its target list, or the
 * act was for the `GROUP` and `who` holds a `DIRECT` copy of it.
 */
export function isDirectedTo(fact: ActFact, who: CharacterState): boolean {
  const { targets } = fact.label;
  if (targets !== "GROUP") {
    return targets.includes(who.id);
  }
  return who.memories.some((copy) => copy.fact === fact.id && copy.perspective === "DIRECT");
}

/** The act facts of this slice: those with an id from `sliceStart` on, in record order. */
export function sliceActs(facts: readonly Fact[], sliceStart: number): ActFact[] {
  return facts.filter((fact): fact is ActFact => fact.kind === "ACT" && fact.id >= sliceStart);
}

/** The act fact of highest id, if any: the last one of the record, which is in id order. */
export function lastAct(facts: readonly Fact[]): ActFact | undefined {
  return facts.findLast((fact): fact is ActFact => fact.kind === "ACT");
}

/** The act fact of highest id addressed to `who`, if any. */
export function lastActTo(facts: readonly Fact[], who: CharacterState): ActFact | undefined {
  return facts.findLast((fact): fact is ActFact => fact.kind === "ACT" && isDirectedTo(fact, who));
}

/** The offenders of a fact by a character's copy: the false version when it has one (dialogue-acts §4). */
export function offendersByCopy(copy: FactCopy, fact: Fact): readonly CharacterId[] {
  return copy.falseOffenders ?? fact.offenders;
}

/** A fact with the copy a character holds of it. */
export interface KnownFact {
  readonly fact: Fact;
  readonly copy: FactCopy;
}

/** Every fact `who` holds a copy of, with the copy, in fact id order. */
export function knownFacts(who: CharacterState, facts: readonly Fact[]): KnownFact[] {
  return who.memories.flatMap((copy) => {
    const fact = facts.find((held) => held.id === copy.fact);
    return fact === undefined ? [] : [{ fact, copy }];
  });
}

/**
 * The most important fact `who` holds a copy of among those that pass `test`
 * (simulation-model §10): the copy of highest importance, ties to the most
 * recent fact; `null` when none passes.
 */
export function mostImportant(
  who: CharacterState,
  facts: readonly Fact[],
  test: (known: KnownFact) => boolean,
): KnownFact | null {
  return knownFacts(who, facts)
    .filter(test)
    .reduce<KnownFact | null>(
      (best, known) =>
        best === null || known.copy.importance >= best.copy.importance ? known : best,
      null,
    );
}
