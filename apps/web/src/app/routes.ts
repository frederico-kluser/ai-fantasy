/**
 * The routes of the site (overview §6): a small hash router, so the built
 * site works from any folder the local server serves it from.
 */
import { useSyncExternalStore } from "react";

/** A screen of the site. */
export interface Route {
  readonly id: "playground" | "scene" | "sessions" | "evaluation";
  readonly hash: string;
  readonly label: string;
}

/** The screens, in the order of the navigation. */
export const ROUTES: readonly Route[] = [
  { id: "playground", hash: "#/playground", label: "Playground" },
  { id: "scene", hash: "#/scene", label: "Cena" },
  { id: "sessions", hash: "#/sessions", label: "Sessões" },
  { id: "evaluation", hash: "#/evaluation", label: "Avaliação" },
];

/** The id of a route, or `notFound`. */
export type RouteId = Route["id"] | "notFound";

const HOME_HASHES: readonly string[] = ["", "#", "#/"];

/** The route of a location hash: the playground when empty, `notFound` when unknown. */
export function routeOf(hash: string): RouteId {
  if (HOME_HASHES.includes(hash)) {
    return "playground";
  }
  return ROUTES.find((route) => route.hash === hash)?.id ?? "notFound";
}

function subscribe(onChange: () => void): () => void {
  window.addEventListener("hashchange", onChange);
  return () => {
    window.removeEventListener("hashchange", onChange);
  };
}

/** The route of the current location, updated when the hash changes. */
export function useRoute(): RouteId {
  return useSyncExternalStore(subscribe, () => routeOf(window.location.hash));
}
