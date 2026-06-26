import axios from "axios";
import type { AppDto, WorkflowDto, Graph, RunDto, GraphEngineEvent } from "../types";

const api = axios.create({ baseURL: "http://localhost:3001/api" });

// Apps
export const createApp = (name: string) => api.post<AppDto>("/apps", { name });
export const listApps = () => api.get<AppDto[]>("/apps");
export const getApp = (id: string) => api.get<AppDto>(`/apps/${id}`);
export const deleteApp = (id: string) => api.delete(`/apps/${id}`);

// Workflows
export const saveWorkflow = (appId: string, graph: Graph) =>
  api.put<WorkflowDto>(`/workflows/by-app/${appId}`, { graph });
export const getWorkflowByApp = (appId: string) =>
  api.get<WorkflowDto>(`/workflows/by-app/${appId}`);

// Runs
export const startRun = (workflowId: string, inputs: Record<string, unknown>) =>
  api.post<RunDto>("/runs", { workflowId, inputs });

/** Subscribe to SSE stream for a run, calling onEvent for each event */
export function subscribeToRunStream(
  runId: string,
  onEvent: (event: GraphEngineEvent) => void,
  onDone: () => void,
  onError: (err: string) => void,
): AbortController {
  const controller = new AbortController();

  fetch(`http://localhost:3001/api/runs/${runId}/stream`, {
    signal: controller.signal,
  })
    .then(async (response) => {
      if (!response.ok || !response.body) {
        onError(`HTTP ${response.status}`);
        return;
      }
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        // Parse SSE lines
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const event: GraphEngineEvent = JSON.parse(line.slice(6));
              onEvent(event);
              if (event.event === "graph_end" || event.event === "error") {
                onDone();
                return;
              }
            } catch {
              // Skip unparseable lines
            }
          }
        }
      }
      onDone();
    })
    .catch((err) => {
      if ((err as Error).name !== "AbortError") {
        onError((err as Error).message);
      }
    });

  return controller;
}
