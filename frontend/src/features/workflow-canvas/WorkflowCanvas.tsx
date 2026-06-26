import { useCallback, useRef, useState } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  ReactFlowProvider,
  type Connection,
  type Node,
  type NodeChange,
  type EdgeChange,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import StartNodeComponent from "./nodes/StartNodeComponent";
import EndNodeComponent from "./nodes/EndNodeComponent";
import LLMNodeComponent from "./nodes/LLMNodeComponent";
import { NodePalette } from "./palette/NodePalette";
import { useWorkflowStore } from "../../stores/workflow.store";
import { saveWorkflow, startRun, subscribeToRunStream } from "../../services/api";
import type { NodeType, GraphEngineEvent } from "../../types";

const nodeTypes = {
  start: StartNodeComponent,
  end: EndNodeComponent,
  llm: LLMNodeComponent,
};

let nodeIdCounter = 0;
function nextId(type: NodeType) {
  nodeIdCounter++;
  return `${type}-${nodeIdCounter}`;
}

function WorkflowCanvasInner() {
  const store = useWorkflowStore();
  const [rfNodes, setRfNodes, onNodesChangeRf] = useNodesState([]);
  const [rfEdges, setRfEdges, onEdgesChangeRf] = useEdgesState([]);
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [reactFlowInstance, setReactFlowInstance] = useState<any>(null);
  const [output, setOutput] = useState("");

  const onConnect = useCallback(
    (conn: Connection) => {
      store.onConnect(conn);
      setRfEdges((eds) => [...eds, { ...conn, id: `edge-${Date.now()}` } as any]);
    },
    [store, setRfEdges],
  );

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => {
      onNodesChangeRf(changes);
      store.onNodesChange(changes);
    },
    [store, onNodesChangeRf],
  );

  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      onEdgesChangeRf(changes);
      store.onEdgesChange(changes);
    },
    [store, onEdgesChangeRf],
  );

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      const type = event.dataTransfer.getData("application/reactflow-type") as NodeType;
      if (!type) return;

      const position = reactFlowInstance?.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      }) ?? { x: 0, y: 0 };

      const newNode: Node = {
        id: nextId(type),
        type,
        position,
        data: { model: "gpt-4o-mini" },
      };

      setRfNodes((nds) => [...nds, newNode]);
      store.loadGraph(
        store.nodes.concat({
          id: newNode.id,
          type,
          title: type.charAt(0).toUpperCase() + type.slice(1),
          position,
          data: {},
        }),
        store.edges,
      );
    },
    [reactFlowInstance, setRfNodes, store],
  );

  const handleSave = async () => {
    if (!store.appId) return;
    try {
      await saveWorkflow(store.appId, {
        nodes: store.nodes.map((n) => ({
          id: n.id,
          type: n.type,
          title: n.type,
          position: n.position,
          data: n.data ?? {},
        })),
        edges: store.edges,
      }));
      alert("Workflow saved!");
    } catch {
      alert("Save failed.");
    }
  };

  const handleRun = async () => {
    if (!store.workflowId) return;
    store.setRunning(true);
    store.clearEvents();
    setOutput("");

    try {
      const { data: runData } = await startRun(store.workflowId, { input: "Hello" });

      subscribeToRunStream(
        runData.runId,
        (event: GraphEngineEvent) => {
          store.addEvent(event);
          if (event.event === "node_start") {
            store.setExecutingNode(event.nodeId);
          } else if (event.event === "node_chunk") {
            setOutput((prev) => prev + event.text);
          } else if (event.event === "node_end") {
            store.setExecutingNode(null);
          } else if (event.event === "graph_end") {
            setOutput(JSON.stringify(event.outputs, null, 2));
            store.setRunning(false);
          } else if (event.event === "error") {
            setOutput(`Error: ${event.error}`);
            store.setRunning(false);
          }
        },
        () => store.setRunning(false),
        (err) => {
          setOutput(`Error: ${err}`);
          store.setRunning(false);
        },
      );
    } catch (err: any) {
      setOutput(`Error: ${err.message}`);
      store.setRunning(false);
    }
  };

  // Sync ReactFlow state to Zustand
  const onInit = useCallback(
    (_instance: any) => {
      setReactFlowInstance(_instance);
    },
    [],
  );

  return (
    <div className="flex h-full">
      <NodePalette />
      <div className="flex-1 flex flex-col">
        {/* Toolbar */}
        <div className="h-12 bg-white border-b border-slate-200 flex items-center px-4 gap-3">
          <button
            onClick={handleSave}
            className="px-4 py-1.5 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700"
          >
            Save
          </button>
          <button
            onClick={handleRun}
            disabled={store.isRunning}
            className="px-4 py-1.5 bg-green-600 text-white text-sm rounded-md hover:bg-green-700 disabled:opacity-50"
          >
            {store.isRunning ? "Running..." : "Run"}
          </button>
          {store.executingNodeId && (
            <span className="text-sm text-slate-500">
              Executing: <span className="font-mono text-orange-600">{store.executingNodeId}</span>
            </span>
          )}
        </div>

        {/* Canvas */}
        <div ref={reactFlowWrapper} className="flex-1" onDragOver={onDragOver} onDrop={onDrop}>
          <ReactFlow
            nodes={rfNodes}
            edges={rfEdges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onInit={onInit}
            nodeTypes={nodeTypes}
            fitView
          >
            <Background />
            <Controls />
            <MiniMap />
          </ReactFlow>
        </div>

        {/* Output panel */}
        {output && (
          <div className="h-40 bg-slate-900 text-green-400 font-mono text-sm p-4 overflow-auto border-t border-slate-700">
            <pre className="whitespace-pre-wrap">{output}</pre>
          </div>
        )}
      </div>
    </div>
  );
}

export function WorkflowCanvas() {
  return (
    <ReactFlowProvider>
      <WorkflowCanvasInner />
    </ReactFlowProvider>
  );
}
