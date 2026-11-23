import { describe, expect, it } from "vitest";

import { toBipolarBp, toBp } from "../domain/bp.ts";
import { aBond, aPerception, ticksOfPerception } from "../../test/support/character.ts";
import { idOf } from "../../test/support/space.ts";
import { bondToward } from "./bonds.ts";
import {
  apparentDistress,
  freshPerception,
  perceptionPreview,
  perceptionToward,
  relaxPerception,
} from "./perception.ts";

const ZERO_PREVIEW = perceptionPreview(aBond(1), toBipolarBp(0));

describe("bondToward (simulation-model §5.4)", () => {
  it("given a bond toward 2 when reading it then it is that bond", () => {
    const bond = aBond(2, { trust: 8000 }, ["CHILD"]);

    expect(bondToward([aBond(1), bond], idOf(2))).toBe(bond);
  });

  it("given no bond toward 3 when reading it then every axis is 0 and there are no labels", () => {
    expect(bondToward([aBond(1, { trust: 8000 })], idOf(3))).toStrictEqual(aBond(3));
  });
});

describe("perceptionPreview (simulation-model §5.5)", () => {
  it("given fearOf 4000 when computing the preview then perceived threat is 4000", () => {
    expect(perceptionPreview(aBond(1, { fearOf: 4000 }), toBipolarBp(0)).perceivedThreat).toBe(
      4000,
    );
  });

  it("given resentment 3000 and trust in others -4000 when computing the preview then hostility is 2500", () => {
    const preview = perceptionPreview(aBond(1, { resentment: 3000 }), toBipolarBp(-4000));

    expect(preview.perceivedHostility).toBe(2500);
  });

  it("given trust in others +4000 when computing the preview then it adds no hostility", () => {
    expect(perceptionPreview(aBond(1), toBipolarBp(4000)).perceivedHostility).toBe(0);
  });

  it("given affection 6000 and attraction 2000 when computing the preview then interest is 2000", () => {
    const preview = perceptionPreview(
      aBond(1, { affection: 6000, attraction: 2000 }),
      toBipolarBp(0),
    );

    expect(preview.perceivedInterest).toBe(2000);
  });

  it("given trust 7000, resentment 1000 and trust in others -2000 when computing the preview then sincerity is 7500", () => {
    const preview = perceptionPreview(
      aBond(1, { trust: 7000, resentment: 1000 }),
      toBipolarBp(-2000),
    );

    expect(preview.perceivedSincerity).toBe(7500);
  });

  it("given full resentment and distrust when computing the preview then sincerity is clamped to 0", () => {
    const preview = perceptionPreview(aBond(1, { resentment: 10000 }), toBipolarBp(-10000));

    expect(preview.perceivedSincerity).toBe(0);
  });
});

describe("perceptionToward (simulation-model §5.5)", () => {
  it("given no record toward 4 when reading it then it is the preview, with no apparent emotion nor marks", () => {
    expect(perceptionToward([], idOf(4), ZERO_PREVIEW)).toStrictEqual(
      freshPerception(idOf(4), ZERO_PREVIEW),
    );
  });

  it("given a record toward 4 when reading it then it is that record", () => {
    const record = aPerception(4, { perceivedThreat: 6000 });

    expect(perceptionToward([aPerception(2), record], idOf(4), ZERO_PREVIEW)).toBe(record);
  });
});

describe("relaxPerception (simulation-model §5.5)", () => {
  it("given perceived threat 6000 with prior 0 and no updates when 35 ticks pass then it is 2947", () => {
    expect(
      ticksOfPerception(aPerception(1, { perceivedThreat: 6000 }), ZERO_PREVIEW, 35)
        .perceivedThreat,
    ).toBe(2947);
  });

  it("given hostility, interest and sincerity away from the preview when a tick passes then each relaxes at 9800", () => {
    const relaxed = relaxPerception(
      aPerception(1, { perceivedHostility: 1000, perceivedInterest: 2000, perceivedSincerity: 0 }),
      ZERO_PREVIEW,
    );

    expect([
      relaxed.perceivedHostility,
      relaxed.perceivedInterest,
      relaxed.perceivedSincerity,
    ]).toStrictEqual([980, 1960, 100]);
  });

  it("given an apparent emotion of 1100 when a tick passes then it relaxes toward 0 and stays: 1078", () => {
    const perception = aPerception(1, {}, { emotion: "fear", intensity: toBp(1100) });

    expect(relaxPerception(perception, ZERO_PREVIEW).apparentEmotion).toStrictEqual({
      emotion: "fear",
      intensity: 1078,
    });
  });

  it("given an apparent emotion of 1020 when a tick passes then it falls below 1000 and fades out", () => {
    const perception = aPerception(1, {}, { emotion: "anger", intensity: toBp(1020) });

    expect(relaxPerception(perception, ZERO_PREVIEW).apparentEmotion).toBeNull();
  });

  it("given a mark 58 ticks unconfirmed and one 59 when a tick passes then the first ages and the second fades", () => {
    const perception = aPerception(1, {}, null, [
      { mark: "cold", ticksUnconfirmed: 58 },
      { mark: "pain", ticksUnconfirmed: 59 },
    ]);

    expect(relaxPerception(perception, ZERO_PREVIEW).apparentState).toStrictEqual([
      { mark: "cold", ticksUnconfirmed: 59 },
    ]);
  });
});

describe("apparentDistress (simulation-model §5.3)", () => {
  it.each([
    ["fear", 6000],
    ["sadness", 6000],
    ["anger", 0],
  ] as const)(
    "given an apparent %s of 6000 without marks when reading distress then it is %i",
    (emotion, distress) => {
      expect(apparentDistress(aPerception(1, {}, { emotion, intensity: toBp(6000) }))).toBe(
        distress,
      );
    },
  );

  it("given an apparent fear of 8000 and a mark when reading distress then it is limited to 10000", () => {
    const perception = aPerception(1, {}, { emotion: "fear", intensity: toBp(8000) }, [
      { mark: "pain", ticksUnconfirmed: 0 },
    ]);

    expect(apparentDistress(perception)).toBe(10000);
  });

  it("given only a mark when reading distress then it is 3000", () => {
    expect(
      apparentDistress(aPerception(1, {}, null, [{ mark: "fatigue", ticksUnconfirmed: 3 }])),
    ).toBe(3000);
  });
});
