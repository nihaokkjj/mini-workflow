import { create } from "zustand";
import type { GraphEngineEvent } from "../types";
import { initialRunState, runReducer, type RunState } from "./run.model";

interface RunStore extends RunState {
  startRun: (runId: string) => void;
  addEvent: (e: GraphEngineEvent) => void;
  setExecutingNode: (id: string | null) => void;
  setOutputs: (o: Record<string, unknown>) => void;
  setError: (msg: string) => void;
  finishRun: () => void;
  cancelRun: () => void;
  resetRun: () => void;
}

export const useRunStore = create<RunStore>((set) => ({
  ...initialRunState,
  startRun: (runId) => set((s) => runReducer(s, { type: "start", runId })),
  addEvent: (e) => set((s) => runReducer(s, { type: "event", event: e })),
  setExecutingNode: (id) =>
    set((s) => runReducer(s, { type: "setExecutingNode", nodeId: id })),
  setOutputs: (o) =>
    set((s) => runReducer(s, { type: "setOutputs", outputs: o })),
  setError: (msg) =>
    set((s) => runReducer(s, { type: "setError", message: msg })),
  finishRun: () => set((s) => runReducer(s, { type: "finish" })),
  cancelRun: () => set((s) => runReducer(s, { type: "cancel" })),
  resetRun: () => set((s) => runReducer(s, { type: "reset" })),
}));
