import fc from "fast-check";
import { describe, expect, it } from "vitest";

import { aDrawer, forcing } from "../../test/support/acts.ts";
import {
  aBody,
  aBond,
  aCharacter,
  aPerception,
  arbitraryCharacter,
  rangeProblems,
  someEmotions,
  someTraits,
} from "../../test/support/character.ts";
import { aScene } from "../../test/support/context.ts";
import {
  arbitraryPerception,
  defaultSignals,
  perceptionProblems,
} from "../../test/support/signals.ts";
import { gridOf, idOf } from "../../test/support/space.ts";
import { createDrawer, type ForcedDraw } from "../rng/drawer.ts";
import { createRngState } from "../rng/state.ts";
import { hashState } from "../session/hash.ts";
import { signalsTick, type SignalTickInput } from "./tick.ts";

/** Tick 0 of a morning in the default forest (open 25 × 25 grid, noise 1000), nobody lying. */
const INPUT: SignalTickInput = { scene: aScene(), tick: 0, signals: defaultSignals(), lying: [] };

/** Character 1 at cell 0 with fear 9000; character 2 next to it. */
const AFRAID = aCharacter(1, 0, { emotions: someEmotions({ fear: 9000 }) });
const NEIGHBOR = aCharacter(2, 1);

const EMIT_ALL = forcing("SIGNAL_EMIT", 1, 1);
const NOTICE_ALL = forcing("SIGNAL_NOTICE", 1, 2);

function interpretAs(index: number): ForcedDraw {
  return forcing("SIGNAL_INTERPRET", index, 2);
}

function purposes(forced: readonly ForcedDraw[], characters = [AFRAID, NEIGHBOR]): string[] {
  const drawer = aDrawer(forced);
  signalsTick(drawer, characters, INPUT);
  return drawer.finish().records.map((record) => record.purpose);
}

describe("signalsTick: emission (simulation-model §7)", () => {
  it("given a frightened character forced to emit when ticking then its five fear signals come out", () => {
    const result = signalsTick(aDrawer([EMIT_ALL]), [AFRAID], INPUT);

    expect(result.emitted.map((entry) => entry.signal)).toStrictEqual([
      "tremor",
      "shakyVoice",
      "avertedGaze",
      "stepBack",
      "nervousLaugh",
    ]);
  });

  it("given a character with selfControl 10000 and fear 9000 when ticking then its emission chance is 4000", () => {
    const calm = { ...AFRAID, traits: someTraits({ selfControl: 10000 }) };
    const drawer = aDrawer();

    signalsTick(drawer, [calm], INPUT);

    expect(drawer.finish().records[0]?.p).toBe(4000);
  });

  it("given a character in the lying list when ticking then averted gaze comes out with lying as its cause", () => {
    const liar = aCharacter(1, 0);
    const result = signalsTick(aDrawer([EMIT_ALL]), [liar], { ...INPUT, lying: [idOf(1)] });

    expect(result.emitted).toStrictEqual([
      { emitter: 1, signal: "avertedGaze", channel: "VISUAL", cause: "lying" },
    ]);
  });

  it("given a character not in the lying list when ticking then it emits nothing", () => {
    const result = signalsTick(aDrawer([EMIT_ALL]), [aCharacter(1, 0)], {
      ...INPUT,
      lying: [idOf(2)],
    });

    expect(result.emitted).toStrictEqual([]);
  });

  it("given a character attracted to a neighbor it sees when ticking then attraction makes it blush", () => {
    const smitten = aCharacter(1, 0, { bonds: [aBond(2, { attraction: 9000 })] });
    const result = signalsTick(aDrawer([EMIT_ALL]), [smitten, NEIGHBOR], INPUT);

    expect(result.emitted.map((entry) => [entry.signal, entry.cause])).toStrictEqual([
      ["blush", "attraction"],
      ["fixedStare", "attraction"],
      ["smile", "attraction"],
    ]);
  });

  it("given a character attracted to someone behind a wall when ticking then it emits nothing", () => {
    const grid = gridOf([".#."]);
    const smitten = aCharacter(1, 0, { bonds: [aBond(2, { attraction: 9000 })] });
    const result = signalsTick(aDrawer([EMIT_ALL]), [smitten, aCharacter(2, 2)], {
      ...INPUT,
      scene: aScene({ grid }),
    });

    expect(result.emitted).toStrictEqual([]);
  });

  it("given two emitters when ticking then every emission is drawn before any notice", () => {
    const both = [AFRAID, { ...NEIGHBOR, emotions: someEmotions({ joy: 9000 }) }];

    expect(purposes([], both).slice(0, 9)).toStrictEqual(Array(9).fill("SIGNAL_EMIT"));
  });
});

describe("signalsTick: noticing (simulation-model §7)", () => {
  it("given a lone emitter when ticking then it never notices its own signals", () => {
    expect(purposes([EMIT_ALL], [AFRAID])).toStrictEqual(Array(5).fill("SIGNAL_EMIT"));
  });

  it("given an observer behind a wall when ticking then no signal is noticed nor drawn", () => {
    const grid = gridOf([".#."]);
    const drawer = aDrawer([EMIT_ALL, NOTICE_ALL]);

    const result = signalsTick(drawer, [AFRAID, aCharacter(2, 2)], {
      ...INPUT,
      scene: aScene({ grid }),
    });

    expect([result.events, drawer.finish().records.length]).toStrictEqual([[], 5]);
  });

  it("given an observer in the dark at 5 cells, out of sight but in earshot, when ticking then only the vocal signals reach it", () => {
    const dark = aScene({ startMinute: 1350 });
    const far = aCharacter(2, 5);

    const result = signalsTick(aDrawer([EMIT_ALL, NOTICE_ALL]), [AFRAID, far], {
      ...INPUT,
      scene: dark,
    });

    expect(result.events.map((event) => event.signal)).toStrictEqual([
      "shakyVoice",
      "nervousLaugh",
    ]);
  });

  it("given a tired observer next to the emitter when ticking then its notice chance is 6000", () => {
    const tired = aCharacter(2, 1, { body: aBody({ fatigue: 8000 }) });
    const drawer = aDrawer([EMIT_ALL]);

    signalsTick(drawer, [AFRAID, tired], INPUT);

    const notice = drawer
      .finish()
      .records.find((record) => record.purpose === "SIGNAL_NOTICE" && record.target === 2);
    expect(notice?.p).toBe(6000);
  });

  it("given an observer at 5 cells when ticking then its notice chance loses one band: 7000", () => {
    const drawer = aDrawer([EMIT_ALL]);

    signalsTick(drawer, [AFRAID, aCharacter(2, 5)], INPUT);

    const notice = drawer.finish().records.find((record) => record.purpose === "SIGNAL_NOTICE");
    expect(notice?.p).toBe(7000);
  });

  it("given every notice failing when ticking then nothing is interpreted", () => {
    const failing = forcing("SIGNAL_NOTICE", 0, 2);

    expect(purposes([EMIT_ALL, failing])).not.toContain("SIGNAL_INTERPRET");
  });

  it("given a noticed signal when ticking then it is interpreted right after it is noticed", () => {
    expect(purposes([EMIT_ALL, NOTICE_ALL]).slice(5, 9)).toStrictEqual([
      "SIGNAL_NOTICE",
      "SIGNAL_INTERPRET",
      "SIGNAL_NOTICE",
      "SIGNAL_INTERPRET",
    ]);
  });
});

describe("signalsTick: interpretation and events (simulation-model §7 and §16 step 8)", () => {
  it("given a tremor read as its first cause when ticking then the event says who noticed what, the true and the read cause", () => {
    const result = signalsTick(
      aDrawer([EMIT_ALL, NOTICE_ALL, interpretAs(0)]),
      [AFRAID, NEIGHBOR],
      {
        ...INPUT,
        tick: 7,
      },
    );

    expect(result.events[0]).toStrictEqual({
      kind: "SignalPerceived",
      tick: 7,
      observer: 2,
      emitter: 1,
      signal: "tremor",
      channel: "VISUAL",
      trueCause: "fear",
      interpretedCause: "fear",
    });
  });

  it("given a tremor read as its second cause when ticking then the read cause is cold, which is wrong", () => {
    const result = signalsTick(
      aDrawer([EMIT_ALL, NOTICE_ALL, interpretAs(1)]),
      [AFRAID, NEIGHBOR],
      INPUT,
    );

    expect(result.events[0]?.interpretedCause).toBe("cold");
  });

  it("given a frightened emitter in the snow and the most likely draws when ticking then its tremor is read as cold", () => {
    const drawer = createDrawer(createRngState({ castSeed: 1, sceneSeed: 7 }), {
      tick: 0,
      mode: "MOST_LIKELY",
      forced: [],
    });

    const result = signalsTick(drawer, [AFRAID, NEIGHBOR], {
      ...INPUT,
      scene: aScene({ weather: "snow" }),
    });

    expect(result.events[0]?.interpretedCause).toBe("cold");
  });

  it("given a frightened emitter in clear weather and the most likely draws when ticking then its tremor is read as fear", () => {
    const drawer = createDrawer(createRngState({ castSeed: 1, sceneSeed: 7 }), {
      tick: 0,
      mode: "MOST_LIKELY",
      forced: [],
    });

    const result = signalsTick(drawer, [AFRAID, NEIGHBOR], INPUT);

    expect(result.events[0]?.interpretedCause).toBe("fear");
  });

  it("given a quiet voice of a tired emitter late at night when ticking then fatigue weighs (10000 + 5000) × 2 next to sadness 10000", () => {
    const drawer = aDrawer([EMIT_ALL, NOTICE_ALL]);
    const tired = aCharacter(1, 0, { body: aBody({ fatigue: 9000 }) });

    signalsTick(drawer, [tired, NEIGHBOR], { ...INPUT, scene: aScene({ startMinute: 1350 }) });

    const quiet = drawer.finish().records.find((record) => record.purpose === "SIGNAL_INTERPRET");
    expect(quiet?.bound).toBe(40000);
  });
});

describe("signalsTick: perception of the moment (simulation-model §7 and §5.5)", () => {
  const angry = aCharacter(1, 0, { emotions: someEmotions({ anger: 9000 }) });
  const fists = [EMIT_ALL, NOTICE_ALL, interpretAs(0)];

  it("given an interpreted anger signal when ticking then the observer's perception of the emitter has hostility 1500 more and apparent anger", () => {
    const onlyFists = INPUT.signals.filter((signal) => signal.id === "clenchedFists");

    const result = signalsTick(aDrawer(fists), [angry, NEIGHBOR], { ...INPUT, signals: onlyFists });

    expect(result.characters[1]?.perceptions[0]).toMatchObject({
      target: 1,
      perceivedHostility: 1500,
      apparentEmotion: { emotion: "anger", intensity: 6000 },
    });
  });

  it("given an observer with a perception of the emitter when it reads a signal then the perception is updated, not relaxed", () => {
    const observer = aCharacter(2, 1, {
      perceptions: [aPerception(1, { perceivedHostility: 5000 })],
    });
    const onlyFists = INPUT.signals.filter((signal) => signal.id === "clenchedFists");

    const result = signalsTick(aDrawer(fists), [angry, observer], { ...INPUT, signals: onlyFists });

    expect(result.characters[1]?.perceptions[0]?.perceivedHostility).toBe(6500);
  });

  it("given a perception of someone who showed nothing when ticking then it relaxes toward the preview", () => {
    const observer = aCharacter(2, 1, {
      perceptions: [aPerception(3, { perceivedHostility: 5000 })],
    });

    const result = signalsTick(aDrawer(), [observer, aCharacter(3, 2)], INPUT);

    expect(result.characters[0]?.perceptions[0]?.perceivedHostility).toBe(4900);
  });

  it("given perceptions of two people and a signal from one when ticking then the list stays sorted by target", () => {
    const observer = aCharacter(2, 1, {
      perceptions: [aPerception(3, { perceivedHostility: 5000 })],
    });
    const onlyFists = INPUT.signals.filter((signal) => signal.id === "clenchedFists");

    const result = signalsTick(aDrawer(fists), [angry, observer, aCharacter(3, 2)], {
      ...INPUT,
      signals: onlyFists,
    });

    expect(result.characters[1]?.perceptions.map((entry) => entry.target)).toStrictEqual([1, 3]);
  });

  it("given an emitter that the observer did not notice when ticking then no perception record is made", () => {
    const result = signalsTick(
      aDrawer([EMIT_ALL, forcing("SIGNAL_NOTICE", 0, 2)]),
      [angry, NEIGHBOR],
      INPUT,
    );

    expect(result.characters[1]?.perceptions).toStrictEqual([]);
  });

  it("given an observer that trusts nobody when its perception relaxes then the preview reads its effective trustInOthers", () => {
    const wary = aCharacter(2, 1, {
      traits: someTraits({ trustInOthers: -10000 }),
      perceptions: [aPerception(3, { perceivedHostility: 0 })],
    });

    const result = signalsTick(aDrawer(), [wary, aCharacter(3, 2)], INPUT);

    expect(result.characters[0]?.perceptions[0]?.perceivedHostility).toBe(50);
  });
});

describe("signalsTick: shape and ranges (simulation-model §18 invariant 2)", () => {
  it("given characters out of id order when ticking then the result is sorted by id", () => {
    const result = signalsTick(aDrawer(), [aCharacter(5, 0), aCharacter(2, 4)], INPUT);

    expect(result.characters.map((character) => character.id)).toStrictEqual([2, 5]);
  });

  it("given the states given when ticking then they are not changed", () => {
    const characters = [AFRAID, aCharacter(2, 1, { perceptions: [aPerception(1)] })];
    const before = hashState(characters);

    signalsTick(aDrawer([EMIT_ALL, NOTICE_ALL]), characters, INPUT);

    expect(hashState(characters)).toBe(before);
  });

  it("given random characters and seeds when ticking then every value stays in range", () => {
    const cells = fc.uniqueArray(fc.integer({ min: 0, max: 48 }), { minLength: 3, maxLength: 3 });
    fc.assert(
      fc.property(
        cells.chain(([a = 0, b = 1, c = 2]) =>
          fc.record({
            characters: fc.tuple(
              arbitraryCharacter(1, a, [2, 3]),
              arbitraryCharacter(2, b, [1, 3]),
              arbitraryCharacter(3, c, [1, 2]),
            ),
            perceptions: fc.tuple(arbitraryPerception(2), arbitraryPerception(3)),
            seed: fc.integer({ min: 0, max: 0xffffffff }),
            hour: fc.integer({ min: 0, max: 1439 }),
          }),
        ),
        ({ characters: [first, ...rest], perceptions, seed, hour }) => {
          const drawer = createDrawer(createRngState({ castSeed: 1, sceneSeed: seed }), {
            tick: 0,
            mode: "NORMAL",
            forced: [],
          });
          const scene = aScene({ grid: gridOf(Array(7).fill(".......")), startMinute: hour });
          const result = signalsTick(drawer, [{ ...first, perceptions }, ...rest], {
            ...INPUT,
            scene,
            lying: [idOf(1)],
          });

          expect(
            result.characters.flatMap((character) => [
              ...rangeProblems(character),
              ...character.perceptions.flatMap(perceptionProblems),
            ]),
          ).toStrictEqual([]);
        },
      ),
    );
  });
});
