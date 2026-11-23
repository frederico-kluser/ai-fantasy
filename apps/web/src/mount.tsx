import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import type { Root } from "react-dom/client";

import { App } from "./App.tsx";

/**
 * Renders the site into `container`.
 *
 * @throws Error when `container` is missing: `index.html` must have `#root`.
 */
export function mountApp(container: Element | null): Root {
  if (container === null) {
    throw new Error(
      'Erro: elemento #root ausente — Solução: restaure <div id="root"></div> em apps/web/index.html.',
    );
  }
  const root = createRoot(container);
  root.render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
  return root;
}
