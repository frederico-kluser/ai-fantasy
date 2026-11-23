/**
 * The signals of one tick (simulation-model §16 step 6, item 5): everyone
 * emits, then each observer notices and interprets the signals of the others,
 * then the perceptions without an update relax. Pure: the states given are not
 * changed; the draws go to the drawer of the tick, which the caller opens.
 */
import type { CharacterState } from "../character/state.ts";
import { effectiveTrait } from "../character/traits.ts";
import { tickContext, type SceneContext } from "../context/scene.ts";
import { compareIds, type CharacterId } from "../domain/ids.ts";
import type { Drawer } from "../rng/drawer.ts";
import { causeIntensities, visibleAttraction } from "./causes.ts";
import { emissionsOf, type EmittedSignal } from "./emission.ts";
import {
  perceptionsAfter,
  readSignals,
  type SeenEmission,
  type SignalPerceived,
} from "./perceive.ts";
import type { SignalRules } from "./rules.ts";

/** Everything the signals of a tick need besides the characters. */
export interface SignalTickInput {
  readonly scene: SceneContext;
  /** The tick being simulated, counted from the start of the slice (sets the clock). */
  readonly tick: number;
  /** The signal catalog: `presets.signals` of the loaded presets. */
  readonly signals: SignalRules;
  /** Who is telling a lie this tick: the author of an act with `isFalse`, during its ticks. */
  readonly lying: readonly CharacterId[];
}

/** The signals of a tick. */
export interface SignalTickResult {
  /** The characters with their new perceptions, sorted by id. */
  readonly characters: CharacterState[];
  /** Every signal that came out, by emitter id and then in catalog order. */
  readonly emitted: readonly EmittedSignal[];
  /** Every signal noticed, by observer id and then in the order of emission. */
  readonly events: readonly SignalPerceived[];
}

function emitAll(
  drawer: Drawer,
  sorted: readonly CharacterState[],
  input: SignalTickInput,
  vision: number,
): SeenEmission[] {
  return sorted.flatMap((emitter) =>
    emissionsOf(drawer, input.signals, {
      tick: input.tick,
      emitter: emitter.id,
      intensities: causeIntensities(emitter, {
        attraction: visibleAttraction(emitter, sorted, input.scene.grid, vision),
        lying: input.lying.includes(emitter.id),
      }),
      selfControl: effectiveTrait(emitter.traits, emitter.tendencies, "selfControl"),
    }).map((emission) => ({ ...emission, emitter })),
  );
}

/**
 * Runs the signals of one tick (simulation-model §7 and §16 step 6.5), after
 * the status of the tick (`statusTick`):
 *
 * 1. emission of everyone, in increasing id order (`SIGNAL_EMIT`, stream `signal`);
 * 2. each observer, in increasing id order, goes through the signals of the
 *    others in the order they were emitted: those its channel reaches are
 *    noticed by chance (`SIGNAL_NOTICE`) and, if noticed, interpreted
 *    (`SIGNAL_INTERPRET`), both on the `perception` stream with the observer
 *    as target; each interpretation updates its perception of the emitter;
 * 3. the perceptions of each observer about someone it read nothing from this
 *    tick relax toward the preview (simulation-model §5.5).
 *
 * Everyone reads the state as `statusTick` left it; the player's character is
 * simulated like everyone else.
 *
 * @throws RangeError if a character stands outside the grid.
 */
export function signalsTick(
  drawer: Drawer,
  characters: readonly CharacterState[],
  input: SignalTickInput,
): SignalTickResult {
  const now = tickContext(input.scene, input.tick);
  const sorted = [...characters].sort((a, b) => compareIds(a.id, b.id));
  const emitted = emitAll(drawer, sorted, input, now.vision);
  const where = { scene: input.scene, now, tick: input.tick };
  const read = sorted.map((observer) => ({
    observer,
    readings: readSignals(drawer, observer, emitted, where),
  }));
  return {
    characters: read.map(({ observer, readings }) => ({
      ...observer,
      perceptions: perceptionsAfter(observer, readings),
    })),
    emitted: emitted.map((emission) => emission.emitted),
    events: read.flatMap(({ readings }) => readings),
  };
}
