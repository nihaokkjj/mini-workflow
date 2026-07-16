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
        <span className={labelClass}>输入字段（JSON）</span>
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
        格式：[{"{"}"variable": "query", "label": "用户问题", "type":
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
          name: `${selectedModel}（当前工作流）`,
          provider: "自定义",
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
        <span className={labelClass}>模型</span>
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
          服务商：{selectedOption?.provider ?? "OpenAI 兼容"}
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
        <span className={labelClass}>系统提示词</span>
        <textarea
          className={`${inputClass} h-20 text-xs`}
          value={(data.systemPrompt as string) || "你是一个有帮助的助手。"}
          onChange={(e) => onChange({ ...data, systemPrompt: e.target.value })}
        />
      </label>
      <label className="flex flex-col gap-1">
        <span className={labelClass}>用户提示词</span>
        <textarea
          className={`${inputClass} h-20 text-xs`}
          placeholder="例如：{{start.query}}"
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
        <span className={labelClass}>条件表达式</span>
        <input
          type="text"
          className={`${inputClass} font-mono`}
          placeholder="例如：{{llm-1.text}} > 0.5"
          value={(data.condition as string) || ""}
          onChange={(e) => onChange({ ...data, condition: e.target.value })}
        />
      </label>
      <p className={hintClass}>
        支持的操作符：== != &gt; &lt; &gt;= &lt;= contains
        <br />
        使用 {"{{nodeId.field}}"} 引用上游变量。
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
        <span className={labelClass}>请求方法</span>
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
        <span className={labelClass}>请求头（JSON）</span>
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
        <span className={labelClass}>请求体</span>
        <textarea
          className={`${inputClass} h-20 font-mono text-xs`}
          value={(data.body as string) || ""}
          onChange={(e) => onChange({ ...data, body: e.target.value })}
        />
      </label>
      <label className="flex flex-col gap-1">
        <span className={labelClass}>超时时间（ms）</span>
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
        <span className={labelClass}>JavaScript 代码</span>
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
        访问映射后的输入变量。
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
        <span className={labelClass}>模板</span>
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

function IterationConfig({
  data,
  onChange,
}: {
  data: Record<string, unknown>;
  onChange: (d: Record<string, unknown>) => void;
}) {
  return (
    <div className="flex flex-col gap-3">
      <label className="flex flex-col gap-1">
        <span className={labelClass}>数据项</span>
        <textarea
          className={`${inputClass} h-24 font-mono text-xs`}
          placeholder='$start-1.items or ["one", "two"]'
          value={(data.items as string) || ""}
          onChange={(e) => onChange({ ...data, items: e.target.value })}
        />
      </label>
      <label className="flex flex-col gap-1">
        <span className={labelClass}>单项模板</span>
        <textarea
          className={`${inputClass} h-24 font-mono text-xs`}
          placeholder="{{index}}. {{item.name}}"
          value={(data.itemTemplate as string) || ""}
          onChange={(e) => onChange({ ...data, itemTemplate: e.target.value })}
        />
      </label>
      <label className="flex flex-col gap-1">
        <span className={labelClass}>拼接符</span>
        <input
          type="text"
          className={`${inputClass} font-mono`}
          placeholder="\n"
          value={(data.joinWith as string) ?? "\n"}
          onChange={(e) => onChange({ ...data, joinWith: e.target.value })}
        />
      </label>
      <p className={hintClass}>
        使用 $nodeId.items 引用数组输出，或直接填写 JSON 数组。模板变量：
        {"{{item}}"}、{"{{item.field}}"}、{"{{index}}"}。
      </p>
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
        <span className={labelClass}>查询模板</span>
        <textarea
          className={`${inputClass} h-20 text-xs`}
          placeholder="{{start-1.query}}"
          value={(data.queryTemplate as string) || "{{start-1.query}}"}
          onChange={(e) => onChange({ ...data, queryTemplate: e.target.value })}
        />
      </label>
      <label className="flex flex-col gap-1">
        <span className={labelClass}>检索模式</span>
        <select
          className={`${inputClass} bg-white/[0.12]`}
          value={(data.retrievalMode as string) || "keyword"}
          onChange={(e) => onChange({ ...data, retrievalMode: e.target.value })}
        >
          <option value="keyword">关键词</option>
          <option value="semantic">语义</option>
          <option value="hybrid">混合</option>
        </select>
      </label>
      <div className="flex flex-col gap-2 rounded-lg border border-violet-200 bg-white/90 p-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-sm font-medium text-[#2f2147]">知识库</div>
            <p className="mt-1 text-xs text-[#7b6b9d]">
              选择一个或多个知识库后，将只从所选知识库检索。清空选择则使用全部已绑定知识库。
            </p>
          </div>
          {!isUsingAllBoundDatasets && (
            <button
              type="button"
              onClick={() => onChange(clearExplicitDatasetSelection(data))}
              className="rounded-md bg-violet-50 px-2.5 py-1 text-xs font-medium text-[#5e4b85] ring-1 ring-violet-200 hover:bg-violet-100"
            >
              使用全部
            </button>
          )}
        </div>
        <div className="rounded-md border border-violet-200 bg-violet-50 px-3 py-2 text-xs text-[#5e4b85]">
          {isUsingAllBoundDatasets
            ? `使用全部 ${bindings.length} 个已绑定知识库`
            : `使用 ${selectedDatasetIds.length} 个已选知识库`}
        </div>
        {bindings.length === 0 ? (
          <div className="rounded-md border border-dashed border-violet-200 bg-white/90 px-3 py-4 text-sm text-[#7b6b9d]">
            此应用还没有绑定知识库。请先从编辑器顶部绑定知识库。
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
            此工作流仍引用未绑定的知识库：{staleDatasetIds.join(", ")}。
            请先清空选择或重新绑定后再运行。
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
        <span className={labelClass}>分数阈值</span>
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
        <span className={labelClass}>输出映射（JSON）</span>
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
        将输出变量名映射到节点字段引用，例如 {"nodeId.field"}。
      </p>
    </div>
  );
}

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
  iteration: (d, o) => <IterationConfig data={d} onChange={o} />,
  "knowledge-retrieval": (d, o, appDatasets) => (
    <KnowledgeRetrievalConfig bindings={appDatasets} data={d} onChange={o} />
  ),
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
          {node.type.toUpperCase()} 配置
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
        节点 ID：<code className="font-mono text-[#5e4b85]">{node.id}</code>
      </div>
    </div>
  );
}
