/**
 * The review sheet (overview §6): the setup the engine accepted — place,
 * weather, time, seeds and the cast with its start cells and the player.
 * Starting the scene from it belongs to the scene screen (WEB-02).
 */
import { dayPhase } from "@ai-fantasy/engine";
import type { JSX } from "react";

import { PRESETS } from "../engine/presets.ts";
import type { SetupReview } from "../engine/protocol.ts";
import { useFocus } from "./fields.tsx";
import { DAY_PHASE_NAMES, displayName, nameIn } from "./labels.ts";
import type { SceneSetup } from "./setup.ts";
import { timeOf } from "./values.ts";

interface Props {
  readonly setup: SceneSetup;
  readonly review: SetupReview;
  readonly onBack: () => void;
}

function summaryOf(setup: SceneSetup): readonly (readonly [string, string])[] {
  const tag = setup.naturalTag;
  return [
    ["Lugar", nameIn(PRESETS.places, setup.place)],
    ["Gabarito", nameIn(PRESETS.places, setup.grid)],
    ["Tag natural", tag === null ? "nenhuma" : nameIn(PRESETS.associationTags, tag)],
    ["Clima", nameIn(PRESETS.weathers, setup.weather)],
    ["Horário", `${timeOf(setup.startMinute)} (${DAY_PHASE_NAMES[dayPhase(setup.startMinute)]})`],
    ["Seeds", `elenco ${String(setup.seeds.castSeed)}, cena ${String(setup.seeds.sceneSeed)}`],
  ];
}

function Summary({ setup }: { readonly setup: SceneSetup }): JSX.Element {
  return (
    <dl>
      {summaryOf(setup).map(([term, detail]) => (
        <div key={term}>
          <dt>{term}</dt>
          <dd>{detail}</dd>
        </div>
      ))}
    </dl>
  );
}

function Cast({ review }: { readonly review: SetupReview }): JSX.Element {
  return (
    <table>
      <caption>Elenco</caption>
      <thead>
        <tr>
          <th scope="col">Personagem</th>
          <th scope="col">Posição</th>
          <th scope="col">Quem joga</th>
        </tr>
      </thead>
      <tbody>
        {review.characters.map((character) => (
          <tr key={character.id}>
            <th scope="row">{displayName(character.name, character.id)}</th>
            <td>{`(${String(character.cell.x)}, ${String(character.cell.y)})`}</td>
            <td>{character.player ? "jogador" : "motor"}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/** The review sheet of a valid setup. */
export function ReviewSheet({ setup, review, onBack }: Props): JSX.Element {
  const heading = useFocus<HTMLHeadingElement>(review, true);
  return (
    <section aria-labelledby="review-heading" className="review">
      <h2 id="review-heading" ref={heading} tabIndex={-1}>
        Ficha da cena
      </h2>
      <p role="status">{`Configuração válida. Impressão do estado: ${review.hash}.`}</p>
      <Summary setup={setup} />
      <Cast review={review} />
      <details>
        <summary>Configuração da cena (JSON)</summary>
        <pre>{JSON.stringify(setup, null, 2)}</pre>
      </details>
      <button type="button" onClick={onBack}>
        Voltar e editar
      </button>
    </section>
  );
}
