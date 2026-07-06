# 前端状态管理架构设计

**日期**: 2026-07-06  
**范围**: mini-dify 前端应用架构（状态管理层）  
**目标**: 理清 ReactFlow 画布状态、运行时状态、服务器状态之间的边界，为 Phase 3/4 的节点扩展、对话页、UI 打磨提供清晰的状态管理基础。

---

## 1. 背景与问题

当前前端状态管理存在以下问题：

- `workflow.store.ts` 混合了画布状态（`nodes` / `edges` / `selectedNodeId`）、运行时状态（`isRunning` / `events` / `executingNodeId`）、应用数据（`appDatasets`），职责不清。
- `WorkflowCanvas.tsx` 同时使用 ReactFlow 本地状态（`useNodesState` / `useEdgesState`）和 Zustand store，存在双写和同步风险。
- `api.ts` 既承担 REST 请求，又内联了两套 SSE 流式解析逻辑，随着功能增加会越来越臃肿。
- 服务器数据没有统一缓存层，切换页面会重复请求，跨组件共享数据困难。

## 2. 总体决策：按状态类型分层

采用 **方案 A：按状态类型分层**。所有状态按“它是什么”而不是“它在哪个页面”分类，每一类有明确的主人。

| 状态类型                                       | 负责人                            | 技术选择                                                     |
| ---------------------------------------------- | --------------------------------- | ------------------------------------------------------------ |
| 画布状态（nodes/edges/选中态）                 | ReactFlow 原生 + Zustand UI store | `useNodesState` / `useEdgesState` + `stores/canvas.store.ts` |
| 运行时状态（run/events/executingNodeId）       | 独立 Zustand store                | `stores/run.store.ts`                                        |
| 服务器状态（apps/workflows/conversations/...） | TanStack Query                    | `queries/<domain>/`                                          |
| 业务组合逻辑                                   | 各 feature 自己组装               | `features/<feature>/`                                        |

### 2.1 三条硬边界

1. `services/` 只发请求、不缓存、不决策。
2. `queries/` 只封装 TanStack Query（缓存、失效、轮询、乐观更新）。
3. `stores/` 只存客户端瞬时状态，不直接调 API。

## 3. 目录结构

```
frontend/src/
├── components/                 # 纯 UI 组件（Button、Toast、Layout 等）
├── features/                   # 业务特性，只组合状态层
│   ├── workflow-canvas/
│   │   ├── canvas/             # 画布状态与交互
│   │   │   ├── useCanvasState.ts      # ReactFlow nodes/edges + 序列化
│   │   │   ├── useNodeSelection.ts    # 选中节点、打开配置面板
│   │   │   └── nodeTypes.ts           # 节点组件注册表
│   │   ├── run/                # 运行时逻辑
│   │   │   ├── useRunStore.ts         # 运行状态（Zustand）
│   │   │   └── useRunStream.ts        # SSE 执行与取消
│   │   ├── components/         # 画布组件
│   │   └── nodes/              # 各节点 React 组件
│   ├── chat/
│   ├── app-datasets/
│   └── retrieval-debug/
├── pages/                      # 页面路由组件，尽量薄
├── queries/                    # TanStack Query：按领域聚合
│   ├── apps/
│   ├── workflows/
│   ├── runs/
│   ├── conversations/
│   ├── datasets/
│   └── models/
├── services/                   # 原始 API 客户端
│   ├── api.ts                  # axios 实例 + REST API
│   └── sse.ts                  # 通用 SSE 解析与取消
├── stores/                     # Zustand：纯客户端 UI/运行时状态
│   ├── canvas.store.ts
│   ├── run.store.ts
│   └── ui.store.ts
└── types/                      # 共享 DTO/类型
```

## 4. 画布状态层

### 4.1 职责划分

| 状态                                   | 归属                                            | 原因                                 |
| -------------------------------------- | ----------------------------------------------- | ------------------------------------ |
| `nodes` / `edges`                      | ReactFlow `useNodesState` / `useEdgesState`     | 避免双写同步，ReactFlow 内部优化最好 |
| `selectedNodeId` / `isConfigPanelOpen` | `stores/canvas.store.ts`                        | 配置面板是独立组件，需要全局可访问   |
| `nodeTypes` 注册表                     | `features/workflow-canvas/canvas/nodeTypes.ts`  | 静态映射，不是状态                   |
| 节点 ID 计数器                         | `features/workflow-canvas/canvas/useNodeIds.ts` | 画布局部工具                         |

### 4.2 `stores/canvas.store.ts`

```ts
interface CanvasStore {
  selectedNodeId: string | null;
  isConfigPanelOpen: boolean;
  selectNode: (id: string | null) => void;
  closeConfigPanel: () => void;
}
```

### 4.3 `features/workflow-canvas/canvas/useCanvasState.ts`

```ts
function useCanvasState() {
  const [nodes, setNodes, onNodesChange] = useNodesState<NodeConfig>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<EdgeConfig>([]);
  const { selectNode } = useCanvasStore();

  const loadGraph = (graph: Graph) => {
    setNodes(graph.nodes);
    setEdges(graph.edges);
  };

  const getGraph = () => ({ nodes, edges });

  const updateNodeData = (id: string, data: Partial<NodeConfig["data"]>) => {
    setNodes((nds) =>
      nds.map((n) => (n.id === id ? { ...n, data: { ...n.data, ...data } } : n))
    );
  };

  const onConnect = (connection: Connection) => {
    setEdges((eds) => addEdge(connection, eds));
  };

  return {
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    onConnect,
    loadGraph,
    getGraph,
    updateNodeData,
    selectNode,
  };
}
```

### 4.4 与服务器状态协作

- **加载**：`queries/workflows/useWorkflow.ts` 拉取 `WorkflowDto`，组件调用 `loadGraph(data.graph)`。
- **保存**：组件调用 `getGraph()`，提交给 `queries/workflows/useSaveWorkflow.ts` 的 mutation。
- 画布层**不直接调用** `api.ts`，只通过 `queries/` 交互。

## 5. 运行时状态层

### 5.1 `stores/run.store.ts`

集中所有执行期状态：

```ts
interface RunStore {
  isRunning: boolean;
  currentRunId: string | null;
  executingNodeId: string | null;
  events: GraphEngineEvent[];
  outputs: Record<string, unknown> | null;
  error: string | null;

  startRun: (runId: string) => void;
  addEvent: (e: GraphEngineEvent) => void;
  setExecutingNode: (id: string | null) => void;
  setOutputs: (o: Record<string, unknown>) => void;
  setError: (msg: string) => void;
  finishRun: () => void;
  cancelRun: () => void;
  resetRun: () => void;
}
```

设计要点：

- `abortController` 不放进 store（不可序列化），由 hook 持有。
- `events` 只保留当前这次运行的流事件，切换对话时 `resetRun()`。

### 5.2 `services/sse.ts`：通用 SSE 封装

把 `api.ts` 里两处重复的 SSE 解析逻辑抽到一处：

```ts
export function subscribeToJsonStream<T>(
  url: string,
  handlers: {
    onEvent: (event: T) => void;
    onDone: () => void;
    onError: (err: string) => void;
    signal?: AbortSignal;
  }
): AbortController;
```

### 5.3 `features/workflow-canvas/run/useRunStream.ts`

```ts
function useRunStream() {
  const {
    startRun,
    addEvent,
    setExecutingNode,
    setOutputs,
    setError,
    finishRun,
    cancelRun,
    resetRun,
  } = useRunStore();
  const abortRef = useRef<AbortController | null>(null);
  const startMutation = useStartRun();

  const runWorkflow = async (
    workflowId: string,
    inputs: Record<string, unknown>
  ) => {
    resetRun();
    const { runId } = await startMutation.mutateAsync({ workflowId, inputs });
    startRun(runId);

    abortRef.current = subscribeToJsonStream<GraphEngineEvent>(
      `/runs/${runId}/stream`,
      {
        onEvent: (e) => {
          addEvent(e);
          if (e.event === "node_start") setExecutingNode(e.nodeId);
          if (e.event === "node_end") setExecutingNode(null);
          if (e.event === "graph_end") setOutputs(e.outputs);
        },
        onDone: finishRun,
        onError: setError,
      }
    );
  };

  const stopRun = () => {
    abortRef.current?.abort();
    cancelRun();
  };

  return { runWorkflow, stopRun };
}
```

### 5.4 对话页复用

对话页的流式运行也复用同一个 `run.store.ts`，但调用不同 API：

```ts
// features/chat/useChatStream.ts
function useChatStream() {
  const runState = useRunStore();
  // ... 类似 useRunStream，但调用 /conversations/:id/runs
}
```

## 6. 服务器状态层（TanStack Query）

所有来自后端的数据都按领域聚合到 `queries/<domain>/`。

### 6.1 目录结构

```
queries/
├── apps/
│   ├── keys.ts
│   ├── useApps.ts
│   ├── useApp.ts
│   ├── useCreateApp.ts
│   └── useDeleteApp.ts
├── workflows/
│   ├── keys.ts
│   ├── useWorkflow.ts
│   └── useSaveWorkflow.ts
├── runs/
│   ├── keys.ts
│   ├── useStartRun.ts
│   └── useCancelRun.ts
├── conversations/
│   ├── keys.ts
│   ├── useConversations.ts
│   ├── useCreateConversation.ts
│   ├── useMessages.ts
│   └── useDeleteConversation.ts
├── datasets/
│   ├── keys.ts
│   ├── useDatasets.ts
│   ├── useAppDatasets.ts
│   ├── useBindDataset.ts
│   └── useDebugRetrieve.ts
└── models/
    ├── keys.ts
    └── useModels.ts
```

### 6.2 标准模式

```ts
// queries/apps/keys.ts
export const appKeys = {
  all: ["apps"] as const,
  detail: (id: string) => [...appKeys.all, id] as const,
};

// queries/apps/useApps.ts
export function useApps() {
  return useQuery({ queryKey: appKeys.all, queryFn: listApps });
}

// queries/apps/useCreateApp.ts
export function useCreateApp() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createApp,
    onSuccess: () => qc.invalidateQueries({ queryKey: appKeys.all }),
  });
}
```

### 6.3 关键收益

- **缓存统一**：App 列表、对话列表都有自动缓存，切换页面不再重复请求。
- **失效明确**：创建/删除/更新后 `invalidateQueries` 刷新相关列表。
- **加载态统一**：组件里用 `isPending` / `isFetching` 而不是自己维护 spinner。

## 7. 特性组织与数据流

### 7.1 `features/` 职责

每个 feature 内部自己组合状态层，不依赖其他 feature 的内部文件：

```ts
// features/workflow-canvas/index.ts
export { WorkflowCanvas } from "./components/WorkflowCanvas";
export { useCanvasState } from "./canvas/useCanvasState";
export { useRunStream } from "./run/useRunStream";
```

跨 feature 通信只允许通过：

- `queries/`（共享服务器状态）
- `stores/`（共享客户端状态）
- `types/`（共享类型）

### 7.2 加载并保存工作流

```tsx
function AppEditorPage() {
  const { appId } = useParams();
  const { data: app } = useApp(appId);
  const { data: workflow } = useWorkflow(appId);
  const save = useSaveWorkflow();
  const canvas = useCanvasState();

  useEffect(() => {
    if (workflow) canvas.loadGraph(workflow.graph);
  }, [workflow]);

  const handleSave = () => {
    save.mutate({ appId, graph: canvas.getGraph() });
  };

  return (
    <WorkflowCanvas
      workflowId={workflow?.id}
      canvas={canvas}
      onSave={handleSave}
    />
  );
}
```

### 7.3 运行工作流

```tsx
function WorkflowCanvas({ workflowId, canvas, onSave }) {
  const run = useRunStream();
  const { isRunning, executingNodeId, events } = useRunStore();

  return (
    <>
      <button onClick={() => run.runWorkflow(workflowId, {})}>Run</button>
      {isRunning && <button onClick={run.stopRun}>Stop</button>}
      <ReactFlow
        nodes={canvas.nodes}
        edges={canvas.edges}
        onNodesChange={canvas.onNodesChange}
        onEdgesChange={canvas.onEdgesChange}
        onConnect={canvas.onConnect}
        nodeTypes={nodeTypes}
      />
      <WorkflowRunResultsPanel events={events} />
    </>
  );
}
```

### 7.4 对话页

```tsx
function ChatPage() {
  const { appId } = useParams();
  const { data: conversations } = useConversations(appId);
  const [selectedConversationId, setSelectedConversationId] = useState<
    string | null
  >(null);
  const chat = useChatStream();

  const send = (text: string) => {
    if (!selectedConversationId) return;
    chat.run(appId, selectedConversationId, { input: text });
  };

  return (
    <div>
      <ConversationList
        items={conversations}
        selectedId={selectedConversationId}
        onSelect={setSelectedConversationId}
      />
      <MessageThread events={chat.events} />
      <Input
        onSend={send}
        disabled={chat.isRunning || !selectedConversationId}
      />
    </div>
  );
}
```

## 8. 错误处理

| 错误来源       | 处理方式                                                      |
| -------------- | ------------------------------------------------------------- |
| API 请求失败   | TanStack Query 返回 `error`，UI 用 `error.message` 展示 Toast |
| SSE 运行错误   | `run.store.ts` 的 `error` 字段，组件读取后展示                |
| 节点执行错误   | 后端 `event: "error"` 进入 `events` 数组，结果面板显示        |
| 未捕获组件错误 | 页面级 React Error Boundary 兜底                              |

统一约定：

- `services/api.ts` 里 axios 响应拦截器把后端错误 message 透传出来。
- 组件层不 `try/catch`，统一消费 `error` 状态。

## 9. 测试策略

继续沿用已有的 `*.model.spec.ts` 模式，但分层测试：

```
features/workflow-canvas/run/run.model.spec.ts        # 运行时状态转换
features/workflow-canvas/canvas/canvas.model.spec.ts  # 节点/边操作
queries/apps/apps.queries.spec.ts                     # Query hooks（mock api.ts）
stores/run.store.spec.ts                              # Zustand store 纯逻辑
```

测试原则：

- **测 model/store，不直接测组件**。
- 组件测试只做“渲染 + 交互触发”。
- Mock `services/api.ts`，不 Mock Zustand store。

## 10. 迁移计划

按“先搭新架子，再拆旧代码”分四步走，每步都可独立合并。

### Phase 1：搭建 Query 基础设施（1-2 天）

- 在 `main.tsx` 注入 `QueryClientProvider`。
- 新建 `queries/apps/`、`queries/workflows/`，把 `AppListPage`、`AppEditorPage` 里的直接 `api.ts` 调用迁过去。
- `workflow.store.ts` 暂时不动，保证旧逻辑可用。

### Phase 2：拆分运行时状态（2-3 天）

- 新建 `services/sse.ts` 通用 SSE 封装。
- 新建 `stores/run.store.ts`。
- 新建 `features/workflow-canvas/run/useRunStream.ts`。
- 改造 `WorkflowCanvas.tsx`：用 `useRunStore` 替代本地 `currentRunId`、`streamControllerRef`、`output`。
- 从 `workflow.store.ts` 删除 `events / isRunning / executingNodeId / outputs`。

### Phase 3：拆分画布状态（2-3 天）

- 新建 `stores/canvas.store.ts`。
- 新建 `features/workflow-canvas/canvas/useCanvasState.ts`。
- 改造 `WorkflowCanvas.tsx`：用 ReactFlow 原生 state 管 nodes/edges，用 canvas store 管 selectedNodeId。
- 从 `workflow.store.ts` 删除 `nodes / edges / selectedNodeId / appDatasets`。
- 删除或重命名 `workflow.store.ts`（如果还有少量 UI 状态，可并入 `ui.store.ts`）。

### Phase 4：迁移剩余特性（2-3 天）

- `ChatPage` 使用 `queries/conversations/` + `features/chat/useChatStream.ts`。
- `AppDatasetBindingsDrawer` 使用 `queries/datasets/`。
- `RetrievalDebugDrawer` 使用 `queries/datasets/useDebugRetrieve.ts`。
- 补充错误边界和测试。

## 11. 附录：被否决的方案

### 方案 B：按功能模块拆分 store

每个 feature 一个独立的 Zustand store + Query hooks。优点是高内聚，但同一个服务器数据可能被多个 feature 缓存，容易出现不同步；当前项目规模下过度拆分。

### 方案 C：最小改动，逐步迁移

保留现有 `workflow.store.ts`，内部按 slice 重构。改动最小，但历史包袱留在原地，状态来源不统一，长期会变成“半吊子”架构。

---

**结论**: 采用方案 A，按状态类型分层，使用 Zustand 管理客户端 UI/运行时状态，TanStack Query 管理服务器状态，ReactFlow 原生状态管理画布，最终形成 `stores/` + `queries/` + `features/` 三层清晰的结构。
