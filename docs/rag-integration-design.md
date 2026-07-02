# mini-dify RAG 接入设计

## 背景

参照 Dify 的 `reusable-rag-architecture.md`，本项目适合把 RAG 接入到“工作流节点 + 独立后端模块”这条 seam，而不是把检索逻辑硬塞进聊天接口或 `LLMNode`。

当前项目已经具备三个有利条件：

- 工作流运行时是稳定的 DAG 执行器：`GraphEngine -> NodeFactory -> BaseNode`
- 节点之间已经通过 `VariablePool` 交换结构化输出
- 工作流定义已经持久化为 `Workflow.graph`

因此，最小可演进的方案是：

1. 后端新增一个独立 `RagModule`
2. 工作流新增一个 `knowledge-retrieval` 节点
3. `LLM` 节点继续只负责生成，消费上游检索节点产出的 `context` 和 `sources`

## 目标

- 在当前 `mini-dify` 中引入可运行的知识检索能力
- 保持工作流节点模型不变，只增加新的节点类型
- 把索引和检索拆成独立编排模块，避免后续和工作流、聊天、模型调用耦死
- 让下游节点消费稳定的 `Source` 结果，而不是搜索后端私有命中格式
- 支持后续逐步升级为 embedding / hybrid / rerank / 多知识库

## 非目标

- 本期不复刻 Dify 的完整知识库产品能力
- 本期不做复杂权限系统
- 本期不做多模态解析、OCR、网页抓取
- 本期不强依赖外部向量库

## 当前代码中的接入点

### 后端 seam

- 节点注册：`backend/src/core/engine/node-factory.ts`
- 节点基类：`backend/src/core/nodes/base.node.ts`
- 执行入口：`backend/src/core/engine/graph-engine.ts`
- 工作流运行：`backend/src/modules/run/run.service.ts`
- 会话运行：`backend/src/modules/conversation/conversation.controller.ts`
- 图定义类型：`backend/src/types/index.ts`

### 前端 seam

- 节点类型镜像：`frontend/src/types/index.ts`
- 节点拖拽面板：`frontend/src/features/workflow-canvas/palette/NodePalette.tsx`
- 节点配置面板：`frontend/src/features/workflow-canvas/NodeConfigPanel.tsx`

### 数据层现状

当前数据库只有：

- `App`
- `Workflow`
- `Conversation`
- `Message`
- `Run`

还没有知识库、文档、切块、索引元数据这些稳定业务实体。

## 设计原则

沿用参考文档里最值得保留的 5 条原则：

1. 业务记录是事实来源
2. 搜索后端只是适配层
3. 索引流水线与检索流水线独立编排
4. 搜索命中后必须回表为业务对象
5. 工作流与应用层消费稳定的 `Source` 对象

## 目标架构

### 模块分层

建议新增目录：

```text
backend/src/modules/rag/
  rag.module.ts
  dto/
    create-dataset.dto.ts
    create-document.dto.ts
    retrieve.dto.ts
  entities/
    dataset.entity.ts
    app-dataset-binding.entity.ts
    dataset-document.entity.ts
    document-segment.entity.ts
  indexing/
    rag-indexing.orchestrator.ts
    extract/
      extract-processor.ts
      text.extractor.ts
      markdown.extractor.ts
    clean/
      clean-processor.ts
    split/
      split-processor.ts
    index/
      search-index-writer.ts
  retrieval/
    rag-retrieval.orchestrator.ts
    dataset-selector.ts
    source-hydrator.ts
    context-assembler.ts
    reranker.ts
  adapters/
    search-index.adapter.ts
    sqlite-keyword-index.adapter.ts
    embedding.adapter.ts
    noop-embedding.adapter.ts
  controllers/
    rag-dataset.controller.ts
    rag-retrieval.controller.ts
  services/
    rag-dataset.service.ts
```

### 节点分层

建议新增：

```text
backend/src/core/nodes/knowledge-retrieval.node.ts
```

这个节点只做两件事：

- 读取节点配置和上游变量
- 调用 `RagRetrievalOrchestrator`

它不承担文档解析、切块、索引和具体检索细节。这些复杂度都沉到 `RagModule` 内部。

## 领域模型

本项目第一版建议保留 4 个稳定实体。

### 1. Dataset

逻辑知识库。

建议字段：

- `id`
- `name`
- `description`
- `status`: `active | indexing | error | archived`
- `retrievalMode`: `keyword | semantic | hybrid`
- `indexingMode`: `economy | high_quality`
- `chunkSize`
- `chunkOverlap`
- `topK`
- `scoreThreshold`
- `createdAt`
- `updatedAt`

### 2. AppDatasetBinding

应用和知识库的绑定关系。

原因：

- 一个 app 可以挂多个 dataset
- 一个 dataset 将来可以复用给多个 app

建议字段：

- `id`
- `appId`
- `datasetId`
- `createdAt`

### 3. DatasetDocument

源文档记录。

建议字段：

- `id`
- `datasetId`
- `name`
- `sourceType`: `text | markdown | file`
- `sourceUri`
- `content`
- `status`: `pending | indexing | completed | failed`
- `errorMessage`
- `docHash`
- `metadata`
- `createdAt`
- `updatedAt`

### 4. DocumentSegment

稳定主检索单元，也是最终引用来源。

建议字段：

- `id`
- `datasetId`
- `documentId`
- `position`
- `content`
- `tokenCount`
- `docHash`
- `metadata`
- `searchText`
- `createdAt`

### 本期暂不落表

- `ChildChunk`
- `SummaryIndex`

这两个留到第二阶段以后再引入。

## Source 契约

RAG 检索返回值统一收敛成 `Source`：

```ts
interface Source {
  title: string;
  content: string;
  datasetId: string;
  datasetName: string;
  documentId: string;
  documentName: string;
  segmentId: string;
  score: number;
  position: number;
  metadata?: Record<string, unknown>;
}
```

这是工作流节点和未来聊天层应该消费的稳定对象。

## 索引流水线

### 流程

第一版索引编排器：

```text
extract -> clean -> split -> persist DocumentSegment -> write search index
```

### 1. Extract

统一入口：

```ts
extract(source: DatasetDocumentInput): Promise<DocumentPayload[]>
```

第一版只支持：

- 纯文本
- Markdown

原因：

- 当前项目没有上传文件链路
- 先把“可运行的 RAG 骨架”做出来，比优先支持 PDF 更划算

### 2. Clean

职责：

- 统一换行
- 清理重复空白
- 去掉非法控制字符

要求：

- 纯函数
- 不依赖具体检索后端

### 3. Split

第一版只做段落模式：

- 每个 `DocumentSegment` 既是检索单元，也是返回上下文单元

切块参数来自 `Dataset`：

- `chunkSize`
- `chunkOverlap`

### 4. Persist business records

必须先写入 `DocumentSegment`，再写搜索索引。

收益：

- 之后可重建索引
- 命中结果可回表
- UI 和调试可以直接看业务表

### 5. Write search index

第一版建议用 SQLite 关键词索引兜底，不引入外部基础设施。

有两种实现方式：

1. 最小实现：直接对 `document_segments.content` 用 `LIKE` / 简单分词
2. 更合理实现：新增 SQLite FTS5 虚表

推荐直接做 FTS5，因为它更接近“真正的检索适配层”，也方便以后替换。

## 检索流水线

### 流程

第一版检索编排器：

```text
select datasets -> search -> threshold filter -> hydrate sources -> assemble context
```

### 1. Select datasets

第一版先做两种模式：

- 节点配置显式传 `datasetIds`
- 如果节点未指定，则回退到当前 `appId` 绑定的全部 dataset

### 2. Search

统一接口：

```ts
interface SearchIndexAdapter {
  upsertSegments(segments: IndexedSegment[]): Promise<void>;
  deleteByDocument(documentId: string): Promise<void>;
  search(input: SearchQuery): Promise<SearchHit[]>;
}
```

第一版实现：

- `SqliteKeywordIndexAdapter`

返回的是命中结果，不直接返回给下游。

### 3. Threshold filter

保留 `scoreThreshold`。

原因：

- 没有阈值时，低置信度片段很容易污染下游 prompt

### 4. Hydrate sources

所有命中必须回表成 `DocumentSegment + DatasetDocument + Dataset`。

不能直接把搜索命中传给 LLM。

### 5. Assemble context

`ContextAssembler` 负责把 `Source[]` 组装成下游提示词上下文。

推荐输出：

```text
[1] 文档名 / 段落序号
内容...

[2] 文档名 / 段落序号
内容...
```

这层单独抽出来，方便以后：

- 控制上下文长度
- 去重
- 注入引用编号
- 兼容不同 prompt 模板

## 工作流节点设计

### 新节点类型

新增：

```ts
type NodeType =
  | "start"
  | "end"
  | "llm"
  | "if-else"
  | "code"
  | "http"
  | "template"
  | "iteration"
  | "knowledge-retrieval";
```

### 节点输入

`knowledge-retrieval` 节点配置建议：

```ts
interface KnowledgeRetrievalNodeData {
  queryTemplate: string;
  datasetIds?: string[];
  topK?: number;
  scoreThreshold?: number;
  retrievalMode?: "keyword" | "semantic" | "hybrid";
  rewriteQueryPrompt?: string;
}
```

第一版先不做 `rewriteQueryPrompt` 的真实能力，但字段可以预留。

### 节点执行逻辑

```ts
const query = this.resolveTemplate(data.queryTemplate);
const result = await ragRetrievalOrchestrator.retrieve({
  appId: context.appId,
  query,
  datasetIds: data.datasetIds,
  topK: data.topK,
  scoreThreshold: data.scoreThreshold,
  retrievalMode: data.retrievalMode,
});
```

### 节点输出

建议稳定输出：

```ts
{
  query: string;
  context: string;
  sourceCount: number;
  sources: Source[];
  hits: Array<{
    segmentId: string;
    score: number;
  }>;
}
```

其中：

- `context` 给 `LLMNode` 直接消费
- `sources` 给未来前端引用展示和调试使用

### 与 LLM 节点的配合

推荐工作流写法：

```text
Start -> Knowledge Retrieval -> LLM -> End
```

`LLM.userPrompt` 示例：

```text
请基于以下知识库内容回答问题。

问题：
{{start.query}}

知识库上下文：
{{knowledge-retrieval-1.context}}

如果上下文不足以回答，请明确说明不知道，不要编造。
```

## 前端设计

### NodePalette

在 `frontend/src/features/workflow-canvas/palette/NodePalette.tsx` 增加：

- 标签：`Knowledge`
- 颜色建议：`bg-teal-100 border-teal-400`

### NodeConfigPanel

新增 `KnowledgeRetrievalConfig`，支持：

- `queryTemplate`
- `datasetIds`
- `topK`
- `scoreThreshold`
- `retrievalMode`

第一版交互建议：

- `datasetIds` 先用逗号分隔文本输入，避免为了一个节点先做复杂 selector
- 后面再升级成真实下拉多选

### 运行态展示

当前前端已经能显示 `node_end.outputs`。第一版只要确保：

- `context` 不在默认卡片里完整展开，避免太长
- `sourceCount` 和 `sources` 可以在节点调试里查看

## API 设计

### Dataset API

```text
POST   /api/rag/datasets
GET    /api/rag/datasets
GET    /api/rag/datasets/:id
POST   /api/rag/datasets/:id/documents
GET    /api/rag/datasets/:id/documents
POST   /api/apps/:appId/datasets/:datasetId
DELETE /api/apps/:appId/datasets/:datasetId
```

### Retrieval Debug API

```text
POST /api/rag/retrieve
```

用途：

- 不经过工作流，直接验证检索效果
- 便于联调 `SearchIndexAdapter`

### DTO 最小输入

创建知识库：

```json
{
  "name": "产品帮助中心",
  "description": "客服知识库",
  "retrievalMode": "keyword",
  "chunkSize": 500,
  "chunkOverlap": 80,
  "topK": 4,
  "scoreThreshold": 0.15
}
```

创建文档：

```json
{
  "name": "退款规则",
  "sourceType": "markdown",
  "content": "# 退款规则\\n..."
}
```

## 数据库建议

### TypeORM 实体

建议新增：

- `backend/src/database/entities/dataset.entity.ts`
- `backend/src/database/entities/app-dataset-binding.entity.ts`
- `backend/src/database/entities/dataset-document.entity.ts`
- `backend/src/database/entities/document-segment.entity.ts`

并在 `backend/src/database/data-source.ts` 注册。

### FTS5

如果使用 SQLite FTS5：

- 业务表继续由 TypeORM 管
- FTS 虚表通过启动 SQL 或 service 初始化维护

不要把 FTS 虚表当作事实来源。它只是一层索引。

## 运行期与幂等性

### 索引触发方式

第一版可同步触发：

- 创建文档后立刻索引

第二版改为异步任务：

- 文档入库后投递 indexing job

### 重建索引

文档重建时必须：

1. 删除旧 segment
2. 删除旧索引项
3. 重新切块
4. 重新写入 segment 和索引

至少保证“同一文档不会悄悄累计重复 segment”。

## 分阶段实施计划

### Phase 1: 最小可用 RAG

目标：在当前项目里跑通“文档入库 -> 检索节点 -> LLM 消费上下文”。

范围：

- 新增 `Dataset / DatasetDocument / DocumentSegment / AppDatasetBinding`
- 新增 `RagModule`
- 新增 `knowledge-retrieval` 节点
- 新增文本/Markdown 文档写入
- 新增 SQLite FTS5 或关键词检索实现
- 前端增加知识检索节点配置

验收：

- 能创建一个 dataset
- 能向 dataset 写入一篇文档
- 工作流执行时能检索命中并把 `context` 喂给 LLM

### Phase 2: 质量提升

范围：

- 引入 `EmbeddingAdapter`
- 增加 `semantic` / `hybrid`
- 增加简单 reranker
- 增加检索 debug 接口和命中明细

验收：

- 节点配置可选择 `keyword | semantic | hybrid`
- 检索结果支持阈值过滤与稳定排序

### Phase 3: 结构深化

范围：

- 父子块模式
- 多知识库聚合
- 元数据过滤
- 摘要索引
- 异步 indexing job

验收：

- 支持多 dataset fan-out
- 支持 child hit -> parent segment 回表

## 推荐的首批代码变更清单

### 后端

- `backend/src/types/index.ts`
- `backend/src/app.module.ts`
- `backend/src/database/data-source.ts`
- `backend/src/core/engine/node-factory.ts`
- `backend/src/core/nodes/knowledge-retrieval.node.ts`
- `backend/src/modules/rag/**`
- `backend/src/database/entities/**`

### 前端

- `frontend/src/types/index.ts`
- `frontend/src/features/workflow-canvas/palette/NodePalette.tsx`
- `frontend/src/features/workflow-canvas/NodeConfigPanel.tsx`

## 风险与取舍

### 1. 现在就上向量库会把项目复杂度拉高

当前项目是 `mini-dify`，而不是完整 Dify。

所以第一版不建议直接引入：

- Qdrant
- Milvus
- pgvector

先把模块 seam 做对，再升级底层后端。

### 2. 如果直接把检索逻辑塞进 LLMNode，会很快失控

这样会导致：

- 检索能力无法独立测试
- 未来无法做多节点复用
- 聊天模式与工作流模式强耦合

### 3. 如果不先落业务记录，后续几乎一定要返工

因为你迟早会需要：

- 来源展示
- 文档重建
- 调试命中
- 权限控制

这些都要求“命中可回指到稳定业务对象”。

## 结论

对这个仓库，最合理的 RAG 接入方式不是“大改聊天接口”，而是：

1. 把 RAG 做成独立后端模块
2. 在工作流中新增 `knowledge-retrieval` 节点
3. 先落稳定业务实体，再写搜索索引
4. 下游统一消费 `Source[]` 和 `context`
5. 第一版先用 SQLite 关键词检索把骨架跑通，再逐步升级到 embedding / hybrid / rerank

这条路径改动面可控，但后续演进空间足够大，符合 `mini-dify` 当前体量，也符合参考文档里最核心的可复用架构原则。
