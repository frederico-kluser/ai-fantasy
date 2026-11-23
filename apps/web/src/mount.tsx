import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import type { Root } from "react-dom/client";

import { App } from "./App.tsx";
import type { EngineClient } from "./engine/client.ts";
import { createEngine } from "./engine/create.ts";

/**
 * Renders the site into `container`, with the engine in a Web Worker by default.
 *
 * @throws Error when `container` is missing: `index.html` must have `#root`.
 */
export function mountApp(container: Element | null, engine: EngineClient = createEngine()): Root {
  if (container === null) {
    throw new Error(
      'Erro: elemento #root ausente — Solução: restaure <div id="root"></div> em apps/web/index.html.',
    );
  }
  const root = createRoot(container);
  root.render(
    <StrictMode>
      <App engine={engine} />
    </StrictMode>,
  );
  return root;
}
