import { memo } from "react";
import { Handle, Position } from "@xyflow/react";

function KnowledgeRetrievalNodeComponent({
  data,
}: {
  data: Record<string, unknown>;
}) {
  return (
    <div className="min-w-[210px] rounded-lg border border-node-retrieval bg-node-retrieval/10 px-4 py-3">
      <Handle type="target" position={Position.Top} />
      <Handle type="source" position={Position.Bottom} />
      <div className="flex items-center gap-2">
        <span className="text-lg">📚</span>
        <span className="font-semibold text-node-retrieval">Knowledge</span>
      </div>
      <div className="mt-1 text-xs text-white/40">
        {String(data.retrievalMode || "keyword")} · topK{" "}
        {Number(data.topK || 4)}
      </div>
    </div>
  );
}

export default memo(KnowledgeRetrievalNodeComponent);
