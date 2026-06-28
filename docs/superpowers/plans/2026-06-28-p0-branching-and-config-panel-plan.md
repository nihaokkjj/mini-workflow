# P0: 分支路由 + 配置面板 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 实现最简条件分支路由和节点配置面板，使用户能构建含 if-else 分支的工作流并通过抽屉面板配置节点参数。

**Architecture:** 后端新增 IfElseNode，引擎在执行时根据节点输出的 branch 标记和边的 sourceHandle 选择活跃路径。前端新增 NodeConfigPanel 抽屉组件，点击画布节点即可修改参数。变量传递改为声明式 inputs 映射替代 __last_output。

**Tech Stack:** NestJS + TypeScript (后端), React + ReactFlow + Zustand (前端), better-sqlite3

---

## 文件结构

| # | 文件 | 操作 | 职责 |
|---|------|------|------|
| 1 | `shared/src/index.ts` | 修改 | 新增 `node_skipped` 事件类型 |
| 2 | `frontend/src/types/index.ts` | 修改 | 同步 `node_skipped` 事件类型 |
| 3 | `backend/src/core/nodes/if-else.node.ts` | 新建 | IfElseNode: 条件求值 + 分支标记 |
| 4 | `backend/src/core/engine/node-factory.ts` | 修改 | 注册 if-else 节点 + has() 方法 |
| 5 | `backend/src/core/engine/graph-engine.ts` | 修改 | 分支路由 + 验证 + 执行限制 |
| 6 | `backend/src/core/nodes/base.node.ts` | 修改 | getInputs() 解析 inputs 映射 |
| 7 | `backend/src/core/nodes/llm.node.ts` | 修改 | 使用 getInputs() 替代 __last_output |
| 8 | `backend/src/core/nodes/end.node.ts` | 修改 | 使用 data.outputs 选择输出变量 |
| 9 | `frontend/src/stores/workflow.store.ts` | 修改 | 新增 selectedNodeId + updateNodeData |
| 10 | `frontend/src/features/workflow-canvas/nodes/IfElseNodeComponent.tsx` | 新建 | IfElse 节点组件 (两个 sourceHandle) |
| 11 | `frontend/src/features/workflow-canvas/NodeConfigPanel.tsx` | 新建 | 节点配置抽屉面板 |
| 12 | `frontend/src/features/workflow-canvas/WorkflowCanvas.tsx` | 修改 | sourceHandle 连接 + 执行高亮 + 面板集成 |
| 13 | `frontend/src/features/workflow-canvas/palette/NodePalette.tsx` | 修改 | 添加 if-else 节点模板 |

---

### Task 1: 新增 shared 类型 (node_skipped 事件)

**Files:**
- Modify: `shared/src/index.ts`
- Modify: `frontend/src/types/index.ts`

- [ ] **Step 1: shared/src/index.ts 新增事件类型**

在 `GraphEngineEvent` 类型联合中添加:

```typescript
// shared/src/index.ts
// 在 GraphEngineEvent 联合类型的最后一行 (| { event: "error"; ... }) 前添加:
| { event: "node_skipped"; nodeId: string; reason: string; timestamp: number }
```

- [ ] **Step 2: frontend/src/types/index.ts 同步新增**

同样在 `GraphEngineEvent` 联合类型中添加相同行:

```typescript
// frontend/src/types/index.ts
// 在 GraphEngineEvent 联合类型中添加:
| { event: "node_skipped"; nodeId: string; reason: string; timestamp: number }
```

- [ ] **Step 3: 编译检查**

运行: `cd /Users/sijin.kuang/mini-dify/mini-dify/backend && npx tsc --noEmit`
预期: 无类型错误

运行: `cd /Users/sijin.kuang/mini-dify/mini-dify/frontend && npx tsc --noEmit`
预期: 无类型错误

- [ ] **Step 4: Commit**

```bash
cd /Users/sijin.kuang/mini-dify/mini-dify
git add shared/src/index.ts frontend/src/types/index.ts
git commit -m "feat: add node_skipped event type for branch routing"
```

---

### Task 2: 新建 IfElseNode

**Files:**
- Create: `backend/src/core/nodes/if-else.node.ts`

- [ ] **Step 1: 创建 IfElseNode 文件**

```typescript
// backend/src/core/nodes/if-else.node.ts
import { BaseNode } from "./base.node";
import { NodeType, GraphEngineEvent } from "../../types";

export class IfElseNode extends BaseNode {
  readonly nodeType: NodeType = "if-else";

  async *run(): AsyncGenerator<GraphEngineEvent> {
    const nodeId = this.config.id;
    const data = this.config.data;

    yield { event: "node_start", nodeId, nodeType: "if-else", timestamp: Date.now() };

    // 读取并解析条件表达式
    const rawCondition = (data.condition as string) || "true";
    const resolved = this.resolveTemplate(rawCondition);

    // 安全求值
    let result: boolean;
    try {
      result = this.evaluateCondition(resolved);
    } catch (err: any) {
      yield { event: "error", nodeId, error: `Condition evaluation failed: ${err.message}`, timestamp: Date.now() };
      return;
    }

    const branch = result ? "true" : "false";
    const outputs = { result, branch, condition: resolved };
    this.pool.setNodeOutput(nodeId, outputs);

    yield { event: "node_end", nodeId, outputs, timestamp: Date.now() };
  }

  private evaluateCondition(expr: string): boolean {
    const trimmed = expr.trim();
    // 支持的操作符: == != >= <= > < contains
    const match = trimmed.match(/^(.+?)\s*(==|!=|>=|<=|>|<|contains)\s*(.+)$/);
    if (!match) {
      throw new Error(`Invalid condition expression: "${trimmed}". Expected format: "left op right"`);
    }
    const [, leftRaw, op, rightRaw] = match;
    const left = this.parseValue(leftRaw.trim());
    const right = this.parseValue(rightRaw.trim());

    switch (op) {
      case ">":  return left > right;
      case "<":  return left < right;
      case ">=": return left >= right;
      case "<=": return left <= right;
      case "==": return left == right;
      case "!=": return left != right;
      case "contains": return String(left).includes(String(right));
      default: throw new Error(`Unknown operator: ${op}`);
    }
  }

  private parseValue(raw: string): number | string | boolean {
    const trimmed = raw.trim();
    // 去掉引号
    if ((trimmed.startsWith('"') && trimmed.endsWith('"')) ||
        (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
      return trimmed.slice(1, -1);
    }
    // 布尔值
    if (trimmed === "true") return true;
    if (trimmed === "false") return false;
    // 数字
    const num = Number(trimmed);
    if (!isNaN(num) && trimmed !== "") return num;
    // 默认字符串
    return trimmed;
  }
}
```

- [ ] **Step 2: 编译检查**

运行: `cd /Users/sijin.kuang/mini-dify/mini-dify/backend && npx tsc --noEmit`
预期: 无类型错误

- [ ] **Step 3: Commit**

```bash
cd /Users/sijin.kuang/mini-dify/mini-dify
git add backend/src/core/nodes/if-else.node.ts
git commit -m "feat: add IfElseNode with safe condition evaluation"
```

---

### Task 3: NodeFactory 注册 if-else + 添加 has() 方法

**Files:**
- Modify: `backend/src/core/engine/node-factory.ts`

- [ ] **Step 1: 修改 node-factory.ts**

```typescript
// backend/src/core/engine/node-factory.ts
// 修改内容:
// 1. 添加 import { IfElseNode } from "../nodes/if-else.node";
// 2. static block 中加一行: this.register("if-else", IfElseNode);
// 3. 添加 static has(type: string): boolean { return this.registry.has(type); }
```

具体变更:

在文件顶部 import 区添加:
```typescript
import { IfElseNode } from "../nodes/if-else.node";
```

在 static block 中添加注册:
```typescript
this.register("if-else", IfElseNode);
```

在 `create()` 方法前添加 `has()` 静态方法:
```typescript
static has(type: string): boolean {
  return this.registry.has(type);
}
```

- [ ] **Step 2: 编译检查**

运行: `cd /Users/sijin.kuang/mini-dify/mini-dify/backend && npx tsc --noEmit`
预期: 无类型错误

- [ ] **Step 3: Commit**

```bash
cd /Users/sijin.kuang/mini-dify/mini-dify
git add backend/src/core/engine/node-factory.ts
git commit -m "feat: register IfElseNode in factory and add has() method"
```

---

### Task 4: 图引擎改造 — 验证 + 分支路由 + 执行限制

**Files:**
- Modify: `backend/src/core/engine/graph-engine.ts`

- [ ] **Step 1: 重写 graph-engine.ts**

将文件内容替换为:

```typescript
import { Graph, EdgeConfig, ExecutionContext, GraphEngineEvent } from "../../types";
import { BaseNode, VariablePool } from "../nodes/base.node";
import { NodeFactory } from "./node-factory";

export class ExecutionLimitError extends Error {
  constructor(msg: string) { super(msg); this.name = "ExecutionLimitError"; }
}

export class GraphEngine {
  private graph: Graph;
  private pool: VariablePool;
  private context: ExecutionContext;
  private maxSteps: number;
  private maxTimeMs: number;

  constructor(graph: Graph, context: ExecutionContext, opts?: { maxSteps?: number; maxTimeMs?: number }) {
    this.graph = graph;
    this.pool = new VariablePool();
    this.context = context;
    this.maxSteps = opts?.maxSteps ?? 50;
    this.maxTimeMs = opts?.maxTimeMs ?? 30000;
  }

  private node(id: string) {
    return this.graph.nodes.find((n) => n.id === id);
  }

  private computeInDegrees(): Map<string, number> {
    const inDegree = new Map<string, number>();
    for (const node of this.graph.nodes) {
      inDegree.set(node.id, 0);
    }
    for (const edge of this.graph.edges) {
      inDegree.set(edge.target, (inDegree.get(edge.target) ?? 0) + 1);
    }
    return inDegree;
  }

  private buildAdjList(): Map<string, string[]> {
    const adj = new Map<string, string[]>();
    for (const node of this.graph.nodes) {
      adj.set(node.id, []);
    }
    for (const edge of this.graph.edges) {
      const list = adj.get(edge.source) ?? [];
      list.push(edge.target);
      adj.set(edge.source, list);
    }
    return adj;
  }

  private topologicalSort(): string[] {
    const inDegree = this.computeInDegrees();
    const adj = this.buildAdjList();
    const queue: string[] = [];
    const result: string[] = [];

    for (const [nodeId, degree] of inDegree) {
      if (degree === 0) queue.push(nodeId);
    }

    while (queue.length > 0) {
      const current = queue.shift()!;
      result.push(current);
      for (const neighbor of adj.get(current) ?? []) {
        const newDeg = (inDegree.get(neighbor) ?? 1) - 1;
        inDegree.set(neighbor, newDeg);
        if (newDeg === 0) queue.push(neighbor);
      }
    }

    if (result.length !== this.graph.nodes.length) {
      throw new Error("Cycle detected in workflow graph");
    }
    return result;
  }

  /** Validate the graph structure. Returns null if valid, error message otherwise. */
  validate(): string | null {
    const { nodes, edges } = this.graph;

    // 1. Exactly one Start node
    const startNodes = nodes.filter((n) => n.type === "start");
    if (startNodes.length === 0) return "Workflow must have exactly 1 Start node (found 0)";
    if (startNodes.length > 1) return `Workflow must have exactly 1 Start node (found ${startNodes.length})`;

    // 2. At least one End node
    const endNodes = nodes.filter((n) => n.type === "end");
    if (endNodes.length === 0) return "Workflow must have at least 1 End node";

    // 3. Non-Start nodes must have incoming edges
    const hasIncoming = new Set(edges.map((e) => e.target));
    for (const n of nodes) {
      if (n.type === "start") continue;
      if (!hasIncoming.has(n.id)) {
        return `Node "${n.id}" (type: ${n.type}) has no incoming edge — isolated nodes are not allowed`;
      }
    }

    // 4. All node types must be registered
    for (const n of nodes) {
      if (!NodeFactory.has(n.type)) {
        return `Unknown node type: "${n.type}" on node "${n.id}"`;
      }
    }

    return null;
  }

  private getActiveTargets(sourceNodeId: string): Set<string> {
    const sourceOutputs = this.pool.getNodeOutput(sourceNodeId);
    const active = new Set<string>();

    for (const edge of this.graph.edges) {
      if (edge.source !== sourceNodeId) continue;

      if (sourceOutputs?.branch) {
        // Branch node: only follow edges matching the branch value
        if (edge.sourceHandle === sourceOutputs.branch) {
          active.add(edge.target);
        }
      } else {
        // Non-branch node: follow all downstream edges
        active.add(edge.target);
      }
    }
    return active;
  }

  async *run(): AsyncGenerator<GraphEngineEvent> {
    // Validate before execution
    const validationError = this.validate();
    if (validationError) {
      yield { event: "error", nodeId: null, error: validationError, timestamp: Date.now() };
      return;
    }

    const order = this.topologicalSort();
    const skipped = new Set<string>();
    let stepCount = 0;
    const startTime = Date.now();

    for (const nodeId of order) {
      // Execution limits
      stepCount++;
      if (stepCount > this.maxSteps) {
        yield { event: "error", nodeId: null, error: `Execution limit reached: max ${this.maxSteps} steps`, timestamp: Date.now() };
        return;
      }
      if (Date.now() - startTime > this.maxTimeMs) {
        yield { event: "error", nodeId: null, error: `Execution timeout after ${this.maxTimeMs}ms`, timestamp: Date.now() };
        return;
      }

      // Skip nodes on inactive branches
      if (skipped.has(nodeId)) continue;

      const config = this.node(nodeId);
      if (!config) continue;

      const nodeInstance: BaseNode = NodeFactory.create(config, this.pool, this.context);

      for await (const event of nodeInstance.run()) {
        if (event.event === "error") {
          yield event;
          return; // Stop on error
        }
        yield event;
      }

      // After node execution: compute active targets for branch routing
      const activeTargets = this.getActiveTargets(nodeId);
      for (const targetId of order) {
        if (targetId === nodeId) continue;
        // Skip nodes that were already processed
        const targetIndex = order.indexOf(targetId);
        if (targetIndex <= order.indexOf(nodeId)) continue;
        if (!activeTargets.has(targetId)) {
          skipped.add(targetId);
          yield { event: "node_skipped", nodeId: targetId, reason: "Branch not taken", timestamp: Date.now() };
        }
      }
    }

    // Collect final output from End nodes
    const endNode = this.graph.nodes.find((n) => n.type === "end");
    const endOutputs = endNode
      ? (this.pool.getNodeOutput(endNode.id) ?? { result: "Workflow completed" })
      : { result: "Workflow completed" };

    yield { event: "graph_end", outputs: endOutputs, timestamp: Date.now() };
  }
}
```

- [ ] **Step 2: 编译检查**

运行: `cd /Users/sijin.kuang/mini-dify/mini-dify/backend && npx tsc --noEmit`
预期: 无类型错误

- [ ] **Step 3: Commit**

```bash
cd /Users/sijin.kuang/mini-dify/mini-dify
git add backend/src/core/engine/graph-engine.ts
git commit -m "feat: add graph validation, branch routing, and execution limits"
```

---

### Task 5: 变量传递语义完善

**Files:**
- Modify: `backend/src/core/nodes/base.node.ts`
- Modify: `backend/src/core/nodes/llm.node.ts`
- Modify: `backend/src/core/nodes/end.node.ts`

- [ ] **Step 1: 修改 base.node.ts — 增强 getInputs()**

将 `base.node.ts` 中现有的 `getInputs()` 方法替换为:

```typescript
// backend/src/core/nodes/base.node.ts
// 替换 getInputs() 方法:

/** Resolve node inputs from config.data.inputs mapping */
protected getInputs(): Record<string, unknown> {
  const inputsConfig = this.config.data.inputs as Record<string, string> | undefined;
  if (!inputsConfig) return {};
  const result: Record<string, unknown> = {};
  for (const [key, template] of Object.entries(inputsConfig)) {
    result[key] = this.resolveTemplate(template);
  }
  return result;
}
```

同时删除旧的 `getInputs()` 方法及其对 `__last_output` 的相关逻辑。

- [ ] **Step 2: 修改 llm.node.ts — 使用 getInputs()**

修改 `LLMNode.run()` 方法中的 prompt 取值逻辑:

```typescript
// backend/src/core/nodes/llm.node.ts
// 在 run() 方法中，将:
//   const userPrompt = this.resolveTemplate((data.userPrompt as string) || "Hello");
// 改为:
//   const inputs = this.getInputs();
//   const userPrompt = this.resolveTemplate(
//     (data.userPrompt as string) || (inputs.prompt as string) || "Hello"
//   );
```

并移除 `run()` 方法末尾的这行:
```typescript
// 删除: this.pool.setNodeOutput("__last_output", { value: outputs.text });
```

- [ ] **Step 3: 修改 end.node.ts — 使用 data.outputs**

```typescript
// backend/src/core/nodes/end.node.ts
// 替换 run() 方法中的 outputs 计算:

async *run(): AsyncGenerator<GraphEngineEvent> {
  yield {
    event: "node_start",
    nodeId: this.config.id,
    nodeType: "end",
    timestamp: Date.now(),
  };

  const outputConfig = this.config.data.outputs as Record<string, string> | undefined;
  const outputs: Record<string, unknown> = {};

  if (outputConfig) {
    // Resolve each output selector through the pool
    for (const [key, selector] of Object.entries(outputConfig)) {
      const resolved = this.pool.resolve(selector);
      outputs[key] = resolved !== undefined ? resolved : `{{${selector}}}`;
    }
  } else {
    // Fallback: collect all known outputs from the pool (backward compat)
    outputs["result"] = "Workflow completed.";
  }

  this.pool.setNodeOutput(this.config.id, outputs);

  yield {
    event: "node_end",
    nodeId: this.config.id,
    outputs,
    timestamp: Date.now(),
  };
}
```

- [ ] **Step 4: 编译检查**

运行: `cd /Users/sijin.kuang/mini-dify/mini-dify/backend && npx tsc --noEmit`
预期: 无类型错误

- [ ] **Step 5: Commit**

```bash
cd /Users/sijin.kuang/mini-dify/mini-dify
git add backend/src/core/nodes/base.node.ts backend/src/core/nodes/llm.node.ts backend/src/core/nodes/end.node.ts
git commit -m "refactor: declarative input/output variable passing, remove __last_output"
```

---

### Task 6: Zustand Store 改动

**Files:**
- Modify: `frontend/src/stores/workflow.store.ts`

- [ ] **Step 1: 添加 selectedNodeId + selectNode + updateNodeData**

在 `workflow.store.ts` 的 `WorkflowState` 接口中添加字段:

```typescript
// 在 interface WorkflowState 中添加:
selectedNodeId: string | null;
selectNode: (id: string | null) => void;
updateNodeData: (id: string, data: Record<string, unknown>) => void;
```

在 `create<WorkflowState>((set, get) => ({` 的初始对象中添加:

```typescript
selectedNodeId: null,

selectNode: (id) => set({ selectedNodeId: id }),

updateNodeData: (id, data) =>
  set((s) => ({
    nodes: s.nodes.map((n) => (n.id === id ? { ...n, data: { ...n.data, ...data } } : n)),
  })),
```

- [ ] **Step 2: 确认类型检查**

运行: `cd /Users/sijin.kuang/mini-dify/mini-dify/frontend && npx tsc --noEmit`
预期: 无类型错误

- [ ] **Step 3: Commit**

```bash
cd /Users/sijin.kuang/mini-dify/mini-dify
git add frontend/src/stores/workflow.store.ts
git commit -m "feat: add selectedNodeId and updateNodeData to workflow store"
```

---

### Task 7: 新建 IfElseNodeComponent

**Files:**
- Create: `frontend/src/features/workflow-canvas/nodes/IfElseNodeComponent.tsx`

- [ ] **Step 1: 创建组件文件**

```typescript
// frontend/src/features/workflow-canvas/nodes/IfElseNodeComponent.tsx
import { memo } from "react";
import { Handle, Position } from "@xyflow/react";

interface IfElseNodeData {
  condition?: string;
  [key: string]: unknown;
}

function IfElseNodeComponent({ data }: { data: IfElseNodeData }) {
  const condition = (data.condition as string) || "No condition set";
  const preview = condition.length > 40 ? condition.slice(0, 40) + "..." : condition;

  return (
    <div className="bg-amber-50 border-2 border-amber-400 rounded-lg px-4 py-3 min-w-[180px] shadow-sm">
      <Handle type="target" position={Position.Top} />
      <div className="flex items-center gap-2 mb-1">
        <span className="text-lg">🔀</span>
        <span className="font-semibold text-amber-800">If/Else</span>
      </div>
      <div className="text-xs text-slate-500 bg-amber-100 rounded px-2 py-1 font-mono">
        {preview}
      </div>
      <div className="flex justify-between mt-2">
        <div className="relative">
          <Handle
            type="source"
            position={Position.Bottom}
            id="true"
            style={{ left: "30%" }}
          />
          <span className="text-[10px] text-green-600 font-semibold absolute -bottom-4 left-[20%]">TRUE</span>
        </div>
        <div className="relative">
          <Handle
            type="source"
            position={Position.Bottom}
            id="false"
            style={{ left: "70%" }}
          />
          <span className="text-[10px] text-red-500 font-semibold absolute -bottom-4 right-[20%]">FALSE</span>
        </div>
      </div>
    </div>
  );
}

export default memo(IfElseNodeComponent);
```

- [ ] **Step 2: 编译检查**

运行: `cd /Users/sijin.kuang/mini-dify/mini-dify/frontend && npx tsc --noEmit`
预期: 无类型错误

- [ ] **Step 3: Commit**

```bash
cd /Users/sijin.kuang/mini-dify/mini-dify
git add frontend/src/features/workflow-canvas/nodes/IfElseNodeComponent.tsx
git commit -m "feat: add IfElseNodeComponent with true/false source handles"
```

---

### Task 8: 新建 NodeConfigPanel

**Files:**
- Create: `frontend/src/features/workflow-canvas/NodeConfigPanel.tsx`

- [ ] **Step 1: 创建配置面板组件**

```typescript
// frontend/src/features/workflow-canvas/NodeConfigPanel.tsx
import { useWorkflowStore } from "../../stores/workflow.store";
import type { NodeConfig, NodeType } from "../../types";

function renderStartConfig(data: Record<string, unknown>, onChange: (d: Record<string, unknown>) => void) {
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
      <p className="text-xs text-slate-400">Format: [{"variable": "query", "label": "User Query", "type": "text-input"}]</p>
    </div>
  );
}

function renderLLMConfig(data: Record<string, unknown>, onChange: (d: Record<string, unknown>) => void) {
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
          placeholder='e.g. {{start.query}}'
          value={(data.userPrompt as string) || ""}
          onChange={(e) => onChange({ ...data, userPrompt: e.target.value })}
        />
      </label>
    </div>
  );
}

function renderIfElseConfig(data: Record<string, unknown>, onChange: (d: Record<string, unknown>) => void) {
  return (
    <div className="flex flex-col gap-3">
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-slate-700">Condition Expression</span>
        <input
          type="text"
          className="border border-slate-300 rounded-md p-2 text-sm font-mono"
          placeholder='e.g. {{llm-1.text}} > 0.5'
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

function renderEndConfig(data: Record<string, unknown>, onChange: (d: Record<string, unknown>) => void) {
  return (
    <div className="flex flex-col gap-3">
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-slate-700">Output Mappings (JSON)</span>
        <textarea
          className="border border-slate-300 rounded-md p-2 text-xs font-mono h-24"
          placeholder='{"result": "{{llm-1.text}}"}'
          value={JSON.stringify(data.outputs ?? {}, null, 2)}
          onChange={(e) => {
            try { onChange({ ...data, outputs: JSON.parse(e.target.value) }); } catch { /* invalid JSON */ }
          }}
        />
      </label>
      <p className="text-xs text-slate-400">Map output variable names to node field references like {"{{nodeId.field}}"}</p>
    </div>
  );
}

const configRenderers: Record<NodeType, (data: Record<string, unknown>, onChange: (d: Record<string, unknown>) => void) => JSX.Element> = {
  start: renderStartConfig,
  llm: renderLLMConfig,
  "if-else": renderIfElseConfig,
  end: renderEndConfig,
  code: () => <p className="text-sm text-slate-500">Code node config — coming soon</p>,
  http: () => <p className="text-sm text-slate-500">HTTP node config — coming soon</p>,
  template: () => <p className="text-sm text-slate-500">Template node config — coming soon</p>,
  iteration: () => <p className="text-sm text-slate-500">Iteration node config — coming soon</p>,
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
```

- [ ] **Step 2: 编译检查**

运行: `cd /Users/sijin.kuang/mini-dify/mini-dify/frontend && npx tsc --noEmit`
预期: 无类型错误

- [ ] **Step 3: Commit**

```bash
cd /Users/sijin.kuang/mini-dify/mini-dify
git add frontend/src/features/workflow-canvas/NodeConfigPanel.tsx
git commit -m "feat: add NodeConfigPanel drawer with per-type config forms"
```

---

### Task 9: WorkflowCanvas 集成 — sourceHandle + 执行高亮 + NodeConfigPanel

**Files:**
- Modify: `frontend/src/features/workflow-canvas/WorkflowCanvas.tsx`

- [ ] **Step 1: 修改 WorkflowCanvas.tsx**

修改内容:
1. **import** `IfElseNodeComponent` 和 `NodeConfigPanel`
2. **nodeTypes** 注册 if-else
3. **onConnect** 传递 `sourceHandle` 和 `targetHandle`
4. **onNodeClick** 调用 `store.selectNode(node.id)`
5. **rfNodes** 应用执行高亮样式
6. **布局** 加入 `NodeConfigPanel`
7. **handleRun** 中处理 `node_skipped` 事件

```typescript
// frontend/src/features/workflow-canvas/WorkflowCanvas.tsx
// ====== 关键修改 ======

// 1. 添加 import (在现有 import 后追加):
import IfElseNodeComponent from "./nodes/IfElseNodeComponent";
import { NodeConfigPanel } from "./NodeConfigPanel";

// 2. nodeTypes 注册 if-else:
const nodeTypes = {
  start: StartNodeComponent,
  end: EndNodeComponent,
  llm: LLMNodeComponent,
  "if-else": IfElseNodeComponent,  // 新增
};

// 3. onConnect 传递 handle 信息 (替换现有 onConnect):
const onConnect = useCallback(
  (conn: Connection) => {
    store.onConnect({
      ...conn,
      sourceHandle: conn.sourceHandle ?? undefined,
      targetHandle: conn.targetHandle ?? undefined,
    });
    setRfEdges((eds) => [
      ...eds,
      { ...conn, id: `edge-${Date.now()}` } as Edge,
    ]);
  },
  [store, setRfEdges],
);

// 4. 添加 onNodeClick handler (在 onInit 之后):
const onNodeClick = useCallback(
  (_event: React.MouseEvent, node: Node) => {
    store.selectNode(node.id);
  },
  [store],
);

// 5. 执行高亮: 在 ReactFlow 上添加 (在 rfNodes 传给 ReactFlow 之前处理):
const highlightedNodes = rfNodes.map((node) => {
  if (node.id === store.executingNodeId) {
    return { ...node, className: "executing" };
  }
  return node;
});

// 6. 布局改为 flex row (在 return JSX 中):
// 将 <NodePalette /> 和主区域放在左侧 flex
// 右侧放 <NodeConfigPanel />

// 7. handleRun 中处理 node_skipped (在 subscribeToRunStream 回调中添加):
// else if (event.event === "node_skipped") {
//   setOutput((prev) => prev + `[Skipped: ${event.nodeId}] ${event.reason}\n`);
// }

// 8. ReactFlow 使用 highlightedNodes + onNodeClick:
// <ReactFlow
//   nodes={highlightedNodes}
//   onNodeClick={onNodeClick}
//   ...
// >
```

完整文件改动较大，以下是完整的新版 WorkflowCanvas.tsx:

```typescript
import { useCallback, useRef, useState } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  ReactFlowProvider,
  type Connection,
  type Node,
  type Edge,
  type NodeChange,
  type EdgeChange,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import StartNodeComponent from "./nodes/StartNodeComponent";
import EndNodeComponent from "./nodes/EndNodeComponent";
import LLMNodeComponent from "./nodes/LLMNodeComponent";
import IfElseNodeComponent from "./nodes/IfElseNodeComponent";
import { NodePalette } from "./palette/NodePalette";
import { NodeConfigPanel } from "./NodeConfigPanel";
import { useWorkflowStore } from "../../stores/workflow.store";
import { saveWorkflow, startRun, subscribeToRunStream } from "../../services/api";
import type { NodeType, GraphEngineEvent } from "../../types";

const nodeTypes = {
  start: StartNodeComponent,
  end: EndNodeComponent,
  llm: LLMNodeComponent,
  "if-else": IfElseNodeComponent,
};

let nodeIdCounter = 0;
function nextId(type: NodeType) {
  nodeIdCounter++;
  return `${type}-${nodeIdCounter}`;
}

function WorkflowCanvasInner() {
  const store = useWorkflowStore();
  const [rfNodes, setRfNodes, onNodesChangeRf] = useNodesState<Node>([]);
  const [rfEdges, setRfEdges, onEdgesChangeRf] = useEdgesState<Edge>([]);
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [reactFlowInstance, setReactFlowInstance] = useState<any>(null);
  const [output, setOutput] = useState("");

  const onConnect = useCallback(
    (conn: Connection) => {
      store.onConnect({
        ...conn,
        sourceHandle: conn.sourceHandle ?? undefined,
        targetHandle: conn.targetHandle ?? undefined,
      });
      setRfEdges((eds) => [...eds, { ...conn, id: `edge-${Date.now()}` } as Edge]);
    },
    [store, setRfEdges],
  );

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => {
      onNodesChangeRf(changes);
      store.onNodesChange(changes);
    },
    [store, onNodesChangeRf],
  );

  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      onEdgesChangeRf(changes);
      store.onEdgesChange(changes);
    },
    [store, onEdgesChangeRf],
  );

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      const type = event.dataTransfer.getData("application/reactflow-type") as NodeType;
      if (!type) return;

      const position = reactFlowInstance?.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      }) ?? { x: 0, y: 0 };

      const newNode: Node = {
        id: nextId(type),
        type,
        position,
        data: {},
      };

      setRfNodes((nds) => [...nds, newNode]);
      store.loadGraph(
        store.nodes.concat({
          id: newNode.id,
          type,
          title: type.charAt(0).toUpperCase() + type.slice(1),
          position,
          data: {},
        }),
        store.edges,
      );
    },
    [reactFlowInstance, setRfNodes, store],
  );

  const onNodeClick = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      store.selectNode(node.id);
    },
    [store],
  );

  const onCanvasClick = useCallback(() => {
    store.selectNode(null);
  }, [store]);

  const handleSave = async () => {
    if (!store.appId) return;
    try {
      await saveWorkflow(store.appId, {
        nodes: store.nodes.map((n) => ({
          id: n.id,
          type: n.type,
          title: n.type,
          position: n.position,
          data: n.data ?? {},
        })),
        edges: store.edges,
      });
      alert("Workflow saved!");
    } catch {
      alert("Save failed.");
    }
  };

  const handleRun = async () => {
    if (!store.workflowId) return;
    store.setRunning(true);
    store.clearEvents();
    setOutput("");

    try {
      const { data: runData } = await startRun(store.workflowId, { input: "Hello" });

      subscribeToRunStream(
        runData.runId,
        (event: GraphEngineEvent) => {
          store.addEvent(event);
          if (event.event === "node_start") {
            store.setExecutingNode(event.nodeId);
          } else if (event.event === "node_chunk") {
            setOutput((prev) => prev + event.text);
          } else if (event.event === "node_end") {
            store.setExecutingNode(null);
          } else if (event.event === "node_skipped") {
            setOutput((prev) => prev + `[Skipped: ${event.nodeId}] ${event.reason}\n`);
          } else if (event.event === "graph_end") {
            setOutput(JSON.stringify(event.outputs, null, 2));
            store.setRunning(false);
          } else if (event.event === "error") {
            setOutput(`Error: ${event.error}`);
            store.setRunning(false);
          }
        },
        () => store.setRunning(false),
        (err) => {
          setOutput(`Error: ${err}`);
          store.setRunning(false);
        },
      );
    } catch (err: any) {
      setOutput(`Error: ${err.message}`);
      store.setRunning(false);
    }
  };

  const onInit = useCallback((_instance: any) => {
    setReactFlowInstance(_instance);
  }, []);

  const highlightedNodes = rfNodes.map((node) => {
    if (node.id === store.executingNodeId) {
      return { ...node, className: "executing" };
    }
    return node;
  });

  return (
    <div className="flex h-full">
      <NodePalette />
      <div className="flex-1 flex flex-col">
        {/* Toolbar */}
        <div className="h-12 bg-white border-b border-slate-200 flex items-center px-4 gap-3">
          <button
            onClick={handleSave}
            className="px-4 py-1.5 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700"
          >
            Save
          </button>
          <button
            onClick={handleRun}
            disabled={store.isRunning}
            className="px-4 py-1.5 bg-green-600 text-white text-sm rounded-md hover:bg-green-700 disabled:opacity-50"
          >
            {store.isRunning ? "Running..." : "Run"}
          </button>
          {store.executingNodeId && (
            <span className="text-sm text-slate-500">
              Executing: <span className="font-mono text-orange-600">{store.executingNodeId}</span>
            </span>
          )}
        </div>

        {/* Canvas */}
        <div ref={reactFlowWrapper} className="flex-1" onDragOver={onDragOver} onDrop={onDrop}>
          <ReactFlow
            nodes={highlightedNodes}
            edges={rfEdges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={onNodeClick}
            onPaneClick={onCanvasClick}
            onInit={onInit}
            nodeTypes={nodeTypes}
            fitView
          >
            <Background />
            <Controls />
            <MiniMap />
          </ReactFlow>
        </div>

        {/* Output panel */}
        {output && (
          <div className="h-40 bg-slate-900 text-green-400 font-mono text-sm p-4 overflow-auto border-t border-slate-700">
            <pre className="whitespace-pre-wrap">{output}</pre>
          </div>
        )}
      </div>
      <NodeConfigPanel />
    </div>
  );
}

export function WorkflowCanvas() {
  return (
    <ReactFlowProvider>
      <WorkflowCanvasInner />
    </ReactFlowProvider>
  );
}
```

- [ ] **Step 2: 添加执行高亮 CSS**

在 `frontend/src/index.css` 或 `frontend/src/App.css` 末尾添加:

```css
.executing {
  box-shadow: 0 0 0 2px #f59e0b;
  animation: node-pulse 1.5s ease-in-out infinite;
}
@keyframes node-pulse {
  0%, 100% { box-shadow: 0 0 0 2px #f59e0b; }
  50% { box-shadow: 0 0 0 4px #fbbf24; }
}
```

- [ ] **Step 3: 编译检查**

运行: `cd /Users/sijin.kuang/mini-dify/mini-dify/frontend && npx tsc --noEmit`
预期: 无类型错误

- [ ] **Step 4: Commit**

```bash
cd /Users/sijin.kuang/mini-dify/mini-dify
git add frontend/src/features/workflow-canvas/WorkflowCanvas.tsx frontend/src/index.css
git commit -m "feat: integrate sourceHandle, execution highlighting, and NodeConfigPanel into canvas"
```

---

### Task 10: NodePalette 添加 if-else 节点

**Files:**
- Modify: `frontend/src/features/workflow-canvas/palette/NodePalette.tsx`

- [ ] **Step 1: 添加 if-else 模板**

在 `NODE_TEMPLATES` 数组中添加一行:

```typescript
// frontend/src/features/workflow-canvas/palette/NodePalette.tsx
// 在 NODE_TEMPLATES 数组中添加:
{ type: "if-else", label: "If/Else", color: "bg-amber-100 border-amber-400" },
```

- [ ] **Step 2: 编译检查**

运行: `cd /Users/sijin.kuang/mini-dify/mini-dify/frontend && npx tsc --noEmit`
预期: 无类型错误

- [ ] **Step 3: Commit**

```bash
cd /Users/sijin.kuang/mini-dify/mini-dify
git add frontend/src/features/workflow-canvas/palette/NodePalette.tsx
git commit -m "feat: add If/Else node to palette"
```

---

### Task 11: 端到端手动验证

- [ ] **Step 1: 启动后端**

```bash
cd /Users/sijin.kuang/mini-dify/mini-dify/backend
npm run start:dev
```
预期: 后端在 localhost:3001 启动

- [ ] **Step 2: 启动前端**

```bash
cd /Users/sijin.kuang/mini-dify/mini-dify/frontend
npm run dev
```
预期: 前端在 localhost:5173 启动

- [ ] **Step 3: 测试场景 1 — 线性工作流 (回归测试)**

操作:
1. 创建新 App
2. 拖入 Start → LLM → End 连接
3. 点击 LLM 节点，配置面板出现，修改 System Prompt
4. 点击 Save
5. 刷新页面，检查配置是否保存
6. 点击 Run，检查 LLM 输出是否正常流式显示

- [ ] **Step 4: 测试场景 2 — 分支工作流**

操作:
1. 创建新 App
2. 拖入 Start → If/Else (设置 condition: `1 > 0`) → LLM → End
3. 从 If/Else 的 TRUE handle 连接 LLM
4. 从 If/Else 的 FALSE handle 连接另一个 End
5. 点击 Run，检查是否走 TRUE 分支

- [ ] **Step 5: 测试场景 3 — 图验证**

操作:
1. 创建新 App，只拖入 Start + LLM (无 End)
2. 点击 Run，检查是否提示 "Workflow must have at least 1 End node"

- [ ] **Step 6: Commit (如有 fix)**

```bash
cd /Users/sijin.kuang/mini-dify/mini-dify
git add .
git commit -m "fix: e2e fixes from manual testing"
```

---

## 实现顺序总结

| 任务 | 内容 | 依赖 |
|------|------|------|
| Task 1 | 类型定义 (shared + frontend) | 无 |
| Task 2 | IfElseNode 实现 | Task 1 |
| Task 3 | NodeFactory 注册 | Task 2 |
| Task 4 | 图引擎改造 | Task 3 |
| Task 5 | 变量传递完善 | Task 4 |
| Task 6 | Store 改动 | Task 1 |
| Task 7 | IfElseNodeComponent | Task 6 |
| Task 8 | NodeConfigPanel | Task 6 |
| Task 9 | WorkflowCanvas 集成 | Task 7, Task 8 |
| Task 10 | NodePalette 更新 | Task 7 |
| Task 11 | 端到端验证 | 全部 |
