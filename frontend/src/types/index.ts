// Mirrors backend types for frontend consumption

export type NodeType = "start" | "end" | "llm" | "if-else" | "code" | "http" | "template" | "iteration";

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

export interface WorkflowDto {
  id: string;
  appId: string;
  graph: Graph;
}

export interface RunDto {
  runId: string;
}

export type GraphEngineEvent =
  | { event: "node_start"; nodeId: string; nodeType: NodeType; timestamp: number }
  | { event: "node_chunk"; nodeId: string; text: string; timestamp: number }
  | { event: "node_end"; nodeId: string; outputs: Record<string, unknown>; timestamp: number }
  | { event: "graph_end"; outputs: Record<string, unknown>; timestamp: number }
  | { event: "node_skipped"; nodeId: string; reason: string; timestamp: number }
  | { event: "error"; nodeId: string | null; error: string; timestamp: number };
