import { memo } from "react";
import { Handle, Position } from "@xyflow/react";

function CodeNodeComponent({ data }: { data: Record<string, unknown> }) {
  const code = (data.code as string) || "";
  const preview =
    code.length > 40 ? code.slice(0, 40) + "..." : code || "No code";

  return (
    <div className="min-w-[180px] rounded-lg border border-node-code bg-node-code/10 px-4 py-3">
      <Handle type="target" position={Position.Top} />
      <div className="flex items-center gap-2">
        <span className="text-lg">🧮</span>
        <span className="font-semibold text-node-code">Code</span>
      </div>
      <div className="mt-1 truncate font-mono text-xs text-[#4f5f52]">
        {preview}
      </div>
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
}

export default memo(CodeNodeComponent);
