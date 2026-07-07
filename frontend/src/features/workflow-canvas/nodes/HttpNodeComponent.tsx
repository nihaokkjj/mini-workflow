import { memo } from "react";
import { Handle, Position } from "@xyflow/react";

function HttpNodeComponent({ data }: { data: Record<string, unknown> }) {
  const method = (data.method as string) || "GET";
  const url = (data.url as string) || "";
  const preview =
    `${method} ${url}`.length > 35
      ? `${method} ${url}`.slice(0, 35) + "..."
      : `${method} ${url}`;

  return (
    <div className="min-w-[180px] rounded-lg border border-node-retrieval bg-node-retrieval/10 px-4 py-3">
      <Handle type="target" position={Position.Top} />
      <div className="flex items-center gap-2">
        <span className="text-lg">🌐</span>
        <span className="font-semibold text-node-retrieval">HTTP</span>
      </div>
      <div className="mt-1 truncate font-mono text-xs text-white/40">
        {preview}
      </div>
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
}

export default memo(HttpNodeComponent);
