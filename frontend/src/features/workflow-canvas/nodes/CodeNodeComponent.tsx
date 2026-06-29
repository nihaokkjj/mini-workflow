import { memo } from "react";
import { Handle, Position } from "@xyflow/react";

function CodeNodeComponent({ data }: { data: Record<string, unknown> }) {
  const code = (data.code as string) || "";
  const preview = code.length > 40 ? code.slice(0, 40) + "..." : code || "No code";

  return (
    <div className="bg-slate-50 border-2 border-slate-500 rounded-lg px-4 py-3 min-w-[180px] shadow-sm">
      <Handle type="target" position={Position.Top} />
      <div className="flex items-center gap-2">
        <span className="text-lg">🧮</span>
        <span className="font-semibold text-slate-800">Code</span>
      </div>
      <div className="text-xs text-slate-500 mt-1 font-mono truncate">{preview}</div>
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
}

export default memo(CodeNodeComponent);
