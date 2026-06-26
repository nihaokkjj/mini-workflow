import { create } from "zustand";
import type { NodeConfig, EdgeConfig, GraphEngineEvent } from "../types";
import {
  addEdge,
  applyNodeChanges,
  applyEdgeChanges,
  Connection,
  NodeChange,
  EdgeChange,
} from "@xyflow/react";

interface WorkflowState {
  nodes: NodeConfig[];
  edges: EdgeConfig[];
  appId: string | null;
  workflowId: string | null;
  executingNodeId: string | null;
  events: GraphEngineEvent[];
  isRunning: boolean;
  outputs: Record<string, unknown> | null;

  setApp: (appId: string, workflowId: string) => void;
  loadGraph: (nodes: NodeConfig[], edges: EdgeConfig[]) => void;
  onNodesChange: (changes: NodeChange[]) => void;
  onEdgesChange: (changes: EdgeChange[]) => void;
  onConnect: (connection: Connection) => void;
  setRunning: (v: boolean) => void;
  setExecutingNode: (id: string | null) => void;
  addEvent: (e: GraphEngineEvent) => void;
  clearEvents: () => void;
  setOutputs: (o: Record<string, unknown> | null) => void;
}

export const useWorkflowStore = create<WorkflowState>((set, get) => ({
  nodes: [],
  edges: [],
  appId: null,
  workflowId: null,
  executingNodeId: null,
  events: [],
  isRunning: false,
  outputs: null,

  setApp: (appId, workflowId) => set({ appId, workflowId }),

  loadGraph: (nodes, edges) => set({ nodes, edges }),

  onNodesChange: (changes) =>
    set({ nodes: applyNodeChanges(changes, get().nodes) as NodeConfig[] }),

  onEdgesChange: (changes) =>
    set({ edges: applyEdgeChanges(changes, get().edges) as EdgeConfig[] }),

  onConnect: (connection) =>
    set({ edges: addEdge(connection, get().edges) as EdgeConfig[] }),

  setRunning: (v) => set({ isRunning: v }),
  setExecutingNode: (id) => set({ executingNodeId: id }),
  addEvent: (e) => set((s) => ({ events: [...s.events, e] })),
  clearEvents: () => set({ events: [] }),
  setOutputs: (o) => set({ outputs: o }),
}));
