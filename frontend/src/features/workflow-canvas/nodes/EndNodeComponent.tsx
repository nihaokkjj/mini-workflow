import { memo } from "react";
import { Handle, Position } from "@xyflow/react";

function EndNodeComponent() {
  return (
    <div className="min-w-[160px] rounded-lg border border-node-end bg-node-end/10 px-4 py-3">
      <Handle type="target" position={Position.Top} />
      <div className="flex items-center gap-2">
        <span className="h-3 w-3 rounded-full bg-node-end" />
        <span className="font-semibold text-node-end">End</span>
      </div>
      <div className="mt-1 text-xs text-[#8a4f5b]">Output</div>
    </div>
  );
}

export default memo(EndNodeComponent);
