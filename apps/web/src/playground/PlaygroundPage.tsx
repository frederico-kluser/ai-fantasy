/**
 * The manual playground (overview §6, presets §10.1): the form, the cast
 * generated in the engine worker, and the review sheet of a setup the engine
 * accepted. Every text — names included — is rendered as text.
 */
import type { RngSeeds } from "@ai-fantasy/engine";
import { useReducer, useState, type Dispatch, type JSX } from "react";

import type { EngineAnswer, EngineClient } from "../engine/client.ts";
import type { Problem, SetupReview } from "../engine/protocol.ts";
import { BondFields } from "./BondFields.tsx";
import { CastFields } from "./CastFields.tsx";
import { GeneratedCast } from "./GeneratedCast.tsx";
import {
  castInputOf,
  formProblems,
  initialPlayground,
  sceneSetupOf,
  type PlaygroundState,
} from "./model.ts";
import { PositionFields } from "./PositionFields.tsx";
import { playgroundReducer, type PlaygroundAction } from "./reducer.ts";
import { ReviewSheet } from "./ReviewSheet.tsx";
import { SceneFields, SeedFields } from "./SceneFields.tsx";
import type { SceneSetup } from "./setup.ts";
import { randomSeed } from "./values.ts";

interface Props {
  readonly engine: EngineClient;
  /** The seeds to start with; new random seeds when left out. */
  readonly seeds?: RngSeeds | undefined;
}

interface Confirmed {
  readonly setup: SceneSetup;
  readonly review: SetupReview;
}

function startOf(seeds: RngSeeds | undefined): PlaygroundState {
  return initialPlayground(seeds ?? { castSeed: randomSeed(), sceneSeed: randomSeed() });
}

/** Runs one engine request for the form: first what the form lacks, then the engine's answer. */
function useEngineRun(state: PlaygroundState) {
  const [problems, setProblems] = useState<readonly Problem[]>([]);
  const [busy, setBusy] = useState(false);
  const run = async <T,>(ask: () => Promise<EngineAnswer<T>>, done: (value: T) => void) => {
    const missing = formProblems(state);
    setProblems(missing);
    if (missing.length > 0) {
      return;
    }
    setBusy(true);
    const answer = await ask();
    setBusy(false);
    setProblems(answer.ok ? [] : answer.error.problems);
    if (answer.ok) {
      done(answer.value);
    }
  };
  return { problems, busy, run };
}

/** What the page does with the engine: generate the cast and check the setup. */
function useEngineActions(
  engine: EngineClient,
  state: PlaygroundState,
  dispatch: Dispatch<PlaygroundAction>,
) {
  const { problems, busy, run } = useEngineRun(state);
  const [confirmed, setConfirmed] = useState<Confirmed | null>(null);
  const generate = (again: boolean) => {
    const attempt = again ? state.attempt + 1 : state.attempt;
    const input = castInputOf({ ...state, attempt });
    return run(
      () => engine.generateCast(input, state.seeds),
      (view) => {
        dispatch({ type: "generated", view, attempt, revision: state.revision });
      },
    );
  };
  const review = () => {
    const setup = sceneSetupOf(state);
    return run(
      () => engine.checkSetup(setup),
      (value) => {
        setConfirmed({ setup, review: value });
      },
    );
  };
  const back = () => {
    setConfirmed(null);
  };
  return { problems, busy, confirmed, generate, review, back };
}

function Problems({ problems }: { readonly problems: readonly Problem[] }): JSX.Element | null {
  if (problems.length === 0) {
    return null;
  }
  return (
    <div role="alert" className="problems">
      <p>Revise a ficha:</p>
      <ul>
        {problems.map((problem, index) => (
          <li key={index}>{problem.message}</li>
        ))}
      </ul>
    </div>
  );
}

function GenerateButton(props: {
  readonly generated: boolean;
  readonly busy: boolean;
  readonly onGenerate: (again: boolean) => void;
}): JSX.Element {
  return (
    <button
      type="button"
      disabled={props.busy}
      onClick={() => {
        props.onGenerate(props.generated);
      }}
    >
      {props.generated ? "Sortear de novo" : "Gerar elenco"}
    </button>
  );
}

/** The playground page: the manual form, then the review sheet. */
export function PlaygroundPage({ engine, seeds }: Props): JSX.Element {
  const [state, dispatch] = useReducer(playgroundReducer, seeds, startOf);
  const actions = useEngineActions(engine, state, dispatch);
  if (actions.confirmed !== null) {
    return <ReviewSheet {...actions.confirmed} onBack={actions.back} />;
  }
  return (
    <form
      aria-labelledby="playground-heading"
      onSubmit={(event) => {
        event.preventDefault();
        void actions.review();
      }}
    >
      <h2 id="playground-heading">Playground manual</h2>
      <SeedFields state={state} dispatch={dispatch} />
      <SceneFields state={state} dispatch={dispatch} />
      <CastFields state={state} dispatch={dispatch} />
      <BondFields state={state} dispatch={dispatch} />
      <GenerateButton
        generated={state.generated !== null}
        busy={actions.busy}
        onGenerate={(again) => void actions.generate(again)}
      />
      <GeneratedCast state={state} dispatch={dispatch} />
      <PositionFields state={state} dispatch={dispatch} />
      <Problems problems={actions.problems} />
      <p role="status">{actions.busy ? "O motor está trabalhando…" : ""}</p>
      <button type="submit" disabled={actions.busy}>
        Revisar ficha
      </button>
    </form>
  );
}
