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
    <div className="h-[28rem] border-t border-slate-200 bg-slate-50">
      <div className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab("node-results")}
            className={`rounded-full px-3 py-1 text-xs font-medium ${
              activeTab === "node-results"
                ? "bg-slate-900 text-white"
                : "bg-slate-100 text-slate-600"
            }`}
          >
            Node Results
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("console")}
            className={`rounded-full px-3 py-1 text-xs font-medium ${
              activeTab === "console"
                ? "bg-slate-900 text-white"
                : "bg-slate-100 text-slate-600"
            }`}
          >
            Console
          </button>
        </div>
        <div className="text-xs text-slate-500">
          {nodeRunResults.length} node result
          {nodeRunResults.length === 1 ? "" : "s"}
        </div>
      </div>

      <div className="h-[calc(28rem-57px)] overflow-y-auto p-4">
        {activeTab === "console" ? (
          <div className="rounded-xl bg-slate-900 p-4 font-mono text-sm text-green-400">
            <pre className="whitespace-pre-wrap">
              {output || "No console output yet."}
            </pre>
          </div>
        ) : nodeRunResults.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white px-4 py-8 text-center text-sm text-slate-500">
            Run the workflow to inspect node outputs.
          </div>
        ) : (
          <div className="space-y-4">
            {nodeRunResults.map((result) => {
              const retrievalOutput = readRetrievalRunOutput(result.outputs);

              return (
                <div
                  key={`${result.nodeId}-${result.timestamp}`}
                  className="rounded-2xl border border-slate-200 bg-white shadow-sm"
                >
                  <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
                    <div>
                      <div className="text-sm font-semibold text-slate-800">
                        {result.nodeId}
                      </div>
                      <div className="mt-1 text-xs text-slate-500">
                        {result.nodeType} ·{" "}
                        {new Date(result.timestamp).toLocaleTimeString()}
                      </div>
                    </div>
                    {retrievalOutput && (
                      <div className="rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-700">
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
                      <pre className="overflow-auto rounded-xl bg-slate-950 px-4 py-4 text-xs text-slate-100">
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
