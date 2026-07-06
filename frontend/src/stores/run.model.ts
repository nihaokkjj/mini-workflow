import type { GraphEngineEvent } from "../types";

export interface RunState {
  isRunning: boolean;
  currentRunId: string | null;
  executingNodeId: string | null;
  events: GraphEngineEvent[];
  outputs: Record<string, unknown> | null;
  error: string | null;
}

export const initialRunState: RunState = {
  isRunning: false,
  currentRunId: null,
  executingNodeId: null,
  events: [],
  outputs: null,
  error: null,
};

export type RunAction =
  | { type: "start"; runId: string }
  | { type: "event"; event: GraphEngineEvent }
  | { type: "setExecutingNode"; nodeId: string | null }
  | { type: "setOutputs"; outputs: Record<string, unknown> }
  | { type: "setError"; message: string }
  | { type: "finish" }
  | { type: "cancel" }
  | { type: "reset" };

export function runReducer(state: RunState, action: RunAction): RunState {
  switch (action.type) {
    case "start":
      return {
        ...initialRunState,
        isRunning: true,
        currentRunId: action.runId,
      };
    case "event":
      return { ...state, events: [...state.events, action.event] };
    case "setExecutingNode":
      return { ...state, executingNodeId: action.nodeId };
    case "setOutputs":
      return { ...state, outputs: action.outputs };
    case "setError":
      return { ...state, isRunning: false, error: action.message };
    case "finish":
      return { ...state, isRunning: false, executingNodeId: null };
    case "cancel":
      return { ...state, isRunning: false, executingNodeId: null };
    case "reset":
      return initialRunState;
    default:
      return state;
  }
}
