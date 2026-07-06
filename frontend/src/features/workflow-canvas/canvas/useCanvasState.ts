import { useCallback } from "react";
import {
  useNodesState,
  useEdgesState,
  addEdge,
  type Connection,
  type NodeChange,
  type EdgeChange,
} from "@xyflow/react";
import { useCanvasStore } from "../../../stores/canvas.store";
import type { NodeConfig, EdgeConfig, Graph, NodeType } from "../../../types";
import { useNodeIds } from "./useNodeIds";

export function useCanvasState() {
  const [nodes, setNodes, onNodesChangeRf] = useNodesState<NodeConfig>([]);
  const [edges, setEdges, onEdgesChangeRf] = useEdgesState<EdgeConfig>([]);
  const { nextId, syncCounter } = useNodeIds();
  const { selectNode } = useCanvasStore();

  const loadGraph = useCallback(
    (graph: Graph) => {
      setNodes(graph.nodes);
      setEdges(graph.edges);
      syncCounter(graph.nodes);
    },
    [setNodes, setEdges, syncCounter]
  );

  const getGraph = useCallback(
    (): Graph => ({
      nodes: nodes.map((n) => ({
        id: n.id,
        type: n.type,
        title: n.title || n.type,
        position: n.position,
        data: n.data ?? {},
        width: n.width,
        height: n.height,
      })),
      edges,
    }),
    [nodes, edges]
  );

  const updateNodeData = useCallback(
    (id: string, data: Record<string, unknown>) => {
      setNodes((nds) =>
        nds.map((n) =>
          n.id === id ? { ...n, data: { ...n.data, ...data } } : n
        )
      );
    },
    [setNodes]
  );

  const addNode = useCallback(
    (type: NodeType, position: { x: number; y: number }) => {
      const newNode: NodeConfig = {
        id: nextId(type),
        type,
        title: type.charAt(0).toUpperCase() + type.slice(1),
        position,
        data: {},
      };
      setNodes((nds) => [...nds, newNode]);
      return newNode;
    },
    [nextId, setNodes]
  );

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => {
      onNodesChangeRf(changes);
    },
    [onNodesChangeRf]
  );

  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      onEdgesChangeRf(changes);
    },
    [onEdgesChangeRf]
  );

  const onConnect = useCallback(
    (connection: Connection) => {
      setEdges((eds) => addEdge(connection, eds) as EdgeConfig[]);
    },
    [setEdges]
  );

  return {
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    onConnect,
    loadGraph,
    getGraph,
    updateNodeData,
    addNode,
    selectNode,
  };
}
