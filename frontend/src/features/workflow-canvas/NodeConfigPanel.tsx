import { type ReactNode } from "react";
import type { NodeType, NodeConfig, AppDatasetBindingDto } from "../../types";
import {
  clearExplicitDatasetSelection,
  readSelectedDatasetIds,
  toggleExplicitDatasetSelection,
} from "./knowledge-retrieval-config.model";

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
    id: "gpt-5.4",
    name: "OpenAI GPT-5.4",
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

/* ---------- 共享输入样式：提亮表单层级，减少纯黑控件 ---------- */
const inputClass =
  "rounded-lg border border-violet-200 bg-white px-3 py-2 text-sm text-[#2f2147] placeholder:text-[#8b7aa9] focus:border-accent focus:outline-none focus:ring-4 focus:ring-accent/10 transition";
const labelClass =
  "text-xs font-semibold uppercase tracking-[0.8px] text-[#6b5a8b]";
const hintClass = "text-xs text-[#7b6b9d]";

function StartConfig({
  data,
  onChange,
}: {
  data: Record<string, unknown>;
  onChange: (d: Record<string, unknown>) => void;
}) {
  return (
    <div className="flex flex-col gap-3">
      <label className="flex flex-col gap-1">
        <span className={labelClass}>Input Fields (JSON)</span>
        <textarea
          className={`${inputClass} h-24 font-mono text-xs`}
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
      <p className={hintClass}>
        Format: [{"{"}"variable": "query", "label": "User Query", "type":
        "text-input"{"}"}]
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
    onChange({ ...data, model: modelId, baseURL: nextOption?.baseURL ?? "" });
  };

  return (
    <div className="flex flex-col gap-3">
      <label className="flex flex-col gap-1">
        <span className={labelClass}>Model</span>
        <select
          className={`${inputClass} bg-white/[0.12]`}
          value={selectedModel}
          onChange={(e) => handleModelChange(e.target.value)}
        >
          {modelOptions.map((model) => (
            <option key={model.id} value={model.id}>
              {model.name}
            </option>
          ))}
        </select>
        <span className={hintClass}>
          Provider: {selectedOption?.provider ?? "OpenAI-compatible"}
        </span>
      </label>
      <label className="flex flex-col gap-1">
        <span className={labelClass}>API Key</span>
        <input
          type="password"
          className={`${inputClass} font-mono`}
          placeholder="sk-..."
          value={(data.apiKey as string) || ""}
          onChange={(e) => onChange({ ...data, apiKey: e.target.value })}
        />
      </label>
      <label className="flex flex-col gap-1">
        <span className={labelClass}>Base URL</span>
        <input
          type="text"
          className={`${inputClass} font-mono`}
          placeholder="https://api.openai.com/v1"
          value={configuredBaseURL}
          onChange={(e) => onChange({ ...data, baseURL: e.target.value })}
        />
      </label>
      <label className="flex flex-col gap-1">
        <span className={labelClass}>System Prompt</span>
        <textarea
          className={`${inputClass} h-20 text-xs`}
          value={
            (data.systemPrompt as string) || "You are a helpful assistant."
          }
          onChange={(e) => onChange({ ...data, systemPrompt: e.target.value })}
        />
      </label>
      <label className="flex flex-col gap-1">
        <span className={labelClass}>User Prompt</span>
        <textarea
          className={`${inputClass} h-20 text-xs`}
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
      <label className="flex flex-col gap-1">
        <span className={labelClass}>Condition Expression</span>
        <input
          type="text"
          className={`${inputClass} font-mono`}
          placeholder="e.g. {{llm-1.text}} > 0.5"
          value={(data.condition as string) || ""}
          onChange={(e) => onChange({ ...data, condition: e.target.value })}
        />
      </label>
      <p className={hintClass}>
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
      <label className="flex flex-col gap-1">
        <span className={labelClass}>Method</span>
        <select
          className={`${inputClass} bg-white/[0.12]`}
          value={(data.method as string) || "GET"}
          onChange={(e) => onChange({ ...data, method: e.target.value })}
        >
          <option value="GET">GET</option>
          <option value="POST">POST</option>
        </select>
      </label>
      <label className="flex flex-col gap-1">
        <span className={labelClass}>URL</span>
        <input
          type="text"
          className={`${inputClass} font-mono`}
          placeholder="https://api.example.com/{{start.query}}"
          value={(data.url as string) || ""}
          onChange={(e) => onChange({ ...data, url: e.target.value })}
        />
      </label>
      <label className="flex flex-col gap-1">
        <span className={labelClass}>Headers (JSON)</span>
        <textarea
          className={`${inputClass} h-20 font-mono text-xs`}
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
      <label className="flex flex-col gap-1">
        <span className={labelClass}>Body</span>
        <textarea
          className={`${inputClass} h-20 font-mono text-xs`}
          value={(data.body as string) || ""}
          onChange={(e) => onChange({ ...data, body: e.target.value })}
        />
      </label>
      <label className="flex flex-col gap-1">
        <span className={labelClass}>Timeout (ms)</span>
        <input
          type="number"
          className={inputClass}
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
      <label className="flex flex-col gap-1">
        <span className={labelClass}>JavaScript Code</span>
        <textarea
          className={`${inputClass} h-48 font-mono text-xs`}
          placeholder="return $inputs.query.toUpperCase();"
          value={(data.code as string) || ""}
          onChange={(e) => onChange({ ...data, code: e.target.value })}
        />
      </label>
      <p className={hintClass}>
        Use{" "}
        <code className="rounded bg-white/10 px-1 text-white/50">$inputs</code>{" "}
        to access mapped input variables.
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
      <label className="flex flex-col gap-1">
        <span className={labelClass}>Template</span>
        <textarea
          className={`${inputClass} h-32 font-mono text-xs`}
          placeholder="Hello {{start.query}}!"
          value={(data.template as string) || ""}
          onChange={(e) => onChange({ ...data, template: e.target.value })}
        />
      </label>
    </div>
  );
}

function KnowledgeRetrievalConfig({
  bindings,
  data,
  onChange,
}: {
  bindings: AppDatasetBindingDto[];
  data: Record<string, unknown>;
  onChange: (d: Record<string, unknown>) => void;
}) {
  const selectedDatasetIds = readSelectedDatasetIds(data);
  const boundDatasetIds = new Set(bindings.map((binding) => binding.datasetId));
  const staleDatasetIds = selectedDatasetIds.filter(
    (datasetId) => !boundDatasetIds.has(datasetId)
  );
  const isUsingAllBoundDatasets = selectedDatasetIds.length === 0;

  return (
    <div className="flex flex-col gap-3">
      <label className="flex flex-col gap-1">
        <span className={labelClass}>Query Template</span>
        <textarea
          className={`${inputClass} h-20 text-xs`}
          placeholder="{{start-1.query}}"
          value={(data.queryTemplate as string) || "{{start-1.query}}"}
          onChange={(e) => onChange({ ...data, queryTemplate: e.target.value })}
        />
      </label>
      <label className="flex flex-col gap-1">
        <span className={labelClass}>Retrieval Mode</span>
        <select
          className={`${inputClass} bg-white/[0.12]`}
          value={(data.retrievalMode as string) || "keyword"}
          onChange={(e) => onChange({ ...data, retrievalMode: e.target.value })}
        >
          <option value="keyword">keyword</option>
          <option value="semantic">semantic</option>
          <option value="hybrid">hybrid</option>
        </select>
      </label>
      <div className="flex flex-col gap-2 rounded-lg border border-violet-200 bg-white/90 p-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-sm font-medium text-[#2f2147]">Datasets</div>
            <p className="mt-1 text-xs text-[#7b6b9d]">
              Selecting one or more datasets switches to explicit selection.
              Clear them all to use every bound dataset.
            </p>
          </div>
          {!isUsingAllBoundDatasets && (
            <button
              type="button"
              onClick={() => onChange(clearExplicitDatasetSelection(data))}
              className="rounded-md bg-violet-50 px-2.5 py-1 text-xs font-medium text-[#5e4b85] ring-1 ring-violet-200 hover:bg-violet-100"
            >
              Use all
            </button>
          )}
        </div>
        <div className="rounded-md border border-violet-200 bg-violet-50 px-3 py-2 text-xs text-[#5e4b85]">
          {isUsingAllBoundDatasets
            ? `Using all ${bindings.length} bound dataset${bindings.length === 1 ? "" : "s"}`
            : `Using ${selectedDatasetIds.length} explicitly selected dataset${selectedDatasetIds.length === 1 ? "" : "s"}`}
        </div>
        {bindings.length === 0 ? (
          <div className="rounded-md border border-dashed border-violet-200 bg-white/90 px-3 py-4 text-sm text-[#7b6b9d]">
            No dataset is bound to this app yet. Bind one from the editor header
            first.
          </div>
        ) : (
          <div className="space-y-2">
            {bindings.map((binding) => {
              const isSelected = selectedDatasetIds.includes(binding.datasetId);
              return (
                <label
                  key={binding.id}
                  className="flex cursor-pointer items-start gap-3 rounded-md border border-violet-200 bg-white/90 px-3 py-3"
                >
                  <input
                    type="checkbox"
                    className="mt-0.5 h-4 w-4 rounded border-violet-200 bg-white accent-accent"
                    checked={isSelected}
                    onChange={() =>
                      onChange(
                        toggleExplicitDatasetSelection(data, binding.datasetId)
                      )
                    }
                  />
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-[#2f2147]">
                      {binding.dataset.name}
                    </div>
                    <div className="mt-1 truncate font-mono text-[11px] text-[#8b7aa9]">
                      {binding.datasetId}
                    </div>
                  </div>
                </label>
              );
            })}
          </div>
        )}
        {staleDatasetIds.length > 0 && (
          <div className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-300">
            This workflow still references unbound datasets:{" "}
            {staleDatasetIds.join(", ")}. Clear them or re-bind them before
            running.
          </div>
        )}
      </div>
      <label className="flex flex-col gap-1">
        <span className={labelClass}>Top K</span>
        <input
          type="number"
          className={inputClass}
          value={(data.topK as number) || 4}
          onChange={(e) => onChange({ ...data, topK: Number(e.target.value) })}
        />
      </label>
      <label className="flex flex-col gap-1">
        <span className={labelClass}>Score Threshold</span>
        <input
          type="number"
          step="0.01"
          className={inputClass}
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
      <label className="flex flex-col gap-1">
        <span className={labelClass}>Output Mappings (JSON)</span>
        <textarea
          className={`${inputClass} h-24 font-mono text-xs`}
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
      <p className={hintClass}>
        Map output variable names to node field references like {"nodeId.field"}
      </p>
    </div>
  );
}

const placeholderConfig = () => (
  <p className="text-sm text-white/40">Configuration coming soon</p>
);

const configRenderers: Record<
  NodeType,
  (
    data: Record<string, unknown>,
    onChange: (d: Record<string, unknown>) => void,
    appDatasets: AppDatasetBindingDto[]
  ) => ReactNode
> = {
  start: (d, o) => <StartConfig data={d} onChange={o} />,
  llm: (d, o) => <LLMConfig data={d} onChange={o} />,
  "if-else": (d, o) => <IfElseConfig data={d} onChange={o} />,
  end: (d, o) => <EndConfig data={d} onChange={o} />,
  http: (d, o) => <HttpConfig data={d} onChange={o} />,
  code: (d, o) => <CodeConfig data={d} onChange={o} />,
  template: (d, o) => <TemplateConfig data={d} onChange={o} />,
  "knowledge-retrieval": (d, o, appDatasets) => (
    <KnowledgeRetrievalConfig bindings={appDatasets} data={d} onChange={o} />
  ),
  iteration: placeholderConfig,
};

interface NodeConfigPanelProps {
  nodeId: string;
  nodes: NodeConfig[];
  appDatasets: AppDatasetBindingDto[];
  onUpdateNodeData: (id: string, data: Record<string, unknown>) => void;
  onClose: () => void;
}

export function NodeConfigPanel({
  nodeId,
  nodes,
  appDatasets,
  onUpdateNodeData,
  onClose,
}: NodeConfigPanelProps) {
  const node = nodes.find((n) => n.id === nodeId);
  if (!node) return null;

  const renderer = configRenderers[node.type];
  if (!renderer) return null;

  const handleChange = (newData: Record<string, unknown>) => {
    onUpdateNodeData(node.id, newData);
  };

  return (
    <div className="flex h-full w-80 flex-col border-l border-violet-200/80 bg-white/70 backdrop-blur">
      <div className="flex items-center justify-between border-b border-violet-200/80 px-4 py-3">
        <h3 className="text-sm font-semibold text-[#2f2147]">
          {node.type.toUpperCase()} Configuration
        </h3>
        <button
          onClick={onClose}
          className="text-lg leading-none text-[#8b7aa9] transition hover:text-[#4b377f]"
        >
          ✕
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-4">
        {renderer(node.data, handleChange, appDatasets)}
      </div>
      <div className="border-t border-violet-200/80 px-4 py-3 text-xs text-[#7b6b9d]">
        Node ID: <code className="font-mono text-[#5e4b85]">{node.id}</code>
      </div>
    </div>
  );
}
