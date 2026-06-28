import { memo } from "react";
import { Handle, Position } from "@xyflow/react";

function IfElseNodeComponent({ data }: { data: Record<string, unknown> }) {
  const condition = (data.condition as string) || "No condition set";
  const preview = condition.length > 40 ? condition.slice(0, 40) + "..." : condition;

  return (
    <div className="bg-amber-50 border-2 border-amber-400 rounded-lg px-4 py-3 min-w-[180px] shadow-sm">
      <Handle type="target" position={Position.Top} />
      <div className="flex items-center gap-2 mb-1">
        <span className="text-lg">🔀</span>
        <span className="font-semibold text-amber-800">If/Else</span>
      </div>
      <div className="text-xs text-slate-500 bg-amber-100 rounded px-2 py-1 font-mono">
        {preview}
      </div>
      <div className="flex justify-between mt-2">
        <div className="relative">
          <Handle
            type="source"
            position={Position.Bottom}
            id="true"
            style={{ left: "30%" }}
          />
          <span className="text-[10px] text-green-600 font-semibold absolute -bottom-4 left-[20%]">TRUE</span>
        </div>
        <div className="relative">
          <Handle
            type="source"
            position={Position.Bottom}
            id="false"
            style={{ left: "70%" }}
          />
          <span className="text-[10px] text-red-500 font-semibold absolute -bottom-4 right-[20%]">FALSE</span>
        </div>
      </div>
    </div>
  );
}

export default memo(IfElseNodeComponent);
