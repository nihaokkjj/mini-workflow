import { memo } from "react";
import { Handle, Position } from "@xyflow/react";

function TemplateNodeComponent({ data }: { data: Record<string, unknown> }) {
  const template = (data.template as string) || "";
  const preview = template.length > 40 ? template.slice(0, 40) + "..." : template || "No template";

  return (
    <div className="bg-pink-50 border-2 border-pink-400 rounded-lg px-4 py-3 min-w-[180px] shadow-sm">
      <Handle type="target" position={Position.Top} />
      <div className="flex items-center gap-2">
        <span className="text-lg">📝</span>
        <span className="font-semibold text-pink-800">Template</span>
      </div>
      <div className="text-xs text-slate-500 mt-1 font-mono truncate">{preview}</div>
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
}

export default memo(TemplateNodeComponent);
