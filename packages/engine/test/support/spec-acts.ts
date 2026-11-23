/**
 * The catalogs of dialogue-acts.md (§2 to §4) read from the document, in the
 * shape of the parsed preset catalogs. Test support for
 * `src/presets/spec.test.ts`.
 */
import {
  cell,
  code,
  codes,
  integer,
  list,
  lookup,
  plain,
  tableOf,
  yesNo,
  type SpecName,
} from "./spec-markdown.ts";

const ACTS: SpecName = "dialogue-acts";
const SPEECH = "### 2.1 Atos de fala";
const SILENT = "### 2.2 Atos sem fala";
const TOPICS = "## 4. Tópicos e objetos";

/** §4: the topic types, with the meaning as display name (code marks removed). */
export function specTopicTypes() {
  return tableOf(ACTS, TOPICS).rows.map((row) => ({
    id: code(cell(row, 0)),
    name: plain(cell(row, 1)),
  }));
}

/** §4: the objects of REQUEST and OFFER with the drives of who receives and who gives. */
export function specRequestObjects() {
  return tableOf(ACTS, TOPICS, 2).rows.map((row) => ({
    id: code(cell(row, 0)),
    name: cell(row, 1),
    receiverDrive: code(cell(row, 2)),
    giverDrive: code(cell(row, 3)),
  }));
}

const CONFUSIONS = { pior: "WORSE", melhor: "BETTER" } as const;

/** §3: the tones with their base ambiguity and typical confusions (in order). */
export function specTones() {
  return tableOf(ACTS, "## 3. Tons").rows.map((row) => ({
    id: code(cell(row, 0)),
    name: cell(row, 1),
    ambiguity: integer(cell(row, 3)),
    confusions: list(cell(row, 4)).map((item) => ({
      tone: code(item),
      kind: lookup(CONFUSIONS, /\((\w+)\)/.exec(item)?.[1] ?? ""),
    })),
  }));
}

function topicsOf(text: string, topicIds: readonly string[]): string[] | "ANSWERED" {
  if (text === "o tópico do ato respondido") {
    return "ANSWERED";
  }
  if (text.startsWith("todos, menos ")) {
    const excluded = codes(text.split(" (")[0] ?? "");
    return topicIds.filter((id) => !excluded.includes(id));
  }
  return codes(text).filter((id) => topicIds.includes(id));
}

/** §4: act → accepted topic types (or "ANSWERED": the topic of the act answered). */
function acceptedTopics(): Map<string, string[] | "ANSWERED"> {
  const topicIds = specTopicTypes().map((entry) => entry.id);
  const silentActs = tableOf(ACTS, SILENT).rows.map((row) => code(cell(row, 0)));
  const entries = tableOf(ACTS, TOPICS, 1).rows.flatMap((row) => {
    const acts = cell(row, 0) === "atos sem fala" ? silentActs : codes(cell(row, 0));
    const accepted = topicsOf(cell(row, 1), topicIds);
    return acts.map((act): [string, string[] | "ANSWERED"] => [act, accepted]);
  });
  return new Map(entries);
}

function ticksOf(text: string): { ticks: number; secretTicks?: number } {
  const ticks = integer(text.split(" ")[0] ?? "");
  const secret = /\((\d+) se `SECRET`\)/.exec(text);
  return secret === null ? { ticks } : { ticks, secretTicks: integer(secret[1] ?? "") };
}

/** §2 and §4: the 20 acts, speech acts first, with ticks, obligation, request mark and topics. */
export function specActs() {
  const topics = acceptedTopics();
  const speech = tableOf(ACTS, SPEECH).rows.map((row) => {
    const id = code(cell(row, 0));
    const effect = cell(row, 3);
    return {
      id,
      name: cell(row, 1),
      speech: true,
      ...ticksOf(cell(row, 2)),
      createsObligation: yesNo(cell(row, 4)),
      request: effect.includes("**pedido**"),
      topics: topics.get(id),
    };
  });
  const silent = tableOf(ACTS, SILENT).rows.map((row) => {
    const id = code(cell(row, 0));
    return {
      id,
      name: cell(row, 1),
      speech: false,
      ...ticksOf(cell(row, 2)),
      createsObligation: false,
      request: false,
      topics: topics.get(id),
    };
  });
  return [...speech, ...silent];
}
