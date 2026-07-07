import type { NodeType } from "../../../types";

const NODE_TEMPLATES: { type: NodeType; label: string; color: string }[] = [
  {
    type: "start",
    label: "Start",
    color: "border-node-start text-node-start bg-node-start/10",
  },
  {
    type: "llm",
    label: "LLM",
    color: "border-node-llm text-node-llm bg-node-llm/10",
  },
  {
    type: "if-else",
    label: "If/Else",
    color: "border-node-condition text-node-condition bg-node-condition/10",
  },
  {
    type: "http",
    label: "HTTP",
    color: "border-node-retrieval text-node-retrieval bg-node-retrieval/10",
  },
  {
    type: "code",
    label: "Code",
    color: "border-node-code text-node-code bg-node-code/10",
  },
  {
    type: "template",
    label: "Template",
    color: "border-white/30 text-white/60 bg-white/5",
  },
  {
    type: "knowledge-retrieval",
    label: "Knowledge",
    color: "border-node-retrieval text-node-retrieval bg-node-retrieval/10",
  },
  {
    type: "end",
    label: "End",
    color: "border-node-end text-node-end bg-node-end/10",
  },
];

export function NodePalette() {
  const onDragStart = (event: React.DragEvent, nodeType: NodeType) => {
    event.dataTransfer.setData("application/reactflow-type", nodeType);
    event.dataTransfer.effectAllowed = "move";
  };

  return (
    <div className="flex w-48 flex-col gap-2 border-r border-white/8 bg-canvas p-3">
      <h3 className="mb-1 text-xs font-semibold uppercase tracking-[0.8px] text-white/40">
        Nodes
      </h3>
      {NODE_TEMPLATES.map((t) => (
        <div
          key={t.type}
          draggable
          onDragStart={(e) => onDragStart(e, t.type)}
          className={`cursor-grab rounded-lg border px-3 py-2 text-sm font-medium transition hover:brightness-125 ${t.color}`}
        >
          {t.label}
        </div>
      ))}
    </div>
  );
}
