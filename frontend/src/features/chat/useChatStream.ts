import { useRef } from "react";
import { useRunStore } from "../../stores/run.store";
import { subscribeToJsonStream } from "../../services/sse";
import { API_BASE_URL } from "../../services/api";
import { useCancelRun } from "../../queries/runs/useCancelRun";
import type { GraphEngineEvent } from "../../types";

interface ChatRunOptions {
  onChunk?: (text: string) => void;
  onError?: (message: string) => void;
  onDone?: () => void;
}

export function useChatStream() {
  const store = useRunStore();
  const cancelMutation = useCancelRun();
  const abortRef = useRef<AbortController | null>(null);
  const runIdRef = useRef<string | null>(null);

  const run = async (
    conversationId: string,
    workflowId: string,
    inputs: Record<string, unknown>,
    options?: ChatRunOptions
  ) => {
    store.resetRun();
    runIdRef.current = null;
    abortRef.current = subscribeToJsonStream<GraphEngineEvent>(
      `${API_BASE_URL}/conversations/${conversationId}/runs`,
      {
        onEvent: (event) => {
          store.addEvent(event);
          if (event.event === "run_started") {
            runIdRef.current = event.runId;
            store.startRun(event.runId);
          } else if (event.event === "node_chunk") {
            options?.onChunk?.(event.text);
          } else if (event.event === "node_start") {
            store.setExecutingNode(event.nodeId);
          } else if (
            event.event === "node_end" ||
            event.event === "node_skipped"
          ) {
            store.setExecutingNode(null);
          } else if (event.event === "graph_end") {
            store.setOutputs(event.outputs);
          } else if (event.event === "error") {
            options?.onError?.(event.message);
          }
        },
        onDone: () => {
          store.finishRun();
          options?.onDone?.();
        },
        onError: (err) => store.setError(err),
      },
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workflowId, inputs }),
      }
    );
  };

  const stop = async () => {
    const runId = runIdRef.current;
    abortRef.current?.abort();
    abortRef.current = null;
    store.cancelRun();
    runIdRef.current = null;
    if (runId) {
      await cancelMutation.mutateAsync(runId);
    }
  };

  return { run, stop };
}
