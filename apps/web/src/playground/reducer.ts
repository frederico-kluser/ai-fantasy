/**
 * The changes to the manual playground form (presets §10.1): one pure
 * handler per action, in a table. A change to the cast moves the revision and
 * drops the generated view; a change to what a lock depends on unlocks it.
 */
import { BP_MAX, CAST_MAX, type BondAxisId, type CellPos } from "@ai-fantasy/engine";

import type { CastView } from "../engine/protocol.ts";
import { newCharacter, type BondForm, type CharacterForm, type PlaygroundState } from "./model.ts";

/** What can change in a character by hand (the lock has its own action). */
export type CharacterChanges = Partial<Omit<CharacterForm, "locked">>;

/** What can change in a bond by hand (the lock has its own action). */
export type BondChanges = Partial<Omit<BondForm, "locked">>;

/** What can change in the scene. */
export type SceneChanges = Partial<
  Pick<PlaygroundState, "place" | "grid" | "naturalTag" | "weather" | "startMinute">
>;

/** An action on the playground form. */
export type PlaygroundAction =
  | { readonly type: "setSeeds"; readonly seeds: Partial<PlaygroundState["seeds"]> }
  | { readonly type: "setScene"; readonly changes: SceneChanges }
  | { readonly type: "addCharacter"; readonly archetype: CharacterForm["archetype"] }
  | { readonly type: "updateCharacter"; readonly index: number; readonly changes: CharacterChanges }
  | { readonly type: "removeCharacter"; readonly index: number }
  | { readonly type: "lockCharacter"; readonly index: number; readonly locked: boolean }
  | { readonly type: "addBond" }
  | { readonly type: "updateBond"; readonly index: number; readonly changes: BondChanges }
  | { readonly type: "removeBond"; readonly index: number }
  | { readonly type: "lockBond"; readonly index: number; readonly locked: boolean }
  | {
      readonly type: "editBondAxis";
      readonly index: number;
      readonly side: "aToB" | "bToA";
      readonly axis: BondAxisId;
      readonly value: number;
    }
  | {
      readonly type: "lockDerived";
      readonly a: number;
      readonly b: number;
      readonly locked: boolean;
    }
  | { readonly type: "setPosition"; readonly index: number; readonly position: CellPos | null }
  | { readonly type: "setPlayer"; readonly player: number | null }
  | {
      readonly type: "generated";
      readonly view: CastView;
      readonly attempt: number;
      readonly revision: number;
    };

type Handlers = {
  readonly [T in PlaygroundAction["type"]]: (
    state: PlaygroundState,
    action: Extract<PlaygroundAction, { type: T }>,
  ) => PlaygroundState;
};

/** The character fields a locked draft depends on (presets §10.1). */
const CHARACTER_LOCK_FIELDS: readonly (keyof CharacterChanges)[] = [
  "archetype",
  "drives",
  "association",
];

/** A new state of the cast: the revision moves and the generated view is dropped. */
function castChanged(state: PlaygroundState, changes: Partial<PlaygroundState>): PlaygroundState {
  return { ...state, ...changes, revision: state.revision + 1, generated: null };
}

/** A new state of the bonds: the locks of the pairs the family added go too. */
function graphChanged(state: PlaygroundState, changes: Partial<PlaygroundState>): PlaygroundState {
  return castChanged(state, { ...changes, derived: [] });
}

function lockDerived(
  state: PlaygroundState,
  { a, b, locked }: Extract<PlaygroundAction, { type: "lockDerived" }>,
): PlaygroundState {
  const entry = state.generated?.drafts.bonds.find(
    (pair) => pair.derived && pair.a === a && pair.b === b,
  );
  if (entry === undefined) {
    return state;
  }
  const others = state.derived.filter((pair) => pair.a !== a || pair.b !== b);
  return { ...state, derived: locked ? [...others, { a, b, locked: entry.draft }] : others };
}

function replaceAt<T>(list: readonly T[], index: number, item: (old: T) => T): T[] {
  return list.map((old, at) => (at === index ? item(old) : old));
}

/** The new id of character `id` once `removed` leaves. */
function shifted(id: number, removed: number): number {
  return id > removed ? id - 1 : id;
}

function withoutCharacter(state: PlaygroundState, index: number): PlaygroundState {
  const bonds = state.bonds
    .filter((bond) => bond.a !== index && bond.b !== index)
    .map((bond) => ({
      ...bond,
      a: shifted(bond.a, index),
      b: shifted(bond.b, index),
      events: bond.events.map((event) => ({ ...event, author: shifted(event.author, index) })),
    }));
  const player =
    state.player === index || state.player === null ? null : shifted(state.player, index);
  return graphChanged(state, {
    characters: state.characters.filter((_, at) => at !== index),
    bonds,
    positions: state.positions.filter((_, at) => at !== index),
    player,
  });
}

function updateCharacter(state: PlaygroundState, index: number, changes: CharacterChanges) {
  const unlocks = CHARACTER_LOCK_FIELDS.some((field) => field in changes);
  const characters = replaceAt(state.characters, index, (character) => ({
    ...character,
    ...changes,
    locked: unlocks ? null : character.locked,
  }));
  return castChanged(state, { characters });
}

function clampAxis(value: number): number {
  return Math.min(BP_MAX, Math.max(0, Math.trunc(value)));
}

function editBondAxis(
  state: PlaygroundState,
  action: Extract<PlaygroundAction, { type: "editBondAxis" }>,
): PlaygroundState {
  const bond = state.bonds[action.index];
  const base = bond?.locked ?? state.generated?.drafts.bonds[action.index]?.draft;
  if (base === undefined) {
    return state;
  }
  const side = { ...base[action.side], [action.axis]: clampAxis(action.value) };
  const locked = { ...base, [action.side]: side };
  return { ...state, bonds: replaceAt(state.bonds, action.index, (old) => ({ ...old, locked })) };
}

const HANDLERS: Handlers = {
  setSeeds: (state, { seeds }) => {
    const next = { ...state.seeds, ...seeds };
    return next.castSeed === state.seeds.castSeed
      ? { ...state, seeds: next }
      : castChanged(state, { seeds: next, attempt: 0 });
  },
  setScene: (state, { changes }) => {
    const grid = changes.grid ?? changes.place ?? state.grid;
    const positions = grid === state.grid ? state.positions : state.positions.map(() => null);
    return { ...state, ...changes, grid, positions };
  },
  addCharacter: (state, { archetype }) =>
    state.characters.length >= CAST_MAX
      ? state
      : castChanged(state, {
          characters: [...state.characters, newCharacter(archetype)],
          positions: [...state.positions, null],
        }),
  updateCharacter: (state, { index, changes }) => updateCharacter(state, index, changes),
  removeCharacter: (state, { index }) => withoutCharacter(state, index),
  lockCharacter: (state, { index, locked }) => {
    const draft = state.generated?.drafts.characters[index];
    if (draft === undefined) {
      return state;
    }
    const lock = locked ? draft : null;
    return {
      ...state,
      characters: replaceAt(state.characters, index, (old) => ({ ...old, locked: lock })),
    };
  },
  addBond: (state) =>
    state.characters.length < 2
      ? state
      : graphChanged(state, {
          bonds: [
            ...state.bonds,
            { a: 0, b: 1, archetype: "acquaintances", events: [], locked: null },
          ],
        }),
  updateBond: (state, { index, changes }) =>
    graphChanged(state, {
      bonds: replaceAt(state.bonds, index, (old) => ({ ...old, ...changes, locked: null })),
    }),
  removeBond: (state, { index }) =>
    graphChanged(state, { bonds: state.bonds.filter((_, at) => at !== index) }),
  lockBond: (state, { index, locked }) => {
    const draft = state.generated?.drafts.bonds[index]?.draft;
    if (draft === undefined) {
      return state;
    }
    const lock = locked ? draft : null;
    return { ...state, bonds: replaceAt(state.bonds, index, (old) => ({ ...old, locked: lock })) };
  },
  editBondAxis,
  lockDerived,
  setPosition: (state, { index, position }) => ({
    ...state,
    positions: replaceAt(state.positions, index, () => position),
  }),
  setPlayer: (state, { player }) => ({ ...state, player }),
  generated: (state, { view, attempt, revision }) =>
    revision === state.revision ? { ...state, generated: view, attempt } : state,
};

/** Applies one action to the playground form. */
export function playgroundReducer(
  state: PlaygroundState,
  action: PlaygroundAction,
): PlaygroundState {
  // The table has one handler per action type; TypeScript cannot pair them by itself.
  const handle = HANDLERS[action.type] as (
    s: PlaygroundState,
    a: PlaygroundAction,
  ) => PlaygroundState;
  return handle(state, action);
}
