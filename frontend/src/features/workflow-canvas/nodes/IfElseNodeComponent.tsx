import { memo } from "react";
import { Handle, Position } from "@xyflow/react";

function IfElseNodeComponent({ data }: { data: Record<string, unknown> }) {
  const condition = (data.condition as string) || "No condition set";
  const preview =
    condition.length > 40 ? condition.slice(0, 40) + "..." : condition;

  return (
    <div className="min-w-[180px] rounded-lg border border-node-condition bg-node-condition/10 px-4 py-3">
      <Handle type="target" position={Position.Top} />
      <div className="mb-1 flex items-center gap-2">
        <span className="text-lg">🔀</span>
        <span className="font-semibold text-node-condition">If/Else</span>
      </div>
      <div className="rounded bg-black/20 px-2 py-1 font-mono text-xs text-white/50">
        {preview}
      </div>
      <div className="mt-2 flex justify-between">
        <div className="relative">
          <Handle
            type="source"
            position={Position.Bottom}
            id="true"
            style={{ left: "30%" }}
          />
          <span className="absolute -bottom-4 left-[20%] text-[10px] font-semibold text-node-code">
            TRUE
          </span>
        </div>
        <div className="relative">
          <Handle
            type="source"
            position={Position.Bottom}
            id="false"
            style={{ left: "70%" }}
          />
          <span className="absolute -bottom-4 right-[20%] text-[10px] font-semibold text-node-end">
            FALSE
          </span>
        </div>
      </div>
    </div>
  );
}

export default memo(IfElseNodeComponent);
