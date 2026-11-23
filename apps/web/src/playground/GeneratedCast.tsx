/**
 * The generated cast (presets §10.1): who came out of the draws, their
 * dominant drives and associations, the bonds with labels (the family the
 * generator added included) and the tension hook.
 */
import type { Dispatch, JSX } from "react";

import { PRESETS } from "../engine/presets.ts";
import type { CastView } from "../engine/protocol.ts";
import { LockField } from "./CastFields.tsx";
import { displayName, nameIn } from "./labels.ts";
import type { DerivedForm, PlaygroundState } from "./model.ts";
import type { PlaygroundAction } from "./reducer.ts";

interface Props {
  readonly view: CastView;
}

function namesOf(view: CastView): string[] {
  return view.characters.map((character) => displayName(character.name, character.id));
}

function nameAt(names: readonly string[], id: number): string {
  return names[id] ?? displayName("", id);
}

function associationText(tag: string, valence: number): string {
  const kind = valence < 0 ? "medo de" : "apego a";
  return `; ${kind} ${nameIn(PRESETS.associationTags, tag)} (${String(valence)})`;
}

function Characters({ view }: Props): JSX.Element {
  return (
    <ul aria-label="Personagens gerados">
      {view.characters.map((character) => (
        <li key={character.id}>
          <strong>{displayName(character.name, character.id)}</strong>
          {": quer "}
          {character.dominantDrives.map((drive) => nameIn(PRESETS.drives, drive)).join(", ")}
          {character.associations
            .map((association) => associationText(association.tag, association.valence))
            .join("")}
        </li>
      ))}
    </ul>
  );
}

function Relations({ view }: Props): JSX.Element {
  const names = namesOf(view);
  return (
    <ul aria-label="Laços gerados">
      {view.relations.map((relation) => (
        <li key={`${String(relation.from)}-${String(relation.to)}`}>
          {`${nameAt(names, relation.from)} → ${nameAt(names, relation.to)}: `}
          {relation.labels.map((label) => nameIn(PRESETS.bondLabels, label)).join(", ")}
        </li>
      ))}
    </ul>
  );
}

function Hook({ view }: Props): JSX.Element | null {
  if (view.hook === null) {
    return null;
  }
  const names = namesOf(view);
  const { author, subject, event, secret } = view.hook;
  const hidden = secret ? " (em segredo)" : "";
  return (
    <p>
      {`Gancho de tensão: ${nameAt(names, author)} → ${nameAt(names, subject)}, `}
      {`${nameIn(PRESETS.historyEvents, event)}${hidden}.`}
    </p>
  );
}

interface DerivedProps extends Props {
  readonly derived: readonly DerivedForm[];
  readonly dispatch: Dispatch<PlaygroundAction>;
}

/** The pairs the transitive family added (presets §6), each lockable (presets §10.1, `derived`). */
function DerivedPairs({ view, derived, dispatch }: DerivedProps): JSX.Element | null {
  const names = namesOf(view);
  const pairs = view.drafts.bonds.filter((entry) => entry.derived);
  if (pairs.length === 0) {
    return null;
  }
  return (
    <fieldset>
      <legend>Pares acrescentados pela família</legend>
      {pairs.map(({ a, b }) => (
        <LockField
          key={`${String(a)}-${String(b)}`}
          label={`Travar ${nameAt(names, a)} – ${nameAt(names, b)}`}
          locked={derived.some((pair) => pair.a === a && pair.b === b)}
          canLock
          onLock={(locked) => {
            dispatch({ type: "lockDerived", a, b, locked });
          }}
        />
      ))}
    </fieldset>
  );
}

/** The generated cast as a section of the form, when there is one. */
export function GeneratedCast({
  state,
  dispatch,
}: {
  readonly state: PlaygroundState;
  readonly dispatch: Dispatch<PlaygroundAction>;
}): JSX.Element | null {
  const view = state.generated;
  if (view === null) {
    return null;
  }
  return (
    <section aria-labelledby="generated-heading">
      <h3 id="generated-heading">{`Elenco gerado (tentativa ${String(state.attempt)})`}</h3>
      <Characters view={view} />
      <Relations view={view} />
      <Hook view={view} />
      <DerivedPairs view={view} derived={state.derived} dispatch={dispatch} />
    </section>
  );
}
