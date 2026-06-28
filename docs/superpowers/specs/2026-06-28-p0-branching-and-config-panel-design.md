# P0: 分支路由 + 配置面板 设计文档

**日期**: 2026-06-28
**范围**: Phase 2.1-2.4, 2.6-2.9 (见 ROADMAP.md)
**源**: 参照 dify 项目的 graphon 引擎和 workflow 前端模式

## 1. 概述

实现最简条件分支功能，让工作流支持 if-else 条件路由，并增加节点配置面板使用户能修改节点参数。

**范围**:
- 后端: IfElseNode、分支路由、图验证、执行限制、变量语义完善
- 前端: IfElseNodeComponent、Edge sourceHandle 支持、NodeConfigPanel、执行高亮

**不在范围**:
- 多条件 AND/OR 组合 (留到后续)
- 并行执行
- Chat 界面
- 其他节点类型 (HttpNode, CodeNode 等)

## 2. 架构

```
画布拖拽 if-else 节点
       ↓
配置条件表达式 (NodeConfigPanel)
       ↓
保存 Graph JSON (nodes + edges, edges 带 sourceHandle)
       ↓
Run 时: GraphEngine 拓扑排序 → 顺序执行
       ↓ IfElseNode 输出 { branch: "true"|"false" }
       ↓ 引擎根据 edge.sourceHandle 匹配 branch
       ↓ 跳过不活跃分支, 继续执行活跃分支
       ↓ 最终到达 End 节点, 输出结果
```

## 3. 后端设计

### 3.1 IfElseNode (`backend/src/core/nodes/if-else.node.ts` 新建)

```typescript
// 注册到 NodeFactory: NodeFactory.register("if-else", IfElseNode);

// 关键行为:
// 1. 从 config.data.condition 读取条件表达式 (如 "{{llm-1.text}} > 0.5")
// 2. 调用 this.resolveTemplate() 将 {{...}} 替换为实际值
// 3. 调用 evaluateCondition() 安全求值, 返回 true/false
// 4. 输出 { result, branch: "true"|"false", condition }

// 条件表达式安全求值
// 用正则 /^(.+?)\\s*(==|!=|>=|<=|>|<|contains)\\s*(.+)$/ 解析
// 将两端 trim 后尝试 parseFloat, 成功则数值比较, 否则字符串比较
// 不在 eval() 中执行
```

**参考 dify**: 条件判断的核心逻辑在 `graphon.nodes.if_else` 中，但做了多条件组合。mini-dify 简化为单个表达式。

### 3.2 引擎分支路由 (修改 `graph-engine.ts`)

在 `run()` 方法中，每个节点执行完成后:

```typescript
// 伪代码
for await (const event of nodeInstance.run()) { yield event; }

const outputs = pool.getNodeOutput(nodeId);

// 计算活跃的下游目标
const activeTargets = new Set<string>();
for (const edge of graph.edges) {
  if (edge.source !== nodeId) continue;
  if (outputs?.branch) {
    // 有分支标记 → 只匹配对应 handle
    if (edge.sourceHandle === outputs.branch) {
      activeTargets.add(edge.target);
    }
  } else {
    // 无分支标记 → 所有下游都执行
    activeTargets.add(edge.target);
  }
}

// 跳过不活跃的节点, yield { event: "node_skipped", ... }
```

**新增事件类型**:
```typescript
// shared/src/index.ts 中添加:
| { event: "node_skipped"; nodeId: string; reason: string; timestamp: number }
```

### 3.3 图验证 (修改 `graph-engine.ts`)

新增 `validate(): string | null` 方法:

1. Start 节点必须有且只有一个
2. End 节点必须有且至少一个
3. 所有非 Start 节点入度 >= 1 (不可有孤立节点)
4. 所有节点的 type 均在 NodeFactory 中注册

验证失败时 `run()` 直接 yield error 事件，不执行任何节点。

NodeFactory 需新增静态方法: `static has(type: string): boolean`

### 3.4 执行限制 (修改 `graph-engine.ts`)

在 `run()` 中注入:
- `maxSteps` (默认 50): 每执行一个节点 counter++，超过抛 `ExecutionLimitError`
- `maxTime` (默认 30 秒): 用 `Date.now() - startTime` 检查，超时自动中止

```typescript
// 新增自定义错误
export class ExecutionLimitError extends Error {
  constructor(msg: string) { super(msg); this.name = "ExecutionLimitError"; }
}
```

### 3.5 变量传递语义 (修改 `base.node.ts`)

**问题**: 当前 `LLMNode` 硬编码 `pool.setNodeOutput("__last_output", ...)` 作为下游输入源。分支场景下，不同分支的 LLM 会产生冲突的 `__last_output`。

**方案**: 每个节点通过 `config.data.inputs` 声明输入映射。inputs 由用户通过 NodeConfigPanel 配置，存储在 Graph JSON 的 `node.data.inputs` 中。

```typescript
// 例: LLM 节点的 data.inputs = { "prompt": "{{start.query}}" }
// BaseNode.getInputs() 解析此映射, 返回 { prompt: "解析后的值" }
// LLMNode 从 getInputs() 取值, 不再依赖 __last_output
```

移除 `__last_output` 的使用。EndNode 改为通过 `config.data.outputs`（类型: `Record<string, string>`，值是从上游节点引用的模板如 `"{{llm-1.text}}"`）选择要输出的变量。

## 4. 前端设计

### 4.1 IfElseNodeComponent (`frontend/src/features/workflow-canvas/nodes/IfElseNodeComponent.tsx` 新建)

参照 `LLMNodeComponent.tsx` 模式:

- 顶部 target Handle
- 显示条件表达式预览 (从 `data.condition` 截断)
- 两个 source Handle: `true` (绿色) 和 `false` (红色)，带标签
- 参考 dify 的 if-else node.tsx: 每个 case 有一个带标签的 NodeSourceHandle

### 4.2 Edge sourceHandle (修改 `WorkflowCanvas.tsx` 和 `workflow.store.ts`)

- `store.onConnect` 已按 `Connection` 类型处理，`sourceHandle` 和 `targetHandle` 已在 `EdgeConfig` 类型中定义
- `WorkflowCanvas.tsx` 的 `onConnect` 需传递 `conn.sourceHandle` 和 `conn.targetHandle`
- ReactFlow 的 Handle 组件需指定 `id="true"` 或 `id="false"` 区分 IfElse 分支

### 4.3 NodeConfigPanel (`frontend/src/features/workflow-canvas/NodeConfigPanel.tsx` 新建)

实现为右侧滑出抽屉:

```typescript
// 入口: 点击画布节点 → store.selectNode(nodeId)
// 渲染: 根据 node.type 选择配置表单
const configForms: Record<NodeType, (data, onChange) => JSX.Element> = {
  start: renderStartConfig,    // 输入字段列表
  llm: renderLLMConfig,       // model + systemPrompt + userPrompt
  "if-else": renderIfElseConfig, // condition 表达式
  end: renderEndConfig,       // 输出变量选择
};
```

- 关闭抽屉时 `store.selectNode(null)`
- 修改后通过 `store.updateNodeData(id, newData)` 同步到 Zustand
- 保存依然通过原有的 "Save" 按钮 (保存整个 Graph)

各节点类型的配置表单字段:

| 节点类型 | 表单字段 |
|---------|---------|
| Start | 输入字段定义: variable (变量名) + label (标签) + type (text/number/select) |
| LLM | model (模型选择下拉) + systemPrompt (文本框) + userPrompt (文本框, 支持 {{变量}}) |
| IfElse | condition (单行文本框, 如 `{{llm-1.text}} > 0.5`) |
| End | outputs 映射表: 变量名 → 模板选择器 (下拉选择上游节点输出, 生成 `{{node.field}}` 模板) |

### 4.4 执行高亮 (修改 `WorkflowCanvas.tsx`)

```typescript
// 已有 store.executingNodeId, 在 ReactFlow 节点上应用动态样式
const rfNodesWithStyle = rfNodes.map(node => {
  if (node.id === store.executingNodeId) {
    return { ...node, className: "executing" };
  }
  return node;
});

// CSS (全局样式中):
// .executing { box-shadow: 0 0 0 2px #f59e0b; animation: pulse 1.5s infinite; }
```

`node_skipped` 事件的 UI 处理: 在事件流中显示为灰色提示 "节点 X 已跳过"，节点本身不需特殊渲染（始终未执行过）。

```typescript
// WorkflowCanvas.tsx 的 subscribeToRunStream 回调中新增:
else if (event.event === "node_skipped") {
  setOutput((prev) => prev + `[Skipped: ${event.nodeId}] ${event.reason}\n`);
}
```

### 4.5 Store 改动 (修改 `workflow.store.ts`)

新增字段:
```typescript
selectedNodeId: string | null;
selectNode: (id: string | null) => void;
updateNodeData: (id: string, data: Record<string, unknown>) => void;
```

### 4.6 NodePalette 改动 (修改 `NodePalette.tsx`)

添加 if-else 节点模版:
```typescript
{ type: "if-else", label: "If/Else", color: "bg-amber-100 border-amber-400" }
```

## 5. 类型变更

### shared/src/index.ts 和对应的前端拷贝

```typescript
// GraphEngineEvent 新增
| { event: "node_skipped"; nodeId: string; reason: string; timestamp: number }

// (已有 NodeType 含 "if-else", EdgeConfig 含 sourceHandle)
```

## 6. 文件变更清单

| # | 文件 | 操作 | 描述 |
|---|------|------|------|
| 1 | `backend/src/core/nodes/if-else.node.ts` | 新建 | IfElseNode 实现 |
| 2 | `backend/src/core/engine/graph-engine.ts` | 修改 | 分支路由 + 验证 + 执行限制 |
| 3 | `backend/src/core/engine/node-factory.ts` | 修改 | 注册 if-else + has() 方法 |
| 4 | `backend/src/core/nodes/base.node.ts` | 修改 | getInputs() 解析 inputs 映射 |
| 5 | `backend/src/core/nodes/llm.node.ts` | 修改 | 使用 getInputs() 替代 __last_output |
| 6 | `backend/src/core/nodes/end.node.ts` | 修改 | 使用 data.outputs 选择输出变量 |
| 7 | `shared/src/index.ts` | 修改 | 新增 node_skipped 事件类型 |
| 8 | `frontend/src/types/index.ts` | 修改 | 同步 node_skipped 事件类型 |
| 9 | `frontend/src/features/workflow-canvas/nodes/IfElseNodeComponent.tsx` | 新建 | IfElse 节点组件 |
| 10 | `frontend/src/features/workflow-canvas/NodeConfigPanel.tsx` | 新建 | 节点配置抽屉 |
| 11 | `frontend/src/features/workflow-canvas/WorkflowCanvas.tsx` | 修改 | edge sourceHandle + 执行高亮 + NodeConfigPanel 集成 |
| 12 | `frontend/src/stores/workflow.store.ts` | 修改 | selectedNodeId + updateNodeData |
| 13 | `frontend/src/features/workflow-canvas/palette/NodePalette.tsx` | 修改 | 添加 if-else 节点 |

## 7. 执行流程完整示例

```
Graph: Start → IfElse → [LLM-A (true), LLM-B (false)] → End

1. validate() 通过
2. 拓扑排序: [start-1, ifelse-1, llm-a, llm-b, end-1]
3. 执行 start-1 → outputs = { input: "hello" }
4. 执行 ifelse-1:
   - resolveTemplate("{{start-1.input}} > 0") → "hello > 0"
   - evaluateCondition("hello > 0") → false (字符串不能比较数字)
   - setNodeOutput → { branch: "false" }
5. 计算 activeTargets:
   - edge ifelse-1→llm-a (sourceHandle="true") → 不匹配 "false" → 跳过
   - edge ifelse-1→llm-b (sourceHandle="false") → 匹配 → 加入活跃
6. llm-a → yield node_skipped
7. 执行 llm-b → 正常执行
8. 执行 end-1 → 收集输出
9. yield graph_end
```

## 8. 测试策略

- 单元测试: `evaluateCondition()` 各操作符的边界情况
- 集成测试: 引擎执行包含 IfElse 的简单图 (true/false 两条路径)
- 验证测试: 无效图结构的拒绝 (无 Start、多 Start、孤立节点)
- 前端: 手动测试拖拽 if-else 节点 + 配置条件 + 运行

## 9. 风险与取舍

| 风险 | 应对 |
|------|------|
| 条件表达式中变量不存在 | 模板渲染保留 `{{...}}` 原样, 条件求值失败抛错 |
| 分支后两条路径汇合到同一节点 | 只要有一条活跃路径到达就执行 (OR 语义) |
| `node_skipped` 事件前端未处理 | 前端 addEvent 按类型 switch, 未匹配的忽略即可 |
