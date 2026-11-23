/**
 * Obligations to answer (simulation-model §10): an `ASK`, `ACCUSE`, `REQUEST`,
 * `OFFER`, `APOLOGIZE` or `THREATEN` addressed to someone creates, for each
 * target that heard it `DIRECT`, an obligation to answer. It ends answered when
 * the debtor answers it, ignored when the debtor acts without answering any, or
 * ignored when 12 ticks pass (`OBLIGATION_TTL_TICKS`, checked every tick). The
 * effects of ignoring belong to the appraisal (SOC-03); the scene step (SOC-05)
 * calls {@link expireObligations} in sub-step 6.6.
 */
import { OBLIGATION_TTL_TICKS } from "../domain/constants.ts";
import type { CharacterId, FactId } from "../domain/ids.ts";
import type { Fact } from "../memory/fact.ts";
import type { ActId } from "../presets/acts.ts";
import { canonicalize } from "../session/canonical.ts";
import type { ActLabel, Topic } from "./label.ts";
import type { Perceived } from "./perspectives.ts";
import { actEntry, type ActRules } from "./rules.ts";

/** An obligation of `debtor` to answer the act `fact` of `creditor`. */
export interface Obligation {
  readonly debtor: CharacterId;
  /** The author of the act that created the obligation. */
  readonly creditor: CharacterId;
  /** The fact of that act. */
  readonly fact: FactId;
  /** The act to answer. */
  readonly act: ActId;
  /** The topic of the act to answer: `ACCEPT` and most `REFUSE`s keep it. */
  readonly topic: Topic;
  /** The tick when the act was resolved. */
  readonly tick: number;
}

/** How an obligation ended. */
export type ObligationEnding = "ANSWERED" | "IGNORED";

/** An obligation that ended, and how. */
export interface EndedObligation {
  readonly obligation: Obligation;
  readonly ending: ObligationEnding;
}

/** The obligations still pending and those that just ended, in the order they were pending. */
export interface ObligationUpdate {
  readonly pending: readonly Obligation[];
  readonly ended: readonly EndedObligation[];
}

/** A resolved act, as far as obligations go. */
export interface ObligationSource {
  readonly fact: FactId;
  readonly tick: number;
  readonly author: CharacterId;
  readonly label: ActLabel;
  /** Who perceived the act and how (see `perceiveAct`). */
  readonly perceived: readonly Perceived[];
}

/** An act that answers an obligation, and whether it must keep the topic of the act answered. */
interface Answer {
  readonly act: ActId;
  readonly sameTopic: boolean;
}

const REPLY_TO_REQUEST: readonly Answer[] = [
  { act: "ACCEPT", sameTopic: true },
  { act: "REFUSE", sameTopic: true },
];

/**
 * The possible answers of each act that creates an obligation (simulation-model
 * §10, table): to an `ASK`, a `TELL` about the topic asked or a `REFUSE`; to an
 * `ACCUSE`, an `APOLOGIZE` (admitting), a `REFUSE` (denying) or an `ACCUSE` back;
 * to a request, an `ACCEPT` or a `REFUSE` (dialogue-acts §8.2).
 */
const ANSWERS: Readonly<Partial<Record<ActId, readonly Answer[]>>> = {
  ASK: [
    { act: "TELL", sameTopic: true },
    { act: "REFUSE", sameTopic: true },
  ],
  ACCUSE: [
    { act: "APOLOGIZE", sameTopic: false },
    { act: "REFUSE", sameTopic: true },
    { act: "ACCUSE", sameTopic: false },
  ],
  REQUEST: REPLY_TO_REQUEST,
  OFFER: REPLY_TO_REQUEST,
  APOLOGIZE: REPLY_TO_REQUEST,
  THREATEN: REPLY_TO_REQUEST,
};

/**
 * The obligations an act creates (simulation-model §10): one per target that
 * heard it `DIRECT`, in increasing id order, when the act creates obligations
 * and is addressed to someone (not to the `GROUP` nor to nobody).
 */
export function createObligations(rules: ActRules, source: ObligationSource): Obligation[] {
  const { label } = source;
  const { targets } = label;
  if (!actEntry(rules, label.act).createsObligation || targets === "GROUP") {
    return [];
  }
  return source.perceived
    .filter((seen) => seen.perspective === "DIRECT" && targets.includes(seen.id))
    .map((seen) => ({
      debtor: seen.id,
      creditor: source.author,
      fact: source.fact,
      act: label.act,
      topic: label.topic,
      tick: source.tick,
    }));
}

function sameTopic(a: Topic, b: Topic): boolean {
  return canonicalize(a) === canonicalize(b);
}

/** Whether `label`, done by the debtor, answers `owed`. */
function answers(owed: Obligation, label: ActLabel): boolean {
  const addressed = label.targets !== "GROUP" && label.targets.includes(owed.creditor);
  const answer = (ANSWERS[owed.act] ?? []).find((candidate) => candidate.act === label.act);
  return (
    addressed && answer !== undefined && (!answer.sameTopic || sameTopic(owed.topic, label.topic))
  );
}

/**
 * The obligation of `actor` that `label` answers, if any: the act is a possible
 * answer of the act owed (simulation-model §10), addressed to its author, with
 * the same topic when the answer keeps it. With several, the oldest (first
 * pending) is answered.
 */
export function answeredObligation(
  pending: readonly Obligation[],
  actor: CharacterId,
  label: ActLabel,
): Obligation | undefined {
  return pending.find((owed) => owed.debtor === actor && answers(owed, label));
}

/**
 * The obligations after `actor` acts with `label` (simulation-model §10): the
 * one it answers ends `ANSWERED`; if it answers none, every obligation of the
 * actor ends `IGNORED`. Obligations of others stay pending.
 */
export function settleObligations(
  pending: readonly Obligation[],
  actor: CharacterId,
  label: ActLabel,
): ObligationUpdate {
  const answered = answeredObligation(pending, actor, label);
  const ends = (owed: Obligation) =>
    answered === undefined ? owed.debtor === actor : owed === answered;
  const ending: ObligationEnding = answered === undefined ? "IGNORED" : "ANSWERED";
  return {
    pending: pending.filter((owed) => !ends(owed)),
    ended: pending.filter(ends).map((obligation) => ({ obligation, ending })),
  };
}

/**
 * The obligations at the check of `tick` (simulation-model §16 sub-step 6.6):
 * those created 12 ticks ago or more end `IGNORED` (invariant 12).
 */
export function expireObligations(pending: readonly Obligation[], tick: number): ObligationUpdate {
  const expired = (owed: Obligation) => tick - owed.tick >= OBLIGATION_TTL_TICKS;
  return {
    pending: pending.filter((owed) => !expired(owed)),
    ended: pending
      .filter(expired)
      .map((obligation) => ({ obligation, ending: "IGNORED" as const })),
  };
}

/**
 * Whether `actor` interrupts (simulation-model §11 item 4): an obligation of the
 * last act (the act fact of highest id) is pending and the actor is neither its
 * author nor one who owes the answer. The effects belong to the appraisal (SOC-03).
 */
export function isInterruption(
  pending: readonly Obligation[],
  facts: readonly Fact[],
  actor: CharacterId,
): boolean {
  const last = facts.findLast((fact) => fact.kind === "ACT");
  const owed = pending.filter((obligation) => obligation.fact === last?.id);
  return (
    owed.length > 0 &&
    last?.author !== actor &&
    owed.every((obligation) => obligation.debtor !== actor)
  );
}
