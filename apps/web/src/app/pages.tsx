/**
 * The screens that come in later tasks (overview §6): the scene (WEB-02),
 * the sessions (WEB-03) and the evaluation (EVAL-01). Skeletons for now.
 */
import type { JSX } from "react";

interface Skeleton {
  readonly title: string;
  readonly text: string;
}

function SkeletonPage({ title, text }: Skeleton): JSX.Element {
  return (
    <section aria-labelledby="page-heading">
      <h2 id="page-heading">{title}</h2>
      <p>{text}</p>
    </section>
  );
}

/** The scene screen: the grid, the lines and the controls. */
export function ScenePage(): JSX.Element {
  return (
    <SkeletonPage
      title="Cena"
      text="Em construção: aqui a cena roda a partir da ficha confirmada no playground."
    />
  );
}

/** The sessions screen: campaigns, slices, replay and export. */
export function SessionsPage(): JSX.Element {
  return (
    <SkeletonPage
      title="Sessões"
      text="Em construção: aqui ficam as campanhas, as fatias, o replay e a exportação."
    />
  );
}

/** The evaluation screen: ratings and the metrics panel. */
export function EvaluationPage(): JSX.Element {
  return (
    <SkeletonPage
      title="Avaliação"
      text="Em construção: aqui você dá notas às falas e às cenas e vê as métricas."
    />
  );
}

/** What an unknown address shows. */
export function NotFoundPage(): JSX.Element {
  return (
    <SkeletonPage
      title="Página não encontrada"
      text="Esse endereço não existe; escolha uma tela no menu."
    />
  );
}
