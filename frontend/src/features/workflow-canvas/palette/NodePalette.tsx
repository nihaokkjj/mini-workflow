import type { NodeType } from "../../../types";

const NODE_TEMPLATES: { type: NodeType; label: string; color: string }[] = [
  {
    type: "start",
    label: "开始",
    color: "border-node-start text-node-start bg-node-start/10",
  },
  {
    type: "llm",
    label: "LLM",
    color: "border-node-llm text-node-llm bg-node-llm/10",
  },
  {
    type: "if-else",
    label: "条件分支",
    color: "border-node-condition text-node-condition bg-node-condition/10",
  },
  {
    type: "http",
    label: "HTTP",
    color: "border-node-retrieval text-node-retrieval bg-node-retrieval/10",
  },
  {
    type: "code",
    label: "代码",
    color: "border-node-code text-node-code bg-node-code/10",
  },
  {
    type: "template",
    label: "模板",
    color: "border-violet-200 text-[#6b46c1] bg-white/90",
  },
  {
    type: "iteration",
    label: "迭代",
    color: "border-[#8cc152] text-[#4f7f28] bg-[#eef9e8]",
  },
  {
    type: "knowledge-retrieval",
    label: "知识检索",
    color: "border-node-retrieval text-node-retrieval bg-node-retrieval/10",
  },
  {
    type: "end",
    label: "结束",
    color: "border-node-end text-node-end bg-node-end/10",
  },
];

export function NodePalette() {
  const onDragStart = (event: React.DragEvent, nodeType: NodeType) => {
    event.dataTransfer.setData("application/reactflow-type", nodeType);
    event.dataTransfer.effectAllowed = "move";
  };

  return (
    <div className="flex w-48 flex-col gap-2 border-r border-violet-200/80 bg-white/72 p-3 backdrop-blur">
      <h3 className="mb-1 text-xs font-semibold uppercase tracking-[0.8px] text-[#7b6b9d]">
        节点
      </h3>
      {NODE_TEMPLATES.map((t) => (
        <div
          key={t.type}
          draggable
          onDragStart={(e) => onDragStart(e, t.type)}
          className={`cursor-grab rounded-lg border px-3 py-2 text-sm font-medium transition hover:-translate-y-0.5 hover:bg-white hover:shadow-[0_12px_30px_rgba(124,58,237,0.12)] ${t.color}`}
        >
          {t.label}
        </div>
      ))}
    </div>
  );
}
