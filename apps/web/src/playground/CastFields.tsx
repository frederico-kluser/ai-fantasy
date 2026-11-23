/**
 * The characters of the form (presets §5, §8, §9 and §10.1): each by
 * archetype, with its identity, choices and lock; at most eight.
 */
import {
  AGE_BANDS,
  ASSOCIATION_TAG_IDS,
  CAST_MAX,
  CHARACTER_ARCHETYPE_IDS,
  DAY_STATE_IDS,
  DRIVE_IDS,
  SPEECH_REGISTERS,
  type CharacterArchetypeId,
} from "@ai-fantasy/engine";
import { useState, type Dispatch, type JSX } from "react";

import { PRESETS } from "../engine/presets.ts";
import { InputField, oneOf, optionsOf, picker, SelectField, type Option } from "./fields.tsx";
import { AGE_BAND_NAMES, displayName, nameIn, SPEECH_REGISTER_NAMES } from "./labels.ts";
import type { AssociationChoice, CharacterForm, PlaygroundState } from "./model.ts";
import type { CharacterChanges, PlaygroundAction } from "./reducer.ts";

interface CardProps {
  readonly character: CharacterForm;
  readonly index: number;
  readonly canLock: boolean;
  readonly dispatch: Dispatch<PlaygroundAction>;
}

type Change = (changes: CharacterChanges) => void;

const NONE = "";

const AGE_OPTIONS: Option[] = AGE_BANDS.map((band) => ({
  value: band,
  label: AGE_BAND_NAMES[band],
}));
const SPEECH_OPTIONS: Option[] = SPEECH_REGISTERS.map((register) => ({
  value: register,
  label: SPEECH_REGISTER_NAMES[register],
}));
const DRIVE_OPTIONS: Option[] = [
  { value: NONE, label: "a do arquétipo" },
  ...optionsOf(PRESETS.drives),
];
const ASSOCIATION_OPTIONS: Option[] = [
  { value: NONE, label: "nenhuma" },
  ...PRESETS.associationTags.flatMap((tag) => [
    { value: `FEAR:${tag.id}`, label: `medo de ${tag.name}` },
    { value: `ATTACHMENT:${tag.id}`, label: `apego a ${tag.name}` },
  ]),
];

function associationValue(association: AssociationChoice | null): string {
  return association === null ? NONE : `${association.kind}:${association.tag}`;
}

/** The association of a select value (`KIND:tag`), or `null` for none. */
export function associationOf(value: string): AssociationChoice | null {
  const [kind, tag = ""] = value.split(":");
  const known = oneOf(ASSOCIATION_TAG_IDS, tag);
  const fear = kind === "FEAR" ? "FEAR" : undefined;
  const chosen = kind === "ATTACHMENT" ? "ATTACHMENT" : fear;
  return known === undefined || chosen === undefined ? null : { tag: known, kind: chosen };
}

const TEXT_FIELDS = [
  ["name", "Nome"],
  ["pronouns", "Pronomes"],
  ["role", "Papel na história"],
  ["description", "Descrição"],
] as const;

type TextKey = (typeof TEXT_FIELDS)[number][0];

interface PartProps {
  readonly character: CharacterForm;
  readonly change: Change;
}

function IdentityFields({ character, change }: PartProps): JSX.Element {
  const text = (field: TextKey, value: string) => {
    const changes: Partial<Record<TextKey, string>> = {};
    changes[field] = value;
    change(changes);
  };
  return (
    <>
      {TEXT_FIELDS.map(([field, label]) => (
        <InputField
          key={field}
          label={label}
          value={character[field]}
          onChange={(value) => {
            text(field, value);
          }}
        />
      ))}
      <SelectField
        label="Faixa etária"
        value={character.ageBand}
        options={AGE_OPTIONS}
        onChange={picker(AGE_BANDS, (ageBand) => {
          change({ ageBand });
        })}
      />
    </>
  );
}

function StyleFields({ character, change }: PartProps): JSX.Element {
  return (
    <>
      <SelectField
        label="Registro de fala"
        value={character.speechRegister}
        options={SPEECH_OPTIONS}
        onChange={picker(SPEECH_REGISTERS, (speechRegister) => {
          change({ speechRegister });
        })}
      />
      <SelectField
        label="Arquétipo"
        value={character.archetype}
        options={optionsOf(PRESETS.characterArchetypes)}
        onChange={picker(CHARACTER_ARCHETYPE_IDS, (archetype) => {
          change({ archetype });
        })}
      />
      <SelectField
        label="Estado do dia"
        value={character.dayState}
        options={optionsOf(PRESETS.dayStates)}
        onChange={picker(DAY_STATE_IDS, (dayState) => {
          change({ dayState });
        })}
      />
    </>
  );
}

function ChoiceFields({ character, change }: PartProps): JSX.Element {
  const [first, second] = character.drives;
  const drive = (value: string) => oneOf(DRIVE_IDS, value) ?? null;
  return (
    <>
      <SelectField
        label="Vontade dominante 1"
        value={first ?? NONE}
        options={DRIVE_OPTIONS}
        onChange={(value) => {
          change({ drives: [drive(value), second] });
        }}
      />
      <SelectField
        label="Vontade dominante 2"
        value={second ?? NONE}
        options={DRIVE_OPTIONS}
        onChange={(value) => {
          change({ drives: [first, drive(value)] });
        }}
      />
      <SelectField
        label="Associação"
        value={associationValue(character.association)}
        options={ASSOCIATION_OPTIONS}
        onChange={(value) => {
          change({ association: associationOf(value) });
        }}
      />
    </>
  );
}

/** A lock checkbox: keeps the drawn values when generating again (presets §10.1). */
export function LockField({
  label,
  locked,
  canLock,
  onLock,
}: {
  readonly label: string;
  readonly locked: boolean;
  readonly canLock: boolean;
  readonly onLock: (locked: boolean) => void;
}): JSX.Element {
  return (
    <label className="lock">
      <input
        type="checkbox"
        checked={locked}
        disabled={!canLock && !locked}
        onChange={(event) => {
          onLock(event.target.checked);
        }}
      />
      {label}
    </label>
  );
}

function CharacterCard({ character, index, canLock, dispatch }: CardProps): JSX.Element {
  const change: Change = (changes) => {
    dispatch({ type: "updateCharacter", index, changes });
  };
  const title = `Personagem ${String(index + 1)}`;
  return (
    <fieldset className="card">
      <legend>{title}</legend>
      <IdentityFields character={character} change={change} />
      <StyleFields character={character} change={change} />
      <ChoiceFields character={character} change={change} />
      <LockField
        label="Travar valores sorteados"
        locked={character.locked !== null}
        canLock={canLock}
        onLock={(locked) => {
          dispatch({ type: "lockCharacter", index, locked });
        }}
      />
      <button
        type="button"
        onClick={() => {
          dispatch({ type: "removeCharacter", index });
        }}
      >
        Remover {displayName(character.name, index)}
      </button>
    </fieldset>
  );
}

function AddCharacter({
  count,
  dispatch,
}: {
  readonly count: number;
  readonly dispatch: Dispatch<PlaygroundAction>;
}): JSX.Element {
  const [archetype, setArchetype] = useState<CharacterArchetypeId>("caretaker");
  return (
    <div className="add">
      <SelectField
        label="Arquétipo do novo personagem"
        value={archetype}
        options={optionsOf(PRESETS.characterArchetypes)}
        onChange={picker(CHARACTER_ARCHETYPE_IDS, setArchetype)}
      />
      <button
        type="button"
        disabled={count >= CAST_MAX}
        onClick={() => {
          dispatch({ type: "addCharacter", archetype });
        }}
      >
        Adicionar personagem
      </button>
      <p className="hint">
        {count} de {CAST_MAX} personagens. Arquétipo:{" "}
        {nameIn(PRESETS.characterArchetypes, archetype)}.
      </p>
    </div>
  );
}

/** The cast part of the form. */
export function CastFields({
  state,
  dispatch,
}: {
  readonly state: PlaygroundState;
  readonly dispatch: Dispatch<PlaygroundAction>;
}): JSX.Element {
  return (
    <section aria-labelledby="cast-heading">
      <h3 id="cast-heading">Elenco</h3>
      {state.characters.map((character, index) => (
        <CharacterCard
          key={index}
          character={character}
          index={index}
          canLock={state.generated !== null}
          dispatch={dispatch}
        />
      ))}
      <AddCharacter count={state.characters.length} dispatch={dispatch} />
    </section>
  );
}
