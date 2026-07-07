import { useEffect, useRef, useState } from "react";
import type { GraphEngineEvent, NodeConfig } from "../../types";
import { RetrievalResultView } from "../retrieval-debug/RetrievalResultView";
import {
  collectNodeRunResults,
  readRetrievalRunOutput,
} from "./workflow-runtime.model";

type ActiveTab = "node-results" | "console";

export function WorkflowRunResultsPanel({
  nodes,
  events,
  output,
}: {
  nodes: NodeConfig[];
  events: GraphEngineEvent[];
  output: string;
}) {
  const nodeRunResults = collectNodeRunResults(events, nodes);
  const [activeTab, setActiveTab] = useState<ActiveTab>(
    nodeRunResults.length > 0 ? "node-results" : "console"
  );
  const previousNodeRunCountRef = useRef(nodeRunResults.length);

  useEffect(() => {
    const previousCount = previousNodeRunCountRef.current;
    if (previousCount === 0 && nodeRunResults.length > 0) {
      setActiveTab("node-results");
    } else if (previousCount === 0 && nodeRunResults.length === 0 && output) {
      setActiveTab("console");
    }
    previousNodeRunCountRef.current = nodeRunResults.length;
  }, [nodeRunResults.length, output]);

  if (!output && nodeRunResults.length === 0) {
    return null;
  }

  return (
    <div className="h-[28rem] border-t border-white/8 bg-canvas">
      <div className="flex items-center justify-between border-b border-white/8 bg-[#0d0d14] px-4 py-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab("node-results")}
            className={`rounded-full px-3 py-1 text-xs font-medium transition ${
              activeTab === "node-results"
                ? "bg-white text-black"
                : "bg-white/5 text-white/50 hover:text-white"
            }`}
          >
            Node Results
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("console")}
            className={`rounded-full px-3 py-1 text-xs font-medium transition ${
              activeTab === "console"
                ? "bg-white text-black"
                : "bg-white/5 text-white/50 hover:text-white"
            }`}
          >
            Console
          </button>
        </div>
        <div className="text-xs text-white/40">
          {nodeRunResults.length} node result
          {nodeRunResults.length === 1 ? "" : "s"}
        </div>
      </div>

      <div className="h-[calc(28rem-57px)] overflow-y-auto p-4">
        {activeTab === "console" ? (
          <div className="rounded-xl bg-[#0d0d14] p-4 font-mono text-sm text-node-code">
            <pre className="whitespace-pre-wrap">
              {output || "No console output yet."}
            </pre>
          </div>
        ) : nodeRunResults.length === 0 ? (
          <div className="rounded-xl border border-dashed border-white/10 bg-black/20 px-4 py-8 text-center text-sm text-white/40">
            Run the workflow to inspect node outputs.
          </div>
        ) : (
          <div className="space-y-4">
            {nodeRunResults.map((result) => {
              const retrievalOutput = readRetrievalRunOutput(result.outputs);
              return (
                <div
                  key={`${result.nodeId}-${result.timestamp}`}
                  className="rounded-2xl border border-white/8 bg-black/20"
                >
                  <div className="flex items-center justify-between border-b border-white/8 px-4 py-3">
                    <div>
                      <div className="text-sm font-semibold text-white/80">
                        {result.nodeId}
                      </div>
                      <div className="mt-1 text-xs text-white/40">
                        {result.nodeType} ·{" "}
                        {new Date(result.timestamp).toLocaleTimeString()}
                      </div>
                    </div>
                    {retrievalOutput && (
                      <div className="rounded-full bg-accent/15 px-3 py-1 text-xs font-medium text-accent">
                        {retrievalOutput.sourceCount} sources ·{" "}
                        {retrievalOutput.hits.length} hits
                      </div>
                    )}
                  </div>
                  <div className="p-4">
                    {retrievalOutput ? (
                      <RetrievalResultView
                        result={retrievalOutput}
                        contextPreviewLength={220}
                      />
                    ) : (
                      <pre className="overflow-auto rounded-xl bg-canvas px-4 py-4 text-xs text-white/70">
                        {JSON.stringify(result.outputs, null, 2)}
                      </pre>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
