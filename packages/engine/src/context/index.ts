/**
 * Public part of the context module (overview §3.1, simulation-model §3.2, §5.7
 * and §6): the scene at each tick (phase, light, sight, noise, present tags),
 * the thermal target of a cell, and the threat and presence rules.
 */
export {
  presentTags,
  sceneNoise,
  thermalTarget,
  tickContext,
  type SceneContext,
  type ScenePlace,
  type SceneWeather,
  type TickContext,
} from "./scene.ts";
export {
  presenceThreat,
  proximity,
  threatLevel,
  type PresenceView,
  type ThreatInput,
} from "./threat.ts";
export {
  awareness,
  characterThreat,
  presenceView,
  proximityOf,
  threatAmong,
  type Awareness,
} from "./presence.ts";
