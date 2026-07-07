import { memo } from "react";
import { Handle, Position } from "@xyflow/react";

function StartNodeComponent({ data }: { data: Record<string, unknown> }) {
  return (
    <div className="min-w-[160px] rounded-lg border border-node-start bg-node-start/10 px-4 py-3">
      <Handle type="source" position={Position.Bottom} />
      <div className="flex items-center gap-2">
        <span className="h-3 w-3 rounded-full bg-node-start" />
        <span className="font-semibold text-node-start">Start</span>
      </div>
      <div className="mt-1 text-xs text-white/40">
        {(data.inputs as Record<string, string>)?.input ?? "Input"}
      </div>
    </div>
  );
}

export default memo(StartNodeComponent);
