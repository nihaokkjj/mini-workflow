import { memo } from "react";
import { Handle, Position } from "@xyflow/react";

function LLMNodeComponent({ data }: { data: Record<string, unknown> }) {
  return (
    <div className="min-w-[180px] rounded-lg border border-node-llm bg-node-llm/10 px-4 py-3">
      <Handle type="target" position={Position.Top} />
      <Handle type="source" position={Position.Bottom} />
      <div className="flex items-center gap-2">
        <span className="text-lg">🤖</span>
        <span className="font-semibold text-node-llm">LLM</span>
      </div>
      <div className="mt-1 text-xs text-[#5e4b85]">
        {(data.model as string) || "gpt-4o-mini"}
      </div>
    </div>
  );
}

export default memo(LLMNodeComponent);
