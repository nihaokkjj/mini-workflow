// ==================== Node & Graph Types ====================

/** All supported node types */
export type NodeType =
  | "start"
  | "end"
  | "llm"
  | "if-else"
  | "code"
  | "http"
  | "template"
  | "iteration";

/** Configuration for a single node */
export interface NodeConfig {
  id: string;
  type: NodeType;
  title: string;
  position: { x: number; y: number };
  data: Record<string, unknown>;
  width?: number;
  height?: number;
}

/** An edge connecting two nodes */
export interface EdgeConfig {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
}

/** Complete workflow graph definition */
export interface Graph {
  nodes: NodeConfig[];
  edges: EdgeConfig[];
}

// ==================== Execution Types ====================

export interface ExecutionContext {
  tenantId: string;
  appId: string;
  workflowId: string;
  userId: string;
}

// ==================== SSE Event Types ====================

export type GraphEngineEvent =
  | { event: "node_start"; nodeId: string; nodeType: NodeType; timestamp: number }
  | { event: "node_chunk"; nodeId: string; text: string; timestamp: number }
  | { event: "node_end"; nodeId: string; outputs: Record<string, unknown>; timestamp: number }
  | { event: "node_skipped"; nodeId: string; reason: string; timestamp: number }
  | { event: "graph_end"; outputs: Record<string, unknown>; timestamp: number }
  | { event: "error"; nodeId: string | null; error: string; timestamp: number };

// ==================== DTOs ====================

export interface CreateWorkflowDto {
  appId: string;
  graph: Graph;
}

export interface RunWorkflowDto {
  workflowId: string;
  inputs: Record<string, unknown>;
}

export interface CreateAppDto {
  name: string;
  description?: string;
  mode?: "chat" | "workflow";
}

export interface CreateConversationDto {
  appId: string;
}

export interface ChatRunDto {
  workflowId: string;
  inputs: Record<string, unknown>;
}
