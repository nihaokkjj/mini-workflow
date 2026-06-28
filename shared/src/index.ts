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
  /** Node-specific configuration data */
  data: Record<string, unknown>;
  /** Width/height of the node in the canvas */
  width?: number;
  height?: number;
}

/** An edge connecting two nodes */
export interface EdgeConfig {
  id: string;
  source: string;
  target: string;
  /** Handle identifiers for branching nodes (e.g. 'true' | 'false' for if-else) */
  sourceHandle?: string;
  targetHandle?: string;
}

/** Complete workflow graph definition */
export interface Graph {
  nodes: NodeConfig[];
  edges: EdgeConfig[];
}

/** Start node input field definition */
export interface StartInputField {
  variable: string;
  label: string;
  type: "text-input" | "paragraph" | "number" | "select";
  required?: boolean;
  default?: string;
  options?: string[];
}

/** End node output field definition */
export interface EndOutputField {
  variable: string;
  /** Reference to a variable from an upstream node, e.g. "llm-1.text" */
  valueSelector: string;
}

// ==================== Execution Types ====================

/** Variable pool entry — all values exchanged between nodes */
export type VariableValue = string | number | boolean | object | null | VariableValue[];

/** Execution context passed to every node */
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
  | { event: "graph_end"; outputs: Record<string, unknown>; timestamp: number }
  | { event: "node_skipped"; nodeId: string; reason: string; timestamp: number }
  | { event: "error"; nodeId: string | null; error: string; timestamp: number };

// ==================== Workflow API Types ====================

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
}

// ==================== Conversation Types ====================

export interface MessageDto {
  id: string;
  conversationId: string;
  role: "user" | "assistant" | "system";
  content: string;
  nodeId?: string;
  createdAt: string;
}
