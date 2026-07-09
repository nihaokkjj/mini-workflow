import { memo } from "react";
import { Handle, Position } from "@xyflow/react";

function TemplateNodeComponent({ data }: { data: Record<string, unknown> }) {
  const template = (data.template as string) || "";
  const preview =
    template.length > 40
      ? template.slice(0, 40) + "..."
      : template || "No template";

  return (
    <div className="min-w-[180px] rounded-lg border border-violet-200 bg-white/90 px-4 py-3">
      <Handle type="target" position={Position.Top} />
      <div className="flex items-center gap-2">
        <span className="text-lg">📝</span>
        <span className="font-semibold text-[#6b46c1]">Template</span>
      </div>
      <div className="mt-1 truncate font-mono text-xs text-[#5e4b85]">
        {preview}
      </div>
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
}

export default memo(TemplateNodeComponent);
