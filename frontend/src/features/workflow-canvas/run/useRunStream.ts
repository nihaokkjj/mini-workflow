import { useRef } from "react";
import { useRunStore } from "../../../stores/run.store";
import { useStartRun } from "../../../queries/runs/useStartRun";
import { useCancelRun } from "../../../queries/runs/useCancelRun";
import { subscribeToJsonStream } from "../../../services/sse";
import { API_BASE_URL } from "../../../services/api";
import type { GraphEngineEvent } from "../../../types";

export function useRunStream() {
  const store = useRunStore();
  const startMutation = useStartRun();
  const cancelMutation = useCancelRun();
  const abortRef = useRef<AbortController | null>(null);

  const runWorkflow = async (
    workflowId: string,
    inputs: Record<string, unknown>
  ) => {
    store.resetRun();
    const { data } = await startMutation.mutateAsync({ workflowId, inputs });
    store.startRun(data.runId);

    abortRef.current = subscribeToJsonStream<GraphEngineEvent>(
      `${API_BASE_URL}/runs/${data.runId}/stream`,
      {
        onEvent: (event) => {
          store.addEvent(event);
          if (event.event === "node_start") {
            store.setExecutingNode(event.nodeId);
          } else if (
            event.event === "node_end" ||
            event.event === "node_skipped"
          ) {
            store.setExecutingNode(null);
          } else if (event.event === "graph_end") {
            store.setOutputs(event.outputs);
          }
        },
        onDone: () => store.finishRun(),
        onError: (err) => store.setError(err),
      }
    );
  };

  const stopRun = async (runId?: string) => {
    abortRef.current?.abort();
    abortRef.current = null;
    store.cancelRun();
    if (runId) {
      await cancelMutation.mutateAsync(runId);
    }
  };

  return { runWorkflow, stopRun };
}
