import { describe, expect, it } from "vitest";
import { z } from "zod";

import {
  specAptitudes,
  specBodyNeeds,
  specBondAxes,
  specBondLabels,
  specDrives,
  specEmotions,
  specSignalCauses,
  specSignals,
  specTraits,
} from "../../test/support/spec-model.ts";
import { BODY_NEEDS, bodyNeedSchema } from "./body.ts";
import { BOND_AXES, BOND_LABELS, bondAxisSchema, bondLabelSchema } from "./bonds.ts";
import { DRIVES, driveSchema } from "./drives.ts";
import { EMOTIONS, emotionSchema } from "./emotions.ts";
import { SIGNAL_CAUSE_IDS, SIGNALS, signalSchema } from "./signals.ts";
import { APTITUDES, aptitudeSchema, TRAITS, traitSchema } from "./traits.ts";

/** The parsed form of a catalog, as the loader delivers it (defaults filled in). */
const parsed = (schema: z.ZodType, data: unknown): unknown => z.array(schema).parse(data);

describe("simulation-model lists × preset data (CORE-03 acceptance)", () => {
  it("given the body needs when comparing with simulation-model §5.1 then they match", () => {
    expect(parsed(bodyNeedSchema, BODY_NEEDS)).toStrictEqual(specBodyNeeds());
  });

  it("given the emotions when comparing with simulation-model §5.2 then they match", () => {
    expect(parsed(emotionSchema, EMOTIONS)).toStrictEqual(specEmotions());
  });

  it("given the drives when comparing with simulation-model §5.3 then they match", () => {
    expect(parsed(driveSchema, DRIVES)).toStrictEqual(specDrives());
  });

  it("given the bond axes when comparing with simulation-model §5.4 then they match", () => {
    expect(parsed(bondAxisSchema, BOND_AXES)).toStrictEqual(specBondAxes());
  });

  it("given the bond labels when comparing with simulation-model §5.4 then they match", () => {
    expect(parsed(bondLabelSchema, BOND_LABELS)).toStrictEqual(specBondLabels());
  });

  it("given the traits when comparing with simulation-model §5.6 then they match", () => {
    expect(parsed(traitSchema, TRAITS)).toStrictEqual(specTraits());
  });

  it("given the aptitudes when comparing with simulation-model §5.6 then they match", () => {
    expect(parsed(aptitudeSchema, APTITUDES)).toStrictEqual(specAptitudes());
  });

  it("given the signal causes when comparing with simulation-model §7 then they match", () => {
    expect(SIGNAL_CAUSE_IDS).toStrictEqual(specSignalCauses());
  });

  it("given the signals when comparing with simulation-model §7 then they match", () => {
    expect(parsed(signalSchema, SIGNALS)).toStrictEqual(specSignals());
  });
});
