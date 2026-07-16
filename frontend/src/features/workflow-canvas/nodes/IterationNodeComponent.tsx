import { memo } from "react";
import { Handle, Position } from "@xyflow/react";

function IterationNodeComponent({ data }: { data: Record<string, unknown> }) {
  const items = (data.items as string) || "";
  const template = (data.itemTemplate as string) || "";
  const preview = template || items || "未配置数据";
  const shortened =
    preview.length > 44 ? `${preview.slice(0, 44)}...` : preview;

  return (
    <div className="min-w-[190px] rounded-lg border border-[#8cc152] bg-[#eef9e8] px-4 py-3">
      <Handle type="target" position={Position.Top} />
      <div className="flex items-center gap-2">
        <span className="text-lg">↻</span>
        <span className="font-semibold text-[#4f7f28]">迭代</span>
      </div>
      <div className="mt-1 truncate font-mono text-xs text-[#4f5f52]">
        {shortened}
      </div>
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
}

export default memo(IterationNodeComponent);
