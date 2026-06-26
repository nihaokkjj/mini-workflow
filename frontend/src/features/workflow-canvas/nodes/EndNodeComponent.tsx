import { memo } from "react";
import { Handle, Position } from "@xyflow/react";

function EndNodeComponent() {
  return (
    <div className="bg-red-50 border-2 border-red-400 rounded-lg px-4 py-3 min-w-[160px] shadow-sm">
      <Handle type="target" position={Position.Top} />
      <div className="flex items-center gap-2">
        <span className="w-3 h-3 rounded-full bg-red-500" />
        <span className="font-semibold text-red-800">End</span>
      </div>
      <div className="text-xs text-slate-500 mt-1">Output</div>
    </div>
  );
}

export default memo(EndNodeComponent);
