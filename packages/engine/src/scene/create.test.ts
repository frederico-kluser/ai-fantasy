import { describe, expect, it } from "vitest";

import { canonicalize } from "../session/canonical.ts";
import { errorOf, valueOf } from "../../test/support/cast.ts";
import { aCreatedScene, aSceneSetup, PRESETS } from "../../test/support/scene.ts";
import { createScene } from "./create.ts";
import { dynamicOf, sceneHash, worldHash } from "./state.ts";

describe("createScene (overview §3.2, presets §10.1)", () => {
  it("given a valid setup when creating then the state of tick 0 holds the opened cast sorted by id", () => {
    const { state } = aCreatedScene();

    expect(state.tick).toBe(0);
    expect(state.characters.map((character) => character.id)).toStrictEqual([0, 1, 2]);
  });

  it("given a valid setup when creating then nothing is pending and nobody awaits", () => {
    const { state } = aCreatedScene();

    expect({
      obligations: state.obligations,
      bands: state.bands,
      walkers: state.walkers,
      awaiting: state.awaiting,
      drawMode: state.drawMode,
      forced: state.forced,
      ended: state.ended,
    }).toStrictEqual({
      obligations: [],
      bands: [],
      walkers: [],
      awaiting: null,
      drawMode: "NORMAL",
      forced: [],
      ended: null,
    });
  });

  it("given a setup with a history when creating then the slice starts after the history facts", () => {
    const { state } = aCreatedScene();

    expect(state.world.sliceStart).toBe(state.facts.length);
  });

  it("given a setup when creating then the draws are the cast draws followed by the opening draws", () => {
    const { draws } = aCreatedScene();

    expect(draws.map((draw) => draw.stream)).toContain("generation");
    expect(draws.at(-1)?.stream).toBe("setup");
    expect(draws.map((draw) => draw.seq)).toStrictEqual(draws.map((_, index) => index));
  });

  it("given a setup when creating then the rng continues after the draws of the creation", () => {
    const { state, draws } = aCreatedScene();

    expect(state.rng.nextSeq).toBe(draws.length);
  });

  it("given the same setup twice when creating then the hashes are equal (invariant 1)", () => {
    expect(aCreatedScene().hash).toBe(aCreatedScene().hash);
  });

  it("given another scene seed when creating then the hash changes", () => {
    const other = aCreatedScene({ seeds: { castSeed: 11, sceneSeed: 24 } });

    expect(other.hash).not.toBe(aCreatedScene().hash);
  });

  it("given a created scene when hashing then the hash is the hash of the dynamic state", () => {
    const created = aCreatedScene();

    expect(created.hash).toBe(sceneHash(created.state));
  });

  it("given a created scene when taking the dynamic state then the world is left out", () => {
    expect(Object.keys(dynamicOf(aCreatedScene().state))).not.toContain("world");
  });

  it("given two places when hashing the worlds then the hashes differ", () => {
    const tavern = aCreatedScene().state.world;
    const home = aCreatedScene({ place: "home" }).state.world;

    expect(worldHash(home)).not.toBe(worldHash(tavern));
  });

  it("given named characters when creating then no name is in the state nor the hash (invariant 3)", () => {
    const created = aCreatedScene();

    expect(created.identities.map((identity) => identity.name)).toContain("merchant person");
    expect(canonicalize(dynamicOf(created.state))).not.toContain("person");
  });

  it("given the defaults left out when creating then the setup has them filled in", () => {
    const { setup } = aCreatedScene();

    expect({
      naturalTag: setup.naturalTag,
      positions: setup.positions,
      player: setup.player,
      control: setup.control,
    }).toStrictEqual({ naturalTag: null, positions: [], player: null, control: "MANUAL" });
  });

  it("given a player and its control when creating then the world and the state keep them", () => {
    const { state } = aCreatedScene({ player: 1, control: "AUTO" });

    expect([state.world.player, state.control]).toStrictEqual([1, "AUTO"]);
  });

  it("given a tavern when creating then the scene reads the place, the weather and the clock", () => {
    const { scene, privacy } = aCreatedScene({ weather: "rain" }).state.world;

    expect({ scene: { ...scene, grid: null }, privacy }).toStrictEqual({
      scene: {
        grid: null,
        place: {
          danger: 2000,
          comfort: 6000,
          noise: 5000,
          baseTemperature: 1500,
          lit: true,
          tags: ["crowd", "enclosed"],
          exposure: "NONE",
        },
        weather: { id: "rain", temperature: -1000, extraNoise: 1500 },
        startMinute: 1200,
      },
      privacy: 2000,
    });
  });

  it("given a natural tag when creating then the place tags include it once, in catalog order", () => {
    const { place } = aCreatedScene({ place: "wilderness", naturalTag: "forest" }).state.world.scene;

    expect(place.tags).toStrictEqual(["forest"]);
  });

  it("given a natural tag the place already has when creating then it appears once", () => {
    const { place } = aCreatedScene({ naturalTag: "crowd" }).state.world.scene;

    expect(place.tags).toStrictEqual(["crowd", "enclosed"]);
  });

  it("given another grid template when creating then the grid is that place's", () => {
    const home = aCreatedScene({ place: "home" }).state.world.scene.grid;

    expect(aCreatedScene({ grid: "home" }).state.world.scene.grid).toStrictEqual(home);
  });

  it("given an unknown weather when creating then the setup is invalid with the path", () => {
    const error = errorOf(createScene(PRESETS, aSceneSetup({ weather: "blizzard" })));

    expect(error.code).toBe("INVALID_SETUP");
    expect(error).toMatchObject({ issues: [{ path: "weather" }] });
  });

  it("given a seed out of range when creating then the setup is invalid", () => {
    const setup = aSceneSetup({ seeds: { castSeed: 4294967296, sceneSeed: 0 } });

    expect(errorOf(createScene(PRESETS, setup))).toMatchObject({
      code: "INVALID_SETUP",
      issues: [{ path: "seeds.castSeed" }],
    });
  });

  it("given the largest seed when creating then the scene opens", () => {
    const setup = aSceneSetup({ seeds: { castSeed: 4294967295, sceneSeed: 4294967295 } });

    expect(createScene(PRESETS, setup).ok).toBe(true);
  });

  it("given a cast with an unknown archetype when creating then the cast is invalid", () => {
    const setup = aSceneSetup({ cast: { characters: [{ archetype: "wizard" }] } });

    expect(errorOf(createScene(PRESETS, setup)).code).toBe("INVALID_CAST");
  });

  it("given a player outside the cast when creating then the player is invalid", () => {
    expect(errorOf(createScene(PRESETS, aSceneSetup({ player: 3 })))).toStrictEqual({
      code: "INVALID_PLAYER",
      player: 3,
    });
  });

  it("given the last character as the player when creating then the scene opens", () => {
    expect(valueOf(createScene(PRESETS, aSceneSetup({ player: 2 }))).state.world.player).toBe(2);
  });

  it("given a position on a wall when creating then the opening is invalid", () => {
    const setup = aSceneSetup({ positions: [{ x: 0, y: 0 }] });

    expect(errorOf(createScene(PRESETS, setup))).toStrictEqual({
      code: "INVALID_OPENING",
      error: { code: "INVALID_POSITION", character: 0 },
    });
  });
});
