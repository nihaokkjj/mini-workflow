import { useEffect, useState, type ReactNode } from "react";
import { listAppDatasets } from "../../services/api";
import { useWorkflowStore } from "../../stores/workflow.store";
import type { AppDatasetBindingDto, NodeType } from "../../types";

interface SupportedModelOption {
  id: string;
  name: string;
  provider: string;
  baseURL: string;
}

const SUPPORTED_LLM_MODELS: SupportedModelOption[] = [
  {
    id: "gpt-4o-mini",
    name: "OpenAI GPT-4o mini",
    provider: "OpenAI",
    baseURL: "https://api.openai.com/v1",
  },
  {
    id: "gpt-4.1-mini",
    name: "OpenAI GPT-4.1 mini",
    provider: "OpenAI",
    baseURL: "https://api.openai.com/v1",
  },
  {
    id: "deepseek-chat",
    name: "DeepSeek Chat",
    provider: "DeepSeek",
    baseURL: "https://api.deepseek.com/v1",
  },
  {
    id: "deepseek-reasoner",
    name: "DeepSeek Reasoner",
    provider: "DeepSeek",
    baseURL: "https://api.deepseek.com/v1",
  },
  {
    id: "kimi-latest",
    name: "Moonshot Kimi",
    provider: "Moonshot",
    baseURL: "https://api.moonshot.cn/v1",
  },
];

function StartConfig({
  data,
  onChange,
}: {
  data: Record<string, unknown>;
  onChange: (d: Record<string, unknown>) => void;
}) {
  return (
    <div className="flex flex-col gap-3">
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-slate-700">Input Fields (JSON)</span>
        <textarea
          className="border border-slate-300 rounded-md p-2 text-xs font-mono h-24"
          value={JSON.stringify(data.inputs ?? [], null, 2)}
          onChange={(e) => {
            try {
              onChange({ ...data, inputs: JSON.parse(e.target.value) });
            } catch {
              /* invalid JSON */
            }
          }}
        />
      </label>
      <p className="text-xs text-slate-400">
        Format: [
        {`{"variable": "query", "label": "User Query", "type": "text-input"}`}]
      </p>
    </div>
  );
}

function LLMConfig({
  data,
  onChange,
}: {
  data: Record<string, unknown>;
  onChange: (d: Record<string, unknown>) => void;
}) {
  const selectedModel =
    (data.model as string) || SUPPORTED_LLM_MODELS[0]?.id || "";
  const modelOptions = SUPPORTED_LLM_MODELS.some(
    (model) => model.id === selectedModel
  )
    ? SUPPORTED_LLM_MODELS
    : [
        ...SUPPORTED_LLM_MODELS,
        {
          id: selectedModel,
          name: `${selectedModel} (current workflow)`,
          provider: "Custom",
          baseURL: "",
        },
      ];
  const selectedOption =
    modelOptions.find((model) => model.id === selectedModel) ??
    SUPPORTED_LLM_MODELS[0];
  const configuredBaseURL =
    typeof data.baseURL === "string" && data.baseURL.trim().length > 0
      ? data.baseURL
      : (selectedOption?.baseURL ?? "");

  const handleModelChange = (modelId: string) => {
    const nextOption =
      SUPPORTED_LLM_MODELS.find((model) => model.id === modelId) ??
      SUPPORTED_LLM_MODELS[0];

    onChange({
      ...data,
      model: modelId,
      baseURL: nextOption?.baseURL ?? "",
    });
  };

  return (
    <div className="flex flex-col gap-3">
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-slate-700">Model</span>
        <select
          className="border border-slate-300 rounded-md p-2 text-sm"
          value={selectedModel}
          onChange={(e) => handleModelChange(e.target.value)}
        >
          {modelOptions.map((model) => (
            <option key={model.id} value={model.id}>
              {model.name}
            </option>
          ))}
        </select>
        <span className="text-xs text-slate-400">
          Supported provider: {selectedOption?.provider ?? "OpenAI-compatible"}
        </span>
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-slate-700">API Key</span>
        <input
          type="password"
          className="border border-slate-300 rounded-md p-2 text-sm font-mono"
          placeholder="sk-..."
          value={(data.apiKey as string) || ""}
          onChange={(e) => onChange({ ...data, apiKey: e.target.value })}
        />
        <span className="text-xs text-slate-400">
          Select a supported model first, then paste the provider API key here.
        </span>
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-slate-700">Base URL</span>
        <input
          type="text"
          className="border border-slate-300 rounded-md p-2 text-sm font-mono"
          placeholder="https://api.openai.com/v1"
          value={configuredBaseURL}
          onChange={(e) => onChange({ ...data, baseURL: e.target.value })}
        />
        <span className="text-xs text-slate-400">
          Defaults to the selected provider endpoint and can be overridden for
          proxies or compatible gateways.
        </span>
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-slate-700">System Prompt</span>
        <textarea
          className="border border-slate-300 rounded-md p-2 text-xs h-20"
          value={
            (data.systemPrompt as string) || "You are a helpful assistant."
          }
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

function IfElseConfig({
  data,
  onChange,
}: {
  data: Record<string, unknown>;
  onChange: (d: Record<string, unknown>) => void;
}) {
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
        Supported operators: == != &gt; &lt; &gt;= &lt;= contains
        <br />
        Use {"{{nodeId.field}}"} to reference upstream values.
      </p>
    </div>
  );
}

function HttpConfig({
  data,
  onChange,
}: {
  data: Record<string, unknown>;
  onChange: (d: Record<string, unknown>) => void;
}) {
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
            try {
              onChange({ ...data, headers: JSON.parse(e.target.value) });
            } catch {
              /* invalid JSON */
            }
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
          onChange={(e) =>
            onChange({ ...data, timeout: Number(e.target.value) })
          }
        />
      </label>
    </div>
  );
}

function CodeConfig({
  data,
  onChange,
}: {
  data: Record<string, unknown>;
  onChange: (d: Record<string, unknown>) => void;
}) {
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
        Use <code className="bg-slate-100 px-1">$inputs</code> to access mapped
        input variables.
      </p>
    </div>
  );
}

function TemplateConfig({
  data,
  onChange,
}: {
  data: Record<string, unknown>;
  onChange: (d: Record<string, unknown>) => void;
}) {
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

function KnowledgeRetrievalConfig({
  appId,
  data,
  onChange,
}: {
  appId: string | null;
  data: Record<string, unknown>;
  onChange: (d: Record<string, unknown>) => void;
}) {
  const [bindings, setBindings] = useState<AppDatasetBindingDto[]>([]);

  useEffect(() => {
    if (!appId) {
      setBindings([]);
      return;
    }

    listAppDatasets(appId)
      .then(({ data }) => setBindings(data))
      .catch(() => setBindings([]));
  }, [appId]);

  const selectedDatasetIds = Array.isArray(data.datasetIds)
    ? data.datasetIds.filter(
        (value): value is string => typeof value === "string"
      )
    : [];

  return (
    <div className="flex flex-col gap-3">
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-slate-700">Query Template</span>
        <textarea
          className="border border-slate-300 rounded-md p-2 text-xs h-20"
          placeholder="{{start-1.query}}"
          value={(data.queryTemplate as string) || "{{start-1.query}}"}
          onChange={(e) => onChange({ ...data, queryTemplate: e.target.value })}
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-slate-700">Retrieval Mode</span>
        <select
          className="border border-slate-300 rounded-md p-2 text-sm"
          value={(data.retrievalMode as string) || "keyword"}
          onChange={(e) => onChange({ ...data, retrievalMode: e.target.value })}
        >
          <option value="keyword">keyword</option>
          <option value="semantic">semantic</option>
          <option value="hybrid">hybrid</option>
        </select>
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-slate-700">Dataset IDs</span>
        <input
          type="text"
          className="border border-slate-300 rounded-md p-2 text-sm font-mono"
          placeholder="留空则使用当前应用绑定的全部知识库"
          value={selectedDatasetIds.join(", ")}
          onChange={(e) =>
            onChange({
              ...data,
              datasetIds: e.target.value
                .split(",")
                .map((value) => value.trim())
                .filter(Boolean),
            })
          }
        />
        <span className="text-xs text-slate-400">
          留空时自动使用当前 app 的绑定知识库。
        </span>
      </label>
      {bindings.length > 0 && (
        <div className="rounded-md bg-slate-50 border border-slate-200 px-3 py-2 text-xs text-slate-600">
          <div className="font-medium text-slate-700">当前可用绑定</div>
          <div className="mt-1 space-y-1">
            {bindings.map((binding) => (
              <div key={binding.id} className="font-mono">
                {binding.dataset.id} · {binding.dataset.name}
              </div>
            ))}
          </div>
        </div>
      )}
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-slate-700">Top K</span>
        <input
          type="number"
          className="border border-slate-300 rounded-md p-2 text-sm"
          value={(data.topK as number) || 4}
          onChange={(e) => onChange({ ...data, topK: Number(e.target.value) })}
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-slate-700">Score Threshold</span>
        <input
          type="number"
          step="0.01"
          className="border border-slate-300 rounded-md p-2 text-sm"
          value={(data.scoreThreshold as number) ?? 0.15}
          onChange={(e) =>
            onChange({ ...data, scoreThreshold: Number(e.target.value) })
          }
        />
      </label>
    </div>
  );
}

function EndConfig({
  data,
  onChange,
}: {
  data: Record<string, unknown>;
  onChange: (d: Record<string, unknown>) => void;
}) {
  return (
    <div className="flex flex-col gap-3">
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-slate-700">
          Output Mappings (JSON)
        </span>
        <textarea
          className="border border-slate-300 rounded-md p-2 text-xs font-mono h-24"
          placeholder='{"result": "llm-1.text"}'
          value={JSON.stringify(data.outputs ?? {}, null, 2)}
          onChange={(e) => {
            try {
              onChange({ ...data, outputs: JSON.parse(e.target.value) });
            } catch {
              /* invalid JSON */
            }
          }}
        />
      </label>
      <p className="text-xs text-slate-400">
        Map output variable names to node field references like {"nodeId.field"}
      </p>
    </div>
  );
}

const placeholderConfig = () => (
  <p className="text-sm text-slate-500">Configuration coming soon</p>
);

const configRenderers: Record<
  NodeType,
  (
    data: Record<string, unknown>,
    onChange: (d: Record<string, unknown>) => void,
    appId: string | null
  ) => ReactNode
> = {
  start: (d, o) => <StartConfig data={d} onChange={o} />,
  llm: (d, o) => <LLMConfig data={d} onChange={o} />,
  "if-else": (d, o) => <IfElseConfig data={d} onChange={o} />,
  end: (d, o) => <EndConfig data={d} onChange={o} />,
  http: (d, o) => <HttpConfig data={d} onChange={o} />,
  code: (d, o) => <CodeConfig data={d} onChange={o} />,
  template: (d, o) => <TemplateConfig data={d} onChange={o} />,
  "knowledge-retrieval": (d, o, appId) => (
    <KnowledgeRetrievalConfig appId={appId} data={d} onChange={o} />
  ),
  iteration: placeholderConfig,
};

export function NodeConfigPanel() {
  const nodes = useWorkflowStore((s) => s.nodes);
  const selectedNodeId = useWorkflowStore((s) => s.selectedNodeId);
  const selectNode = useWorkflowStore((s) => s.selectNode);
  const updateNodeData = useWorkflowStore((s) => s.updateNodeData);
  const appId = useWorkflowStore((s) => s.appId);

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
        {renderer(node.data, handleChange, appId)}
      </div>
      <div className="px-4 py-3 border-t border-slate-200 text-xs text-slate-400">
        Node ID: <code className="text-slate-600">{node.id}</code>
      </div>
    </div>
  );
}
