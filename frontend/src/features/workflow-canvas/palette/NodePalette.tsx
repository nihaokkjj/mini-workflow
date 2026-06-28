import type { NodeType } from "../../../types";

const NODE_TEMPLATES: { type: NodeType; label: string; color: string }[] = [
  { type: "start", label: "Start", color: "bg-emerald-100 border-emerald-400" },
  { type: "llm", label: "LLM", color: "bg-violet-100 border-violet-400" },
  { type: "if-else", label: "If/Else", color: "bg-amber-100 border-amber-400" },
  { type: "end", label: "End", color: "bg-red-100 border-red-400" },
];

export function NodePalette() {
  const onDragStart = (event: React.DragEvent, nodeType: NodeType) => {
    event.dataTransfer.setData("application/reactflow-type", nodeType);
    event.dataTransfer.effectAllowed = "move";
  };

  return (
    <div className="w-48 bg-white border-r border-slate-200 p-3 flex flex-col gap-2">
      <h3 className="text-sm font-semibold text-slate-600 mb-1">Nodes</h3>
      {NODE_TEMPLATES.map((t) => (
        <div
          key={t.type}
          draggable
          onDragStart={(e) => onDragStart(e, t.type)}
          className={`border-2 rounded-lg px-3 py-2 cursor-grab text-sm font-medium ${t.color} hover:shadow-md transition-shadow`}
        >
          {t.label}
        </div>
      ))}
    </div>
  );
}
