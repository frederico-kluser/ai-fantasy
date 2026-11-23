/**
 * Public part of the memory module (overview §3.1, simulation-model §12): the
 * data model of facts and copies, with the initial fidelity, retelling and the
 * importance of a fact, and the recording of an act as a fact with copies.
 */
export { historyOffenders, type ActFact, type Fact, type HistoryFact } from "./fact.ts";
export {
  createCopy,
  factImportance,
  historyCopy,
  initialFidelity,
  INVOLVED_IMPORTANCE,
  isLasting,
  retell,
  type CopySource,
  type FactCopy,
  type ImportanceInput,
  type Perspective,
} from "./copy.ts";
export {
  addressees,
  involvedIn,
  neutralImportance,
  nextFactId,
  recordAct,
  withCopy,
  type CharacterImportance,
  type RecordAppraisal,
  type RecordInput,
  type Recorded,
} from "./record.ts";
