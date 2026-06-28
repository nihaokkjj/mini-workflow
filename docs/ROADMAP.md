# Mini-Dify 剩余任务路线图

## 已完成（Phase 1）

Phase 1 已全部实现，端到端流程可运行：画布拖拽 → 保存工作流 → 后端图引擎执行 → SSE 流式输出。

### 后端
| 模块 | 文件 | 状态 |
|------|------|------|
| 入口 + CORS | `backend/src/main.ts` | ✅ |
| App 模块 | `backend/src/modules/app/` | ✅ CRUD |
| Workflow 模块 | `backend/src/modules/workflow/` | ✅ 保存/加载 Graph JSON |
| Run 模块 | `backend/src/modules/run/` | ✅ SSE 流式执行 |
| 图引擎 | `backend/src/core/engine/graph-engine.ts` | ✅ Kahn 拓扑排序 + 顺序执行 |
| 节点工厂 | `backend/src/core/engine/node-factory.ts` | ✅ 注册/分发 |
| 变量池 | `backend/src/core/nodes/base.node.ts` | ✅ Map 存储 + 模板替换 |
| Start 节点 | `backend/src/core/nodes/start.node.ts` | ✅ 传入 inputs |
| LLM 节点 | `backend/src/core/nodes/llm.node.ts` | ✅ 原生 HTTPS 流式 + Kimi 兼容 |
| End 节点 | `backend/src/core/nodes/end.node.ts` | ✅ 收集最终输出 |
| 数据库实体 | `backend/src/database/entities/` | ✅ App, Workflow, Conversation, Message, Run |
| SQLite 连接 | `backend/src/database/data-source.ts` | ✅ better-sqlite3 |

### 前端
| 模块 | 文件 | 状态 |
|------|------|------|
| 画布容器 | `frontend/src/features/workflow-canvas/WorkflowCanvas.tsx` | ✅ ReactFlow + 拖放 + 保存/运行 |
| 节点面板 | `frontend/src/features/workflow-canvas/palette/NodePalette.tsx` | ✅ 可拖拽节点源 |
| Start 节点 | `frontend/src/features/workflow-canvas/nodes/StartNodeComponent.tsx` | ✅ |
| LLM 节点 | `frontend/src/features/workflow-canvas/nodes/LLMNodeComponent.tsx` | ✅ |
| End 节点 | `frontend/src/features/workflow-canvas/nodes/EndNodeComponent.tsx` | ✅ |
| 状态管理 | `frontend/src/stores/workflow.store.ts` | ✅ Zustand |
| API 层 | `frontend/src/services/api.ts` | ✅ axios + SSE fetch |
| 应用列表页 | `frontend/src/pages/AppListPage.tsx` | ✅ 基础 CRUD |
| 编辑器页 | `frontend/src/pages/AppEditorPage.tsx` | ✅ 加载应用 + 工作流 |

---

## Phase 2: 图引擎完善（分支 + 变量 + 画布交互）

### 后端

#### 2.1 IfElseNode — 条件分支节点
**文件**: `backend/src/core/nodes/if-else.node.ts`（新建）

- 读取配置中的条件表达式（如 `{{last_output.value}} > 0.5`）
- 用 VariablePool 解析表达式，返回 true/false
- 输出中标记 `branch: "true" | "false"`，供引擎选择下游路径
- 注册到 `node-factory.ts`

#### 2.2 变量传递语义完善
**文件**: `backend/src/core/nodes/base.node.ts`（修改）

- 当前 `__last_output` 固定取上一条 LLM 输出的 `.value` 字段，仅支持线性链
- 需改为：每个节点可声明输入变量映射（如 `inputs: { prompt: "{{llm-1.output}}" }`）
- VariablePool 按 `nodeId.fieldName` 的 key 存取，下游节点通过模板语法引用

#### 2.3 图验证增强
**文件**: `backend/src/core/engine/graph-engine.ts`（修改）

- 当前仅有拓扑排序中的环检测
- 增加：
  - Start 节点必须有且只有一个
  - End 节点必须有且至少一个
  - 所有非 Start 节点入度 >= 1（不可有孤立节点）
  - 节点类型合法性校验
  - 验证失败返回明确错误信息

#### 2.4 执行限制
**文件**: `backend/src/core/engine/graph-engine.ts`（修改）

- `maxSteps`：默认 50，超过抛出 `ExecutionLimitError`
- `maxTime`：默认 30 秒，超时自动中止
- 在 `run()` 方法中注入计数器 + 计时器

#### 2.5 并行执行准备（可选）
- 当前 ready-queue 是 `shift()` 逐个取，结构已支持并行
- 若需真正并行：`Promise.all(queue.map(n => runNode(n)))`
- 当前阶段可不做，留到性能优化时处理

### 前端

#### 2.6 IfElseNode 组件 + 配置面板
**文件**: `frontend/src/features/workflow-canvas/nodes/IfElseNodeComponent.tsx`（新建）

- 显示条件表达式预览
- 两个输出 Handle：`true` 和 `false`（带标签）
- 点击节点弹出条件编辑器

#### 2.7 边路由支持分支
**文件**: `frontend/src/features/workflow-canvas/WorkflowCanvas.tsx`（修改）

- 当前边未区分 sourceHandle/targetHandle
- 需支持 `sourceHandle: "true"` / `sourceHandle: "false"` 以路由 IfElse 分支
- `onConnect` 中保存 handle 信息

#### 2.8 NodeConfigPanel — 节点配置抽屉
**文件**: `frontend/src/features/workflow-canvas/NodeConfigPanel.tsx`（新建）

- 点击画布节点 → 右侧滑出抽屉
- 根据节点类型渲染不同配置表单：
  - LLM：模型选择、System Prompt、User Prompt（模板）
  - IfElse：条件表达式
  - Start：输入字段定义
- 保存后更新 `node.data` 并同步到 store

#### 2.9 画布执行高亮
**文件**: `frontend/src/features/workflow-canvas/WorkflowCanvas.tsx`（修改）

- 收到 `node_start` 事件 → 节点边框变为橙色/动画
- 收到 `node_end` 事件 → 恢复默认样式
- 利用 `store.executingNodeId`（已存在）驱动 ReactFlow 节点样式

---

## Phase 3: 更多节点 + 对话界面

### 后端

#### 3.1 HttpNode — HTTP 请求节点
**文件**: `backend/src/core/nodes/http.node.ts`（新建）

- 调用外部 API：支持 GET/POST
- URL、Headers、Body 支持 `{{variable}}` 模板替换
- 使用 `fetch`（Node 18+ 内置）或 axios
- 输出：响应状态码 + 响应体
- 超时默认 30 秒

#### 3.2 CodeNode — 代码执行节点
**文件**: `backend/src/core/nodes/code.node.ts`（新建）

- 在沙箱中执行用户 JavaScript 代码
- 使用 `isolated-vm`（package.json 中需添加依赖）
- 输入变量通过 `$inputs` 对象传入沙箱
- 输出：沙箱中 `return` 的值
- 限制：CPU 时间 5 秒、内存 8MB
- **安全注意**：必须用 isolated-vm，严禁 `eval()` 或 `vm.runInThisContext()`

#### 3.3 TemplateNode — 模板渲染节点
**文件**: `backend/src/core/nodes/template.node.ts`（新建）

- 接收模板字符串 + 变量池
- 渲染 `{{variable.path}}` 语法
- 复用 `BaseNode.resolveTemplate()`（已实现）
- 输出：渲染后的文本

#### 3.4 Conversation 模块
**文件**: `backend/src/modules/conversation/`（新建目录）

- `conversation.controller.ts`：CRUD 接口
- `conversation.service.ts`：业务逻辑
- 功能：创建对话 / 列表 / 查看消息 / 删除
- 关联 `Message` 实体（已定义），每次 Run 完成后自动保存消息

#### 3.5 Model 模块
**文件**: `backend/src/modules/model/`（新建目录）

- `model.controller.ts`：GET `/api/models`
- 返回可用模型列表（从 env 配置或硬编码常见模型）
- 功能简单，可先返回静态列表供前端选择

### 前端

#### 3.6 HttpNode / CodeNode / TemplateNode 组件
**文件**: `frontend/src/features/workflow-canvas/nodes/`（新建 3 个文件）

- `HttpNodeComponent.tsx`：显示 URL + method
- `CodeNodeComponent.tsx`：显示代码预览（截断）
- `TemplateNodeComponent.tsx`：显示模板预览（截断）
- 三个组件结构参照现有 `LLMNodeComponent.tsx`

#### 3.7 ChatPage — 对话页
**文件**: `frontend/src/pages/ChatPage.tsx`（新建）

- 路由：`/apps/:appId/chat`
- 左侧对话列表，右侧消息流
- 消息流展示 SSE 流式文本（打字机效果）
- 底部输入框 → 发送 → 触发 Run → 实时显示结果
- 需在 `api.ts` 中新增对话相关接口

#### 3.8 AppListPage 完善
**文件**: `frontend/src/pages/AppListPage.tsx`（修改）

- 当前仅基础列表
- 增加：卡片网格布局、应用图标/描述、编辑/聊天入口按钮
- 删除确认弹窗（当前直接删除）

---

## Phase 4: 打磨

### 后端

#### 4.1 错误处理完善
- 节点执行失败时，错误信息包含节点 ID + 类型 + 详细原因
- 错误事件统一格式：`{ event: "error", nodeId, nodeType, message, timestamp }`
- GraphEngine 遇到错误后立即停止后续节点

#### 4.2 运行取消
**文件**: `backend/src/modules/run/run.service.ts`（修改）

- 新增 `POST /api/runs/:runId/cancel`
- 用 AbortController 中止正在执行的 GraphEngine
- 前端"停止"按钮触发此接口

#### 4.3 超时处理
- Run 级别超时（默认 60 秒），在 `run.service.ts` 中用 `Promise.race`
- 超时后自动标记 run 状态为 `timeout`

### 前端

#### 4.4 UI 打磨
- 加载态：App 列表加载骨架屏、工作流加载 spinner
- 空态：无 App 时引导创建、无工作流时提示拖拽节点
- 错误 Toast：替换 `alert()` 为 toast 通知组件
- 画布节点：hover 时显示删除按钮、拖拽调整位置时的吸附对齐

#### 4.5 停止运行按钮
**文件**: `frontend/src/features/workflow-canvas/WorkflowCanvas.tsx`（修改）

- Run 按钮旁边增加 Stop 按钮（运行时显示）
- 调用 `cancelRun(runId)` → 中止 SSE 连接 + 通知后端

---

## 优先级建议

| 优先级 | 阶段 | 原因 |
|--------|------|------|
| P0 | Phase 2.1-2.3 | 分支逻辑是工作流核心能力，缺少则只能做线性链 |
| P0 | Phase 2.8 | 无配置面板则无法修改节点参数，LLM 只能用默认值 |
| P1 | Phase 2.9 | 执行高亮提升可视化体验，反馈明确 |
| P1 | Phase 3.4-3.7 | 对话界面是面向用户的产品入口 |
| P2 | Phase 3.1-3.3 | 更多节点类型扩展工作流表达能力 |
| P2 | Phase 4 | 打磨提升体验，但不阻塞核心功能 |
