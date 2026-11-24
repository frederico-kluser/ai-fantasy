/**
 * The bands of the requests a character owes (dialogue-acts §8.1 and §8.2;
 * simulation-model §10, "Faixas"): drawn when the debtor in `AUTO` takes its
 * turn, for each pending request of it that has none yet, and kept until the
 * obligation ends. A debtor in `MANUAL` answers as it likes: nothing is drawn.
 */
import type { Obligation } from "../acts/obligations.ts";
import {
  humiliates,
  resolveRequestTurn,
  type RequestActId,
  type RequestObjectRules,
  type RequestTurnInput,
} from "../acts/requests.ts";
import { isRequestAct } from "../acts/request-answers.ts";
import type { CharacterState } from "../character/state.ts";
import type { Bp } from "../domain/bp.ts";
import type { CharacterId } from "../domain/ids.ts";
import type { ActFact, Fact } from "../memory/fact.ts";
import type { Drawer } from "../rng/drawer.ts";
import type { OwedBand } from "./scene.ts";

/** What drawing the bands of a debtor reads. */
export interface OwedBandsInput {
  readonly debtor: CharacterId;
  readonly control: "AUTO" | "MANUAL";
  /** The characters present, the debtor included. */
  readonly characters: readonly CharacterState[];
  readonly facts: readonly Fact[];
  readonly obligations: readonly Obligation[];
  readonly objects: RequestObjectRules;
  /** The privacy of the place (presets §2). */
  readonly privacy: Bp;
  /** The bands drawn so far, of every debtor. */
  readonly drawn: readonly OwedBand[];
}

function isPending(band: OwedBand, obligations: readonly Obligation[]): boolean {
  return obligations.some((owed) => owed.fact === band.fact && owed.debtor === band.debtor);
}

/** Another present, besides the author and the target, heard the request `DIRECT`. */
function witnessed(input: OwedBandsInput, request: ActFact, target: CharacterId): boolean {
  return input.characters.some(
    (character) =>
      character.id !== request.author &&
      character.id !== target &&
      character.memories.some((copy) => copy.fact === request.id && copy.perspective === "DIRECT"),
  );
}

/**
 * What the acceptance of the request owed reads (dialogue-acts §8.1), or `null`
 * when the request or one of its two sides is no longer there.
 */
export function requestTurnInput(input: OwedBandsInput, owed: Obligation): RequestTurnInput | null {
  const request = input.facts.find((fact) => fact.id === owed.fact);
  const author = input.characters.find((character) => character.id === owed.creditor);
  const target = input.characters.find((character) => character.id === owed.debtor);
  if (request?.kind !== "ACT" || author === undefined || target === undefined) {
    return null;
  }
  // Only obligations of requests reach here (see owedBands).
  const act = owed.act as RequestActId;
  return {
    control: input.control,
    request: { act, tone: request.label.tone, object: request.label.object ?? null },
    author,
    target,
    objects: input.objects,
    humiliating: humiliates({
      act,
      witnessed: witnessed(input, request, target.id),
      privacy: input.privacy,
      target,
    }),
  };
}

function drawOne(drawer: Drawer, input: OwedBandsInput, owed: Obligation): OwedBand[] {
  const turnInput = requestTurnInput(input, owed);
  const turn = turnInput === null ? null : resolveRequestTurn(drawer, turnInput);
  return turn?.kind === "FIXED" ? [{ fact: owed.fact, debtor: owed.debtor, band: turn.band }] : [];
}

/**
 * The bands after `input.debtor` takes its turn (dialogue-acts §8.2): the
 * bands still pending, plus one drawn now (`REQUEST_BAND`, stream
 * `resolution`) for each pending request of the debtor without a band, in
 * fact order and with its author present. In `MANUAL`, nothing is drawn.
 */
export function owedBands(drawer: Drawer, input: OwedBandsInput): OwedBand[] {
  const kept = input.drawn.filter((band) => isPending(band, input.obligations));
  const fresh = input.obligations
    .filter(
      (owed) =>
        owed.debtor === input.debtor &&
        isRequestAct(owed.act) &&
        !kept.some((band) => band.fact === owed.fact && band.debtor === owed.debtor),
    )
    .sort((a, b) => a.fact - b.fact)
    .flatMap((owed) => drawOne(drawer, input, owed));
  return [...kept, ...fresh];
}
