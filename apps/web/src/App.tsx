import { ENGINE_NAME, type RngSeeds } from "@ai-fantasy/engine";
import type { JSX } from "react";

import { EvaluationPage, NotFoundPage, ScenePage, SessionsPage } from "./app/pages.tsx";
import { ROUTES, useRoute, type RouteId } from "./app/routes.ts";
import { ThemeSelect } from "./app/ThemeSelect.tsx";
import type { EngineClient } from "./engine/client.ts";
import { PlaygroundPage } from "./playground/PlaygroundPage.tsx";

interface Props {
  /** The engine the pages ask (a Web Worker in the browser). */
  readonly engine: EngineClient;
  /** The seeds the playground starts with; random when left out. */
  readonly seeds?: RngSeeds | undefined;
}

function Page({ route, engine, seeds }: Props & { readonly route: RouteId }): JSX.Element {
  const pages: Readonly<Record<RouteId, () => JSX.Element>> = {
    playground: () => <PlaygroundPage engine={engine} seeds={seeds} />,
    scene: ScenePage,
    sessions: SessionsPage,
    evaluation: EvaluationPage,
    notFound: NotFoundPage,
  };
  return pages[route]();
}

/** The app shell (overview §6): the header, the navigation, the theme and the page of the route. */
export function App({ engine, seeds }: Props): JSX.Element {
  const route = useRoute();
  return (
    <>
      <header className="shell">
        <h1>AI Fantasy</h1>
        <p>Simulador de conversas com NPCs que simulam pessoas, movido pelo {ENGINE_NAME}.</p>
        <nav aria-label="Telas">
          <ul>
            {ROUTES.map((item) => (
              <li key={item.id}>
                <a href={item.hash} aria-current={item.id === route ? "page" : undefined}>
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
        <ThemeSelect />
      </header>
      <main>
        <Page route={route} engine={engine} seeds={seeds} />
      </main>
    </>
  );
}
