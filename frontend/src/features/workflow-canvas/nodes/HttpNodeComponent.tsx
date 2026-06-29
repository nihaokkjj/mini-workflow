import { memo } from "react";
import { Handle, Position } from "@xyflow/react";

function HttpNodeComponent({ data }: { data: Record<string, unknown> }) {
  const method = (data.method as string) || "GET";
  const url = (data.url as string) || "";
  const preview = `${method} ${url}`.length > 35 ? `${method} ${url}`.slice(0, 35) + "..." : `${method} ${url}`;

  return (
    <div className="bg-sky-50 border-2 border-sky-400 rounded-lg px-4 py-3 min-w-[180px] shadow-sm">
      <Handle type="target" position={Position.Top} />
      <div className="flex items-center gap-2">
        <span className="text-lg">🌐</span>
        <span className="font-semibold text-sky-800">HTTP</span>
      </div>
      <div className="text-xs text-slate-500 mt-1 font-mono truncate">{preview}</div>
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
}

export default memo(HttpNodeComponent);
