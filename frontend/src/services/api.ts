import axios from "axios";
import type {
  AppDatasetBindingDto,
  AppDto,
  ConversationDto,
  DatasetDto,
  Graph,
  GraphEngineEvent,
  MessageDto,
  ModelDto,
  RetrieveRequestDto,
  RetrievalResultDto,
  RunDto,
  WorkflowDto,
} from "../types";
import { subscribeToJsonStream } from "./sse";

// Keep the local default for development while allowing Vercel to point at the Render API.
export const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3001/api"
).replace(/\/$/, "");

const api = axios.create({ baseURL: API_BASE_URL });

// Apps
export const createApp = (
  name: string,
  mode: "chat" | "workflow" = "workflow"
) => api.post<AppDto>("/apps", { name, mode });
export const listApps = () => api.get<AppDto[]>("/apps");
export const getApp = (id: string) => api.get<AppDto>(`/apps/${id}`);
export const deleteApp = (id: string) => api.delete(`/apps/${id}`);

// Workflows
export const saveWorkflow = (appId: string, graph: Graph) =>
  api.put<WorkflowDto>(`/workflows/by-app/${appId}`, { graph });
export const getWorkflowByApp = (appId: string) =>
  api.get<WorkflowDto | null>(`/workflows/by-app/${appId}`);

// Runs
export const startRun = (workflowId: string, inputs: Record<string, unknown>) =>
  api.post<RunDto>("/runs", { workflowId, inputs });

export const cancelRun = (runId: string) =>
  api.post<{ canceled: boolean }>(`/runs/${runId}/cancel`);

/** Subscribe to SSE stream for a run, calling onEvent for each event */
export function subscribeToRunStream(
  runId: string,
  onEvent: (event: GraphEngineEvent) => void,
  onDone: () => void,
  onError: (err: string) => void
): AbortController {
  return subscribeToJsonStream<GraphEngineEvent>(
    `${API_BASE_URL}/runs/${runId}/stream`,
    { onEvent, onDone, onError }
  );
}

// Models
export const listModels = () => api.get<ModelDto[]>("/models");

// RAG
export const listDatasets = () => api.get<DatasetDto[]>("/rag/datasets");
export const listAppDatasets = (appId: string) =>
  api.get<AppDatasetBindingDto[]>(`/apps/${appId}/datasets`);
export const debugRetrieve = (input: RetrieveRequestDto) =>
  api.post<RetrievalResultDto>("/rag/retrieve", input);
export const bindAppDataset = (appId: string, datasetId: string) =>
  api.post<AppDatasetBindingDto>(`/apps/${appId}/datasets/${datasetId}`);
export const unbindAppDataset = (appId: string, datasetId: string) =>
  api.delete(`/apps/${appId}/datasets/${datasetId}`);

// Conversations
export const createConversation = (appId: string) =>
  api.post<ConversationDto>("/conversations", { appId });

export const listConversations = (appId: string) =>
  api.get<ConversationDto[]>(`/conversations?appId=${appId}`);

export const getMessages = (conversationId: string) =>
  api.get<MessageDto[]>(`/conversations/${conversationId}/messages`);

export const deleteConversation = (id: string) =>
  api.delete(`/conversations/${id}`);

export function startChatRun(
  conversationId: string,
  workflowId: string,
  inputs: Record<string, unknown>,
  onEvent: (event: GraphEngineEvent) => void,
  onDone: () => void,
  onError: (err: string) => void
): AbortController {
  return subscribeToJsonStream<GraphEngineEvent>(
    `${API_BASE_URL}/conversations/${conversationId}/runs`,
    { onEvent, onDone, onError },
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ workflowId, inputs }),
    }
  );
}
