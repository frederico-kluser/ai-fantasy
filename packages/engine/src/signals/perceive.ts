/**
 * One observer and the signals of the others (simulation-model §7 and §5.5):
 * which ones it can perceive by channel, which it notices and how it
 * interprets them (both on the `perception` stream), and its perceptions after
 * the tick: updated by what it read, relaxed toward the preview elsewhere.
 */
import { readerView } from "../acts/tone.ts";
import { bondToward } from "../character/bonds.ts";
import {
  perceptionPreview,
  perceptionToward,
  relaxPerception,
  type Perception,
  type PerceptionValues,
} from "../character/perception.ts";
import type { CharacterState } from "../character/state.ts";
import { effectiveTrait } from "../character/traits.ts";
import { awareness, type Awareness } from "../context/presence.ts";
import { thermalTarget, type SceneContext, type TickContext } from "../context/scene.ts";
import { compareIds, type CharacterId } from "../domain/ids.ts";
import { itemAt } from "../domain/lookup.ts";
import type { SignalCauseId, SignalId } from "../presets/signals.ts";
import type { Drawer } from "../rng/drawer.ts";
import { applyInterpretation } from "./effects.ts";
import type { Emission } from "./emission.ts";
import { interpretationWeights } from "./interpret.ts";
import { noticeChance } from "./notice.ts";
import type { SignalChannel } from "./rules.ts";

/**
 * A signal noticed and interpreted (simulation-model §16 step 8): who noticed
 * what from whom, the true cause and the cause read, which may be wrong. For
 * the inspector, the lie rules (SOC-03) and the staging package (AI-03).
 */
export interface SignalPerceived {
  readonly kind: "SignalPerceived";
  readonly tick: number;
  readonly observer: CharacterId;
  readonly emitter: CharacterId;
  readonly signal: SignalId;
  readonly channel: SignalChannel;
  readonly trueCause: SignalCauseId;
  readonly interpretedCause: SignalCauseId;
}

/** The scene of the tick, as an observer reads the signals in it. */
export interface ObserverScene {
  readonly scene: SceneContext;
  readonly now: TickContext;
  readonly tick: number;
}

/** A visual signal needs sight, a vocal one a normal voice in range (simulation-model §7). */
const PERCEIVED_BY: Readonly<Record<SignalChannel, (aware: Awareness) => boolean>> = {
  VISUAL: (aware) => aware.sees,
  VOCAL: (aware) => aware.hears,
};

/** A signal that came out, with its preset and the state of its emitter. */
export interface SeenEmission extends Emission {
  readonly emitter: CharacterState;
}

/** The cause `observer` reads in `emitted`, drawn as `SIGNAL_INTERPRET`. */
function interpret(
  drawer: Drawer,
  observer: CharacterState,
  { emitter, emitted, rule }: SeenEmission,
  where: ObserverScene,
): SignalCauseId {
  const { place, weather, grid } = where.scene;
  const weights = interpretationWeights(rule, emitted.cause, readerView(observer, emitter.id), {
    thermalTarget: thermalTarget(
      place.baseTemperature,
      weather.temperature,
      itemAt(grid.roofed, emitter.cell),
    ),
    phase: where.now.phase,
  });
  const index = drawer.drawWeighted("perception", weights, "SIGNAL_INTERPRET", observer.id);
  return itemAt(rule.causes, index);
}

/**
 * What `observer` makes of one emitted signal: nothing when the channel does
 * not reach it or the `SIGNAL_NOTICE` chance fails; otherwise the event, with
 * the cause drawn by `SIGNAL_INTERPRET`.
 */
function readSignal(
  drawer: Drawer,
  observer: CharacterState,
  emission: SeenEmission,
  where: ObserverScene,
): SignalPerceived[] {
  const { emitter, emitted } = emission;
  const aware = awareness(where.scene.grid, where.now, observer.cell, emitter.cell);
  const noticed =
    PERCEIVED_BY[emitted.channel](aware) &&
    drawer.drawChance(
      "perception",
      noticeChance({ ...observer.aptitudes, ...observer.body }, aware.distance),
      "SIGNAL_NOTICE",
      observer.id,
    );
  if (!noticed) {
    return [];
  }
  const { emitter: from, signal, channel, cause } = emitted;
  return [
    {
      kind: "SignalPerceived",
      tick: where.tick,
      observer: observer.id,
      emitter: from,
      signal,
      channel,
      trueCause: cause,
      interpretedCause: interpret(drawer, observer, emission, where),
    },
  ];
}

/**
 * The signals of the others that `observer` notices and how it reads them
 * (simulation-model §7), in the order they were emitted; its own are skipped.
 */
export function readSignals(
  drawer: Drawer,
  observer: CharacterState,
  emissions: readonly SeenEmission[],
  where: ObserverScene,
): SignalPerceived[] {
  return emissions
    .filter((entry) => entry.emitter.id !== observer.id)
    .flatMap((entry) => readSignal(drawer, observer, entry, where));
}

/** The list with `perception` in place of the one about the same target, sorted by target id. */
function withPerception(list: readonly Perception[], perception: Perception): Perception[] {
  return [...list.filter((entry) => entry.target !== perception.target), perception].sort((a, b) =>
    compareIds(a.target, b.target),
  );
}

/**
 * The perceptions of `observer` after the tick (simulation-model §7 and §5.5):
 * each interpretation, in order, updates the perception of its emitter (from the
 * preview when there is no record); every record about someone not read this
 * tick relaxes toward its preview.
 */
export function perceptionsAfter(
  observer: CharacterState,
  readings: readonly SignalPerceived[],
): Perception[] {
  const trust = effectiveTrait(observer.traits, observer.tendencies, "trustInOthers");
  const preview = (target: CharacterId): PerceptionValues =>
    perceptionPreview(bondToward(observer.bonds, target), trust);
  const updated = readings.reduce<Perception[]>(
    (list, reading) =>
      withPerception(
        list,
        applyInterpretation(
          perceptionToward(list, reading.emitter, preview(reading.emitter)),
          reading.interpretedCause,
        ),
      ),
    [...observer.perceptions],
  );
  const read = new Set(readings.map((reading) => reading.emitter));
  return updated.map((perception) =>
    read.has(perception.target)
      ? perception
      : relaxPerception(perception, preview(perception.target)),
  );
}
