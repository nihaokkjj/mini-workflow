import { useWorkflowStore } from "../../stores/workflow.store";
import type { NodeType } from "../../types";

function StartConfig({ data, onChange }: { data: Record<string, unknown>; onChange: (d: Record<string, unknown>) => void }) {
  return (
    <div className="flex flex-col gap-3">
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-slate-700">Input Fields (JSON)</span>
        <textarea
          className="border border-slate-300 rounded-md p-2 text-xs font-mono h-24"
          value={JSON.stringify(data.inputs ?? [], null, 2)}
          onChange={(e) => {
            try { onChange({ ...data, inputs: JSON.parse(e.target.value) }); } catch { /* invalid JSON */ }
          }}
        />
      </label>
      <p className="text-xs text-slate-400">Format: [{`{"variable": "query", "label": "User Query", "type": "text-input"}`}]</p>
    </div>
  );
}

function LLMConfig({ data, onChange }: { data: Record<string, unknown>; onChange: (d: Record<string, unknown>) => void }) {
  return (
    <div className="flex flex-col gap-3">
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-slate-700">Model</span>
        <select
          className="border border-slate-300 rounded-md p-2 text-sm"
          value={(data.model as string) || "gpt-4o-mini"}
          onChange={(e) => onChange({ ...data, model: e.target.value })}
        >
          <option value="gpt-4o-mini">gpt-4o-mini</option>
          <option value="gpt-4o">gpt-4o</option>
          <option value="gpt-3.5-turbo">gpt-3.5-turbo</option>
          <option value="kimi-latest">kimi-latest</option>
        </select>
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-slate-700">System Prompt</span>
        <textarea
          className="border border-slate-300 rounded-md p-2 text-xs h-20"
          value={(data.systemPrompt as string) || "You are a helpful assistant."}
          onChange={(e) => onChange({ ...data, systemPrompt: e.target.value })}
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-slate-700">User Prompt</span>
        <textarea
          className="border border-slate-300 rounded-md p-2 text-xs h-20"
          placeholder="e.g. {{start.query}}"
          value={(data.userPrompt as string) || ""}
          onChange={(e) => onChange({ ...data, userPrompt: e.target.value })}
        />
      </label>
    </div>
  );
}

function IfElseConfig({ data, onChange }: { data: Record<string, unknown>; onChange: (d: Record<string, unknown>) => void }) {
  return (
    <div className="flex flex-col gap-3">
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-slate-700">Condition Expression</span>
        <input
          type="text"
          className="border border-slate-300 rounded-md p-2 text-sm font-mono"
          placeholder="e.g. {{llm-1.text}} > 0.5"
          value={(data.condition as string) || ""}
          onChange={(e) => onChange({ ...data, condition: e.target.value })}
        />
      </label>
      <p className="text-xs text-slate-400">
        Supported operators: == != &gt; &lt; &gt;= &lt;= contains<br />
        Use {"{{nodeId.field}}"} to reference upstream values.
      </p>
    </div>
  );
}

function HttpConfig({ data, onChange }: { data: Record<string, unknown>; onChange: (d: Record<string, unknown>) => void }) {
  return (
    <div className="flex flex-col gap-3">
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-slate-700">Method</span>
        <select
          className="border border-slate-300 rounded-md p-2 text-sm"
          value={(data.method as string) || "GET"}
          onChange={(e) => onChange({ ...data, method: e.target.value })}
        >
          <option value="GET">GET</option>
          <option value="POST">POST</option>
        </select>
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-slate-700">URL</span>
        <input
          type="text"
          className="border border-slate-300 rounded-md p-2 text-sm font-mono"
          placeholder="https://api.example.com/{{start.query}}"
          value={(data.url as string) || ""}
          onChange={(e) => onChange({ ...data, url: e.target.value })}
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-slate-700">Headers (JSON)</span>
        <textarea
          className="border border-slate-300 rounded-md p-2 text-xs font-mono h-20"
          placeholder='{"Authorization": "Bearer {{token}}"}'
          value={JSON.stringify(data.headers || {}, null, 2)}
          onChange={(e) => {
            try { onChange({ ...data, headers: JSON.parse(e.target.value) }); } catch { /* invalid JSON */ }
          }}
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-slate-700">Body</span>
        <textarea
          className="border border-slate-300 rounded-md p-2 text-xs font-mono h-20"
          value={(data.body as string) || ""}
          onChange={(e) => onChange({ ...data, body: e.target.value })}
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-slate-700">Timeout (ms)</span>
        <input
          type="number"
          className="border border-slate-300 rounded-md p-2 text-sm"
          value={(data.timeout as number) || 30000}
          onChange={(e) => onChange({ ...data, timeout: Number(e.target.value) })}
        />
      </label>
    </div>
  );
}

function CodeConfig({ data, onChange }: { data: Record<string, unknown>; onChange: (d: Record<string, unknown>) => void }) {
  return (
    <div className="flex flex-col gap-3">
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-slate-700">JavaScript Code</span>
        <textarea
          className="border border-slate-300 rounded-md p-2 text-xs font-mono h-48"
          placeholder="return $inputs.query.toUpperCase();"
          value={(data.code as string) || ""}
          onChange={(e) => onChange({ ...data, code: e.target.value })}
        />
      </label>
      <p className="text-xs text-slate-400">
        Use <code className="bg-slate-100 px-1">$inputs</code> to access mapped input variables.
      </p>
    </div>
  );
}

function TemplateConfig({ data, onChange }: { data: Record<string, unknown>; onChange: (d: Record<string, unknown>) => void }) {
  return (
    <div className="flex flex-col gap-3">
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-slate-700">Template</span>
        <textarea
          className="border border-slate-300 rounded-md p-2 text-xs font-mono h-32"
          placeholder="Hello {{start.query}}!"
          value={(data.template as string) || ""}
          onChange={(e) => onChange({ ...data, template: e.target.value })}
        />
      </label>
    </div>
  );
}

function EndConfig({ data, onChange }: { data: Record<string, unknown>; onChange: (d: Record<string, unknown>) => void }) {
  return (
    <div className="flex flex-col gap-3">
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-slate-700">Output Mappings (JSON)</span>
        <textarea
          className="border border-slate-300 rounded-md p-2 text-xs font-mono h-24"
          placeholder='{"result": "llm-1.text"}'
          value={JSON.stringify(data.outputs ?? {}, null, 2)}
          onChange={(e) => {
            try { onChange({ ...data, outputs: JSON.parse(e.target.value) }); } catch { /* invalid JSON */ }
          }}
        />
      </label>
      <p className="text-xs text-slate-400">Map output variable names to node field references like {"nodeId.field"}</p>
    </div>
  );
}

const placeholderConfig = () => <p className="text-sm text-slate-500">Configuration coming soon</p>;

const configRenderers: Record<NodeType, (data: Record<string, unknown>, onChange: (d: Record<string, unknown>) => void) => JSX.Element> = {
  start: (d, o) => <StartConfig data={d} onChange={o} />,
  llm: (d, o) => <LLMConfig data={d} onChange={o} />,
  "if-else": (d, o) => <IfElseConfig data={d} onChange={o} />,
  end: (d, o) => <EndConfig data={d} onChange={o} />,
  http: (d, o) => <HttpConfig data={d} onChange={o} />,
  code: (d, o) => <CodeConfig data={d} onChange={o} />,
  template: (d, o) => <TemplateConfig data={d} onChange={o} />,
  iteration: placeholderConfig,
};

export function NodeConfigPanel() {
  const nodes = useWorkflowStore((s) => s.nodes);
  const selectedNodeId = useWorkflowStore((s) => s.selectedNodeId);
  const selectNode = useWorkflowStore((s) => s.selectNode);
  const updateNodeData = useWorkflowStore((s) => s.updateNodeData);

  if (!selectedNodeId) return null;

  const node = nodes.find((n) => n.id === selectedNodeId);
  if (!node) return null;

  const renderer = configRenderers[node.type];
  if (!renderer) return null;

  const handleChange = (newData: Record<string, unknown>) => {
    updateNodeData(node.id, newData);
  };

  return (
    <div className="w-80 bg-white border-l border-slate-200 h-full flex flex-col shadow-lg">
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200">
        <h3 className="font-semibold text-sm text-slate-800">
          {node.type.toUpperCase()} Configuration
        </h3>
        <button
          onClick={() => selectNode(null)}
          className="text-slate-400 hover:text-slate-600 text-lg leading-none"
        >
          ✕
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-4">
        {renderer(node.data, handleChange)}
      </div>
      <div className="px-4 py-3 border-t border-slate-200 text-xs text-slate-400">
        Node ID: <code className="text-slate-600">{node.id}</code>
      </div>
    </div>
  );
}
