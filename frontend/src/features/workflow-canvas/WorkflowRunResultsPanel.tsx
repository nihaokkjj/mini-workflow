import { useEffect, useRef, useState } from "react";
import type { GraphEngineEvent, NodeConfig } from "../../types";
import { RetrievalResultView } from "../retrieval-debug/RetrievalResultView";
import {
  collectNodeRunResults,
  readRetrievalRunOutput,
} from "./workflow-runtime.model";
import { createWorkflowRunResultsPanelViewModel } from "./workflow-run-results-panel.model";

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
  const [isCollapsed, setIsCollapsed] = useState(false);
  const previousNodeRunCountRef = useRef(nodeRunResults.length);
  const panel = createWorkflowRunResultsPanelViewModel({
    output,
    nodeResultCount: nodeRunResults.length,
    isCollapsed,
  });

  useEffect(() => {
    const previousCount = previousNodeRunCountRef.current;
    if (previousCount === 0 && nodeRunResults.length > 0) {
      setActiveTab("node-results");
    } else if (previousCount === 0 && nodeRunResults.length === 0 && output) {
      setActiveTab("console");
    }
    previousNodeRunCountRef.current = nodeRunResults.length;
  }, [nodeRunResults.length, output]);

  if (!panel.hasContent) {
    return null;
  }

  return (
    <div className="border-t border-violet-200/80 bg-white/70 backdrop-blur">
      <div className="flex items-center justify-between border-b border-violet-200/80 bg-white/85 px-4 py-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab("node-results")}
            className={`rounded-full px-3 py-1 text-xs font-medium transition ${
              activeTab === "node-results"
                ? "bg-accent text-white"
                : "bg-violet-50 text-[#5e4b85] hover:text-[#2f2147]"
            }`}
          >
            节点结果
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("console")}
            className={`rounded-full px-3 py-1 text-xs font-medium transition ${
              activeTab === "console"
                ? "bg-accent text-white"
                : "bg-violet-50 text-[#5e4b85] hover:text-[#2f2147]"
            }`}
          >
            控制台
          </button>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-xs text-[#7b6b9d]">
            {nodeRunResults.length} 个节点结果
          </div>
          <button
            type="button"
            onClick={() => setIsCollapsed((value) => !value)}
            aria-expanded={panel.showsBody}
            className="rounded-full border border-violet-200 bg-white/92 px-3 py-1 text-xs font-medium text-[#5e4b85] transition hover:border-violet-300 hover:text-[#2f2147]"
          >
            {panel.toggleLabel}
          </button>
        </div>
      </div>

      {/* 折叠后仍保留标题栏，避免用户收起结果面板后失去重新展开的入口。 */}
      {panel.showsBody && (
        <div className="h-[calc(28rem-57px)] overflow-y-auto p-4">
          {activeTab === "console" ? (
            <div className="rounded-xl border border-violet-200 bg-white/92 p-4 font-mono text-sm text-node-code">
              <pre className="whitespace-pre-wrap">
                {output || "暂无控制台输出。"}
              </pre>
            </div>
          ) : nodeRunResults.length === 0 ? (
            <div className="rounded-xl border border-dashed border-violet-200 bg-white/92 px-4 py-8 text-center text-sm text-[#7b6b9d]">
              运行工作流后查看节点输出。
            </div>
          ) : (
            <div className="space-y-4">
              {nodeRunResults.map((result) => {
                const retrievalOutput = readRetrievalRunOutput(result.outputs);
                return (
                  <div
                    key={`${result.nodeId}-${result.timestamp}`}
                    className="rounded-2xl border border-violet-200 bg-white/92"
                  >
                    <div className="flex items-center justify-between border-b border-white/8 px-4 py-3">
                      <div>
                        <div className="text-sm font-semibold text-[#2f2147]">
                          {result.nodeId}
                        </div>
                        <div className="mt-1 text-xs text-[#7b6b9d]">
                          {result.nodeType} ·{" "}
                          {new Date(result.timestamp).toLocaleTimeString()}
                        </div>
                      </div>
                      {retrievalOutput && (
                        <div className="rounded-full bg-accent/15 px-3 py-1 text-xs font-medium text-accent">
                          {retrievalOutput.sourceCount} 个来源 ·{" "}
                          {retrievalOutput.hits.length} 个命中
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
                        <pre className="overflow-auto rounded-xl bg-violet-50 px-4 py-4 text-xs text-[#4b377f]">
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
      )}
    </div>
  );
}
