/**
 * The bonds of the form (presets §6, §7 and §10.1): a pair, a bond archetype,
 * up to two events with who did them, the drawn axes (editable once
 * generated: an edit locks the bond) and the lock.
 */
import {
  BOND_ARCHETYPE_IDS,
  BOND_AXIS_IDS,
  HISTORY_EVENT_IDS,
  type HistoryEventId,
} from "@ai-fantasy/engine";
import type { Dispatch, JSX } from "react";

import { PRESETS } from "../engine/presets.ts";
import type { BondDraftData } from "../engine/protocol.ts";
import { LockField } from "./CastFields.tsx";
import { InputField, oneOf, optionsOf, picker, SelectField, type Option } from "./fields.tsx";
import { displayName } from "./labels.ts";
import type { BondForm, EventForm, PlaygroundState } from "./model.ts";
import type { BondChanges, PlaygroundAction } from "./reducer.ts";

/** Events a bond takes in the form (presets §10, step 4). */
export const EVENT_SLOTS = 2;

const NONE = "";
const EVENT_OPTIONS: Option[] = [
  { value: NONE, label: "nenhum" },
  ...optionsOf(PRESETS.historyEvents),
];

/** The events with `slot` set to `event` (done by `author`) or emptied; empty slots close up. */
export function withEvent(
  events: readonly EventForm[],
  slot: number,
  event: HistoryEventId | null,
  author: number,
): EventForm[] {
  const slots = Array.from({ length: EVENT_SLOTS }, (_, at) => events[at] ?? null);
  slots[slot] = event === null ? null : { event, author };
  return slots.filter((entry) => entry !== null);
}

interface CardProps {
  readonly bond: BondForm;
  readonly index: number;
  readonly names: readonly string[];
  readonly draft: BondDraftData | undefined;
  readonly dispatch: Dispatch<PlaygroundAction>;
}

function nameOf(names: readonly string[], id: number): string {
  return names[id] ?? displayName("", id);
}

function PairFields({
  bond,
  names,
  change,
}: {
  readonly bond: BondForm;
  readonly names: readonly string[];
  readonly change: (changes: BondChanges) => void;
}): JSX.Element {
  const people: Option[] = names.map((name, id) => ({ value: String(id), label: name }));
  return (
    <>
      <SelectField
        label="Lado A"
        value={String(bond.a)}
        options={people}
        onChange={(value) => {
          change({ a: Number(value) });
        }}
      />
      <SelectField
        label="Lado B"
        value={String(bond.b)}
        options={people}
        onChange={(value) => {
          change({ b: Number(value) });
        }}
      />
      <SelectField
        label="Arquétipo do laço"
        value={bond.archetype}
        options={optionsOf(PRESETS.bondArchetypes)}
        onChange={picker(BOND_ARCHETYPE_IDS, (archetype) => {
          change({ archetype });
        })}
      />
    </>
  );
}

interface SlotProps {
  readonly bond: BondForm;
  readonly slot: number;
  readonly names: readonly string[];
  readonly change: (changes: BondChanges) => void;
}

function authorsOf(bond: BondForm, names: readonly string[]): Option[] {
  return [bond.a, bond.b].map((id) => ({ value: String(id), label: nameOf(names, id) }));
}

function EventSlot({ bond, slot, names, change }: SlotProps): JSX.Element {
  const current = bond.events[slot];
  const number = String(slot + 1);
  const set = (event: HistoryEventId | null, author: number) => {
    change({ events: withEvent(bond.events, slot, event, author) });
  };
  return (
    <div className="event">
      <SelectField
        label={`Acontecimento ${number}`}
        value={current?.event ?? NONE}
        options={EVENT_OPTIONS}
        onChange={(value) => {
          set(oneOf(HISTORY_EVENT_IDS, value) ?? null, current?.author ?? bond.a);
        }}
      />
      {current === undefined ? null : (
        <SelectField
          label={`Quem fez o acontecimento ${number}`}
          value={String(current.author)}
          options={authorsOf(bond, names)}
          onChange={(value) => {
            set(current.event, Number(value));
          }}
        />
      )}
    </div>
  );
}

function AxisFields({
  bond,
  index,
  names,
  draft,
  dispatch,
}: CardProps & { readonly draft: BondDraftData }): JSX.Element {
  const sides = [
    ["aToB", nameOf(names, bond.a), nameOf(names, bond.b)],
    ["bToA", nameOf(names, bond.b), nameOf(names, bond.a)],
  ] as const;
  return (
    <details>
      <summary>Eixos sorteados (editar trava o laço)</summary>
      {sides.map(([side, from, to]) =>
        BOND_AXIS_IDS.map((axis) => (
          <InputField
            key={`${side}.${axis}`}
            label={`${PRESETS.bondAxes.find((entry) => entry.id === axis)?.name ?? axis}, ${from} → ${to}`}
            type="number"
            min={0}
            max={10000}
            value={String(draft[side][axis])}
            onChange={(value) => {
              dispatch({ type: "editBondAxis", index, side, axis, value: Number(value) });
            }}
          />
        )),
      )}
    </details>
  );
}

function BondCard(props: CardProps): JSX.Element {
  const { bond, index, names, draft, dispatch } = props;
  const change = (changes: BondChanges) => {
    dispatch({ type: "updateBond", index, changes });
  };
  return (
    <fieldset className="card">
      <legend>Laço {index + 1}</legend>
      <PairFields bond={bond} names={names} change={change} />
      {Array.from({ length: EVENT_SLOTS }, (_, slot) => (
        <EventSlot key={slot} bond={bond} slot={slot} names={names} change={change} />
      ))}
      {draft === undefined ? null : <AxisFields {...props} draft={draft} />}
      <LockField
        label="Travar laço"
        locked={bond.locked !== null}
        canLock={draft !== undefined}
        onLock={(locked) => {
          dispatch({ type: "lockBond", index, locked });
        }}
      />
      <button
        type="button"
        onClick={() => {
          dispatch({ type: "removeBond", index });
        }}
      >
        Remover laço {index + 1}
      </button>
    </fieldset>
  );
}

/** The bonds part of the form. */
export function BondFields({
  state,
  dispatch,
}: {
  readonly state: PlaygroundState;
  readonly dispatch: Dispatch<PlaygroundAction>;
}): JSX.Element {
  const names = state.characters.map((character, id) => displayName(character.name, id));
  return (
    <section aria-labelledby="bonds-heading">
      <h3 id="bonds-heading">Laços</h3>
      {state.bonds.map((bond, index) => (
        <BondCard
          key={index}
          bond={bond}
          index={index}
          names={names}
          draft={bond.locked ?? state.generated?.drafts.bonds[index]}
          dispatch={dispatch}
        />
      ))}
      <button
        type="button"
        disabled={state.characters.length < 2}
        onClick={() => {
          dispatch({ type: "addBond" });
        }}
      >
        Adicionar laço
      </button>
    </section>
  );
}
