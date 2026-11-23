/**
 * The generated cast (presets §10.1): who came out of the draws, their
 * dominant drives and associations, the bonds with labels (the family the
 * generator added included) and the tension hook.
 */
import type { JSX } from "react";

import { PRESETS } from "../engine/presets.ts";
import type { CastView } from "../engine/protocol.ts";
import { displayName, nameIn } from "./labels.ts";

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

/** The generated cast as a section of the form. */
export function GeneratedCast({
  view,
  attempt,
}: Props & { readonly attempt: number }): JSX.Element {
  return (
    <section aria-labelledby="generated-heading">
      <h3 id="generated-heading">{`Elenco gerado (tentativa ${String(attempt)})`}</h3>
      <Characters view={view} />
      <Relations view={view} />
      <Hook view={view} />
    </section>
  );
}
