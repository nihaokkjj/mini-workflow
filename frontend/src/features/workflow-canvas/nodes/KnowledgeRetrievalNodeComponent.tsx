import { memo } from "react";
import { Handle, Position } from "@xyflow/react";

function KnowledgeRetrievalNodeComponent({
  data,
}: {
  data: Record<string, unknown>;
}) {
  return (
    <div className="bg-teal-50 border-2 border-teal-400 rounded-lg px-4 py-3 min-w-[210px] shadow-sm">
      <Handle type="target" position={Position.Top} />
      <Handle type="source" position={Position.Bottom} />
      <div className="flex items-center gap-2">
        <span className="text-lg">📚</span>
        <span className="font-semibold text-teal-800">Knowledge</span>
      </div>
      <div className="text-xs text-slate-500 mt-1">
        {String(data.retrievalMode || "keyword")} · topK{" "}
        {Number(data.topK || 4)}
      </div>
    </div>
  );
}

export default memo(KnowledgeRetrievalNodeComponent);
