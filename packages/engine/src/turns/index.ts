/**
 * Public part of the turns module (overview §3.1, simulation-model §11): the
 * turn state of a slice, the urge to act, who acts (or a tick of silence, or
 * the player awaited), leaving and the end of the slice. The scene step
 * (SOC-05) composes them in the order of simulation-model §16.
 */
export { pickActor, urges, type ActorPick, type TurnInput, type Urge } from "./actor.ts";
export {
  decideDepartures,
  departureAct,
  leaveScores,
  type Departure,
  type DepartureInput,
  type LeaveScores,
} from "./departures.ts";
export { checkSliceEnd, type SliceEnd } from "./end.ts";
export {
  afterAct,
  afterSilence,
  noteReachedGoals,
  OPENING_TURNS,
  startLeaving,
  takeTurn,
  type PlayerSeat,
  type TurnState,
} from "./state.ts";
export { socialPressure, urgeToAct, type UrgeContext } from "./urge.ts";
