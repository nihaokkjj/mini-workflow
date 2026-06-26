import { memo } from "react";
import { Handle, Position } from "@xyflow/react";

function LLMNodeComponent({ data }: { data: Record<string, unknown> }) {
  return (
    <div className="bg-violet-50 border-2 border-violet-400 rounded-lg px-4 py-3 min-w-[180px] shadow-sm">
      <Handle type="target" position={Position.Top} />
      <Handle type="source" position={Position.Bottom} />
      <div className="flex items-center gap-2">
        <span className="text-lg">🤖</span>
        <span className="font-semibold text-violet-800">LLM</span>
      </div>
      <div className="text-xs text-slate-500 mt-1">
        {(data.model as string) || "gpt-4o-mini"}
      </div>
    </div>
  );
}

export default memo(LLMNodeComponent);
