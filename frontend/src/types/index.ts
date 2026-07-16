// Mirrors backend types for frontend consumption

export type NodeType =
  | "start"
  | "end"
  | "llm"
  | "if-else"
  | "code"
  | "http"
  | "template"
  | "iteration"
  | "knowledge-retrieval";

export interface NodeConfig {
  id: string;
  type: NodeType;
  title: string;
  position: { x: number; y: number };
  data: Record<string, unknown>;
  width?: number;
  height?: number;
}

export interface EdgeConfig {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
}

export interface Graph {
  nodes: NodeConfig[];
  edges: EdgeConfig[];
}

export interface AppDto {
  id: string;
  name: string;
  description?: string;
  mode: "chat" | "workflow";
  createdAt: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface WorkflowDto {
  id: string;
  appId: string;
  graph: Graph;
}

export interface RunDto {
  runId: string;
}

export interface ConversationDto {
  id: string;
  appId: string;
  createdAt: string;
}

export interface MessageDto {
  id: string;
  conversationId: string;
  role: "user" | "assistant" | "system";
  content: string;
  nodeId?: string;
  createdAt: string;
}

export interface ModelDto {
  id: string;
  name: string;
}

export interface DatasetDto {
  id: string;
  name: string;
  description?: string | null;
  status: "active" | "indexing" | "error" | "archived";
  retrievalMode: "keyword" | "semantic" | "hybrid";
  indexingMode: "economy" | "high_quality";
  chunkSize: number;
  chunkOverlap: number;
  topK: number;
  scoreThreshold: number;
  createdAt: string;
  updatedAt: string;
}

export interface AppDatasetBindingDto {
  id: string;
  appId: string;
  datasetId: string;
  createdAt: string;
  dataset: DatasetDto;
}

export interface RetrievalHitDto {
  segmentId: string;
  score: number;
}

export interface RetrievalDroppedHitDto extends RetrievalHitDto {
  reason: "score_below_threshold";
}

export interface RetrievalSourceDto {
  title: string;
  content: string;
  datasetId: string;
  datasetName: string;
  documentId: string;
  documentName: string;
  segmentId: string;
  score: number;
  position: number;
  metadata?: Record<string, unknown>;
}

export interface RetrievalPlanDto {
  retrievalMode: "keyword" | "semantic" | "hybrid";
  topK: number;
  scoreThreshold: number;
  candidateK: number;
  contextBudgetTokens: number;
  enableQueryRewrite: boolean;
}

export interface RetrievalTraceDto {
  requestedDatasetIds: string[];
  availableDatasetIds: string[];
  selectedDatasetIds: string[];
  usedExplicitSelection: boolean;
  plan: RetrievalPlanDto;
  rawHits: RetrievalHitDto[];
  filteredHits: RetrievalHitDto[];
  droppedHits: RetrievalDroppedHitDto[];
}

export interface RetrievalResultDto {
  query: string;
  context: string;
  sourceCount: number;
  sources: RetrievalSourceDto[];
  hits: RetrievalHitDto[];
  trace: RetrievalTraceDto;
}

export interface RetrieveRequestDto {
  appId: string;
  query: string;
  datasetIds?: string[];
  topK?: number;
  scoreThreshold?: number;
  retrievalMode?: "keyword" | "semantic" | "hybrid";
}

export type GraphEngineEvent =
  | { event: "run_started"; runId: string; timestamp: number }
  | {
      event: "node_start";
      nodeId: string;
      nodeType: NodeType;
      timestamp: number;
    }
  | { event: "node_chunk"; nodeId: string; text: string; timestamp: number }
  | {
      event: "node_end";
      nodeId: string;
      outputs: Record<string, unknown>;
      timestamp: number;
    }
  | { event: "graph_end"; outputs: Record<string, unknown>; timestamp: number }
  | { event: "node_skipped"; nodeId: string; reason: string; timestamp: number }
  | {
      event: "error";
      nodeId: string | null;
      nodeType: NodeType | null;
      message: string;
      timestamp: number;
    };

export interface DatasetDocumentDto {
  id: string;
  datasetId: string;
  name: string;
  sourceType: "text" | "markdown" | "file";
  sourceUri: string | null;
  content: string;
  status: "pending" | "indexing" | "completed" | "failed";
  errorMessage: string | null;
  docHash: string;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateDatasetDto {
  name: string;
  description?: string;
  retrievalMode?: "keyword" | "semantic" | "hybrid";
  indexingMode?: "economy" | "high_quality";
  chunkSize?: number;
  chunkOverlap?: number;
  topK?: number;
  scoreThreshold?: number;
}
