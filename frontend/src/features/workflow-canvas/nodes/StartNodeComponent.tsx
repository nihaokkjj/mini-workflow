import { memo } from "react";
import { Handle, Position, type Node } from "@xyflow/react";

function StartNodeComponent({ data }: { data: Record<string, unknown> }) {
  return (
    <div className="bg-emerald-50 border-2 border-emerald-400 rounded-lg px-4 py-3 min-w-[160px] shadow-sm">
      <Handle type="source" position={Position.Bottom} />
      <div className="flex items-center gap-2">
        <span className="w-3 h-3 rounded-full bg-emerald-500" />
        <span className="font-semibold text-emerald-800">Start</span>
      </div>
      <div className="text-xs text-slate-500 mt-1">
        {(data.inputs as Record<string, string>)?.input ?? "Input"}
      </div>
    </div>
  );
}

export default memo(StartNodeComponent);
