import { ENGINE_NAME } from "@ai-fantasy/engine";
import type { JSX } from "react";

/** Start page of the site. WEB-01 replaces it with the app shell and its routes. */
export function App(): JSX.Element {
  return (
    <main>
      <h1>AI Fantasy</h1>
      <p>Simulador de conversas com NPCs que simulam pessoas, movido pelo {ENGINE_NAME}.</p>
    </main>
  );
}
