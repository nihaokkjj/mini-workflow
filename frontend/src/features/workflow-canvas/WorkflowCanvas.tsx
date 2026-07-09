import { useCallback, useEffect, useRef, useState } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  ReactFlowProvider,
  type Node,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import { NodePalette } from "./palette/NodePalette";
import { NodeConfigPanel } from "./NodeConfigPanel";
import { WorkflowRunResultsPanel } from "./WorkflowRunResultsPanel";
import { useRunStore } from "../../stores/run.store";
import { useCanvasStore } from "../../stores/canvas.store";
import { useCanvasState } from "./canvas/useCanvasState";
import { useRunStream } from "./run/useRunStream";
import { nodeTypes } from "./canvas/nodeTypes";
import { saveWorkflow } from "../../services/api";
import type { NodeType, Graph, AppDatasetBindingDto } from "../../types";

interface WorkflowCanvasInnerProps {
  appId: string;
  workflowId: string | null;
  initialGraph: Graph | null;
  appDatasets: AppDatasetBindingDto[];
}

function WorkflowCanvasInner({
  appId,
  workflowId,
  initialGraph,
  appDatasets,
}: WorkflowCanvasInnerProps) {
  const canvas = useCanvasState();
  const { selectedNodeId, isConfigPanelOpen, closeConfigPanel } =
    useCanvasStore();
  const run = useRunStream();
  const runState = useRunStore();
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [reactFlowInstance, setReactFlowInstance] = useState<any>(null);
  const [toast, setToast] = useState<{
    tone: "success" | "error" | "info";
    text: string;
  } | null>(null);

  const showToast = useCallback(
    (tone: "success" | "error" | "info", text: string) => {
      setToast({ tone, text });
      window.setTimeout(() => setToast(null), 2600);
    },
    []
  );

  useEffect(() => {
    if (initialGraph) {
      canvas.loadGraph(initialGraph);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialGraph]);

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      const type = event.dataTransfer.getData(
        "application/reactflow-type"
      ) as NodeType;
      if (!type) return;

      const position = reactFlowInstance?.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      }) ?? { x: 0, y: 0 };

      canvas.addNode(type, position);
    },
    [reactFlowInstance, canvas]
  );

  const onNodeClick = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      canvas.selectNode(node.id);
    },
    [canvas]
  );

  const onCanvasClick = useCallback(() => {
    canvas.selectNode(null);
  }, [canvas]);

  const handleSave = async () => {
    try {
      await saveWorkflow(appId, canvas.getGraph());
      showToast("success", "Workflow saved");
    } catch {
      showToast("error", "Save failed");
    }
  };

  const handleRun = async () => {
    if (!workflowId) return;
    await run.runWorkflow(workflowId, { input: "Hello" });
  };

  const handleStop = () => {
    run.stopRun(runState.currentRunId ?? undefined);
  };

  const onInit = useCallback((_instance: any) => {
    setReactFlowInstance(_instance);
  }, []);

  const highlightedNodes = canvas.nodes.map((node) => {
    if (node.id === runState.executingNodeId) {
      return { ...node, className: "executing" };
    }
    return node;
  });

  return (
    <div className="flex h-full">
      <NodePalette />
      <div className="flex flex-1 flex-col">
        {/* Toolbar */}
        <div className="flex h-12 items-center gap-3 border-b border-violet-200/80 bg-white/70 px-4 backdrop-blur">
          <button
            onClick={handleSave}
            className="rounded-lg px-4 py-1.5 text-sm font-medium text-white transition hover:brightness-110"
            style={{
              background: "linear-gradient(135deg, #a068ff 0%, #42dcdb 100%)",
            }}
          >
            Save
          </button>
          <button
            onClick={handleRun}
            disabled={runState.isRunning}
            className="rounded-lg bg-node-code px-4 py-1.5 text-sm font-medium text-white transition hover:brightness-110 disabled:opacity-50"
          >
            {runState.isRunning ? "Running..." : "Run"}
          </button>
          {runState.isRunning && (
            <button
              onClick={handleStop}
              className="rounded-lg bg-node-end px-4 py-1.5 text-sm font-medium text-white transition hover:brightness-110"
            >
              Stop
            </button>
          )}
          {runState.executingNodeId && (
            <span className="text-sm text-[#6b5a8b]">
              Executing:{" "}
              <span className="font-mono text-node-llm">
                {runState.executingNodeId}
              </span>
            </span>
          )}
        </div>

        {/* Canvas */}
        <div
          ref={reactFlowWrapper}
          className="relative flex-1"
          onDragOver={onDragOver}
          onDrop={onDrop}
        >
          {canvas.nodes.length === 0 && (
            <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
              <div className="rounded-xl border border-dashed border-violet-200 bg-white/85 px-5 py-4 text-center backdrop-blur">
                <div className="text-sm font-medium text-[#2f2147]">
                  Drag nodes from the left panel
                </div>
                <div className="mt-1 text-xs text-[#7b6b9d]">
                  Start with Start, add work nodes, then connect to End.
                </div>
              </div>
            </div>
          )}
          <ReactFlow
            nodes={highlightedNodes}
            edges={canvas.edges}
            onNodesChange={canvas.onNodesChange}
            onEdgesChange={canvas.onEdgesChange}
            onConnect={canvas.onConnect}
            onNodeClick={onNodeClick}
            onPaneClick={onCanvasClick}
            onInit={onInit}
            nodeTypes={nodeTypes}
            snapToGrid
            snapGrid={[16, 16]}
            fitView
          >
            <Background color="rgba(255,255,255,0.08)" gap={16} />
            <Controls className="[&>button]:!bg-white/95 [&>button]:!border-violet-200 [&>button]:!text-[#5e4b85]" />
            <MiniMap
              maskColor="rgba(0,0,0,0.5)"
              className="!border-violet-200 !bg-white/95"
            />
          </ReactFlow>
        </div>

        {/* Output panel */}
        <WorkflowRunResultsPanel
          nodes={canvas.nodes}
          events={runState.events}
          output={
            runState.outputs ? JSON.stringify(runState.outputs, null, 2) : ""
          }
        />
      </div>
      {isConfigPanelOpen && selectedNodeId && (
        <NodeConfigPanel
          nodeId={selectedNodeId}
          nodes={canvas.nodes}
          appDatasets={appDatasets}
          onUpdateNodeData={canvas.updateNodeData}
          onClose={closeConfigPanel}
        />
      )}
      {toast && (
        <div className="fixed right-4 top-14 z-50 flex items-center gap-2 rounded-lg border border-violet-200 bg-white/95 px-4 py-3 text-sm text-[#2f2147] shadow-xl backdrop-blur-2xl">
          <span
            className={`h-2 w-2 rounded-full ${
              toast.tone === "error"
                ? "bg-red-400"
                : toast.tone === "success"
                  ? "bg-green-400"
                  : "bg-blue-400"
            }`}
          />
          {toast.text}
        </div>
      )}
    </div>
  );
}

export function WorkflowCanvas({
  appId,
  workflowId,
  initialGraph,
  appDatasets,
}: WorkflowCanvasInnerProps) {
  return (
    <ReactFlowProvider>
      <WorkflowCanvasInner
        appId={appId}
        workflowId={workflowId}
        initialGraph={initialGraph}
        appDatasets={appDatasets}
      />
    </ReactFlowProvider>
  );
}
