# mini-dify RAG 对齐 Dify 的待完成清单

## 来源

本文档基于外部笔记 `/Users/sijin.kuang/obs/learn/知识学习/Dify RAG 检索实现笔记.md`，对照当前 `mini-dify` 的 RAG 实现，沉淀后续需要补齐的能力。

当前项目已经具备 RAG 的基础闭环：

- 文档可以进入知识库。
- 文档会经过抽取、清洗、切片。
- 切片会保存为 `DocumentSegment`。
- 工作流可以通过 `knowledge-retrieval` 节点触发检索。
- 检索结果会输出 `context`、`sources`、`hits`、`trace`。
- LLM 节点可以通过 `{{knowledge-retrieval-1.context}}` 消费检索上下文。

但当前实现仍属于关键词检索 MVP。`semantic` 和 `hybrid` 已经出现在接口层，但底层还没有真正的 embedding、向量索引、混合召回和 rerank。

## 目标状态

下一阶段目标不是推翻当前链路，而是在现有 `RagModule` 内继续加深能力：

```text
document ingest
-> extract
-> clean
-> split
-> persist segments
-> keyword index
-> embedding index
-> retrieve candidates
-> fusion / rerank
-> hydrate sources
-> assemble context
-> workflow LLM
```

工作流节点接口应保持稳定。供应商、向量库、rerank 模型等细节应沉到 RAG 模块内部，不暴露给普通节点编排者。

## 当前已具备能力

### 文档和数据集

- 已有 Dataset、Document、Segment 等基础业务对象。
- 已有 App 与 Dataset 绑定关系。
- 检索时会限制在当前 App 可用的数据集内。

### 索引流程

- 已有 `extract -> clean -> split` 编排。
- 已支持按 `chunkSize` 和 `chunkOverlap` 生成切片。
- 已能删除旧 segment 并重建关键词索引。

### 检索流程

- 已有 `RagRetrievalOrchestrator`。
- 已有 `DatasetSelector` 负责数据集选择和绑定校验。
- 已有 source hydration 和 context assembly。
- 已有 retrieval trace，便于调试检索过程。

### 工作流接入

- 已有 `knowledge-retrieval` 节点。
- 节点会输出结构化结果给变量池。
- LLM 节点可以通过模板引用检索结果。

## 需要补齐的能力

### 1. Embedding 配置与生成

当前缺口：

- Dataset 没有保存 embedding provider、model、dimension 等稳定配置。
- 文档切片后没有生成向量。
- query 检索时没有生成 query embedding。

需要完成：

- 给 Dataset 增加 embedding 配置：
  - `embeddingProvider`
  - `embeddingModel`
  - `embeddingDimension`
  - `embeddingConfig`
- 新增 `EmbeddingAdapter`：
  - `embedDocuments(texts)`
  - `embedQuery(query)`
- 索引文档时为每个 segment 生成 embedding。
- 检索 query 时生成 query embedding。
- 记录 embedding 失败原因，避免静默降级。

建议优先级：P0。

### 2. 向量索引适配器

当前缺口：

- 实际后端只有关键词索引。
- 没有向量存储接口。
- `semantic` 模式没有真正可执行路径。

需要完成：

- 新增 `VectorIndexAdapter`：
  - `upsertVectors(vectors)`
  - `searchByVector(input)`
  - `deleteByDocument(documentId)`
  - `deleteByDataset(datasetId)`
- 向量命中必须回表为 `DocumentSegment`，再组装为稳定 `Source`。
- 第一版可以先选择一个简单后端：
  - 本地 sqlite 向量扩展
  - pgvector
  - 内存向量索引，仅用于开发和测试

建议优先级：P0。

### 3. Semantic Retrieval

当前缺口：

- `retrievalMode: "semantic"` 只是接口占位。
- 检索没有基于向量相似度排序。

需要完成：

- 在 `RagRetrievalOrchestrator` 中接入语义检索路径：
  - resolve retrieval plan
  - embed query
  - vector search
  - threshold filter
  - hydrate sources
  - assemble context
- trace 中标记检索通道为 `semantic`。
- 增加端到端测试，验证 semantic 模式能命中文档。

建议优先级：P1。

### 4. Hybrid Retrieval

当前缺口：

- `retrievalMode: "hybrid"` 只是接口占位。
- 没有 keyword 和 semantic 的候选合并。
- 没有分数融合策略。

需要完成：

- 并行执行 keyword recall 和 semantic recall。
- 合并候选并去重。
- 保留候选来源：
  - `keyword`
  - `semantic`
- 新增 `FusionStrategy`：
  - weighted score
  - reciprocal rank fusion
- hybrid 模式下不要过早使用单一路径的 score threshold。
- 最终融合后再执行 threshold 和 topK。

建议优先级：P1。

### 5. Rerank

当前缺口：

- 没有 rerank 模型。
- 没有候选重排序接口。
- 没有 rerank 前后分数对比。

需要完成：

- 新增 `Reranker` 接口：
  - `rerank(query, candidates)`
- 支持两种模式：
  - weighted score，本地融合向量分和关键词分。
  - reranking model，调用独立 rerank 模型。
- trace 中记录：
  - rerank 前候选
  - rerank 后排序
  - rerank score
- 支持关闭 rerank，方便排查检索问题。

建议优先级：P2。

### 6. 更完整的切分策略

当前缺口：

- 当前切分能力偏基础。
- 尚未对齐 Dify 的递归字符切分和多文档形态。

需要完成：

- 支持 separator 配置。
- 支持递归切分策略：
  - 用户配置 separator
  - `\n\n`
  - `。`
  - `. `
  - 空格
  - 字符兜底
- 保持 `chunkOverlap` 的上下文重叠。
- 清理 chunk 开头多余符号。
- 保护 Markdown 链接和图片链接，避免清洗阶段误删。

建议优先级：P2。

### 7. 父子 Chunk

当前缺口：

- 只有单层 segment。
- 无法做到“小块召回，大块回答”。

需要完成：

- 新增父子结构：
  - parent segment 负责提供上下文。
  - child chunk 负责精确召回。
- 支持两种 parent 模式：
  - paragraph
  - full-doc
- 子 chunk 入向量索引。
- 命中子 chunk 后，返回父 segment 内容作为上下文。
- sources 中带回 child chunk 信息，方便引用和调试。

建议优先级：P3。

### 8. 文档生命周期和增量更新

当前缺口：

- 索引仍偏同步流程。
- 文档状态、重建、失败恢复能力还不完整。
- 向量索引接入后，需要更强的删除和重建保障。

需要完成：

- 文档状态机：
  - `queued`
  - `indexing`
  - `completed`
  - `failed`
- 新增 indexing job：
  - 记录开始时间、结束时间、失败原因、重试次数。
- 支持单文档重建索引。
- 支持 dataset 全量重建索引。
- 支持幂等删除旧索引：
  - segment
  - keyword index
  - vector index
  - child chunks
- 使用 hash 判断 chunk 是否变化，为增量更新做准备。

建议优先级：P2。

### 9. 检索上下文预算

当前缺口：

- 上下文主要依赖 topK 和 scoreThreshold 控制。
- 缺少更明确的 prompt context budget。

需要完成：

- 在 retrieval plan 中引入 `contextBudgetTokens`。
- context assembly 阶段根据预算截断。
- source 仍保留完整 metadata，避免引用信息丢失。
- trace 中记录哪些片段因预算被截断。

建议优先级：P2。

### 10. 检索评估体系

当前缺口：

- 没有固定评测集。
- 没有 Recall@k、MRR、Precision@k。
- 难以比较 chunk 策略、embedding 模型、hybrid 权重和 rerank 效果。

需要完成：

- 新增 RAG eval 数据格式：
  - query
  - expected document ids
  - expected segment ids
  - tags
- 新增评估指标：
  - Recall@k
  - MRR
  - Precision@k
  - NDCG，可选
- 保存 bad case：
  - query
  - expected ids
  - actual ids
  - score
  - retrieval mode
  - rerank mode
  - metadata filters
- 输出固定评估报告，方便回归比较。

建议优先级：P3。

## 推荐实施顺序

### 阶段 1：让 semantic 真的可用

目标：把当前关键词 RAG 升级为真正语义检索。

范围：

- Embedding 配置
- EmbeddingAdapter
- VectorIndexAdapter
- segment 向量入库
- query 向量检索
- semantic retrieval 测试

完成标志：

- `retrievalMode: "semantic"` 下能不依赖关键词命中文档。
- trace 能展示 semantic 命中。

### 阶段 2：让 hybrid 具备实际质量收益

目标：支持关键词和语义多通道召回。

范围：

- keyword + semantic 并行召回
- 候选去重
- weighted score 或 RRF 融合
- context budget
- debug trace 展示候选来源

完成标志：

- `retrievalMode: "hybrid"` 下能看到 keyword 和 semantic 两类候选。
- 融合后结果稳定可解释。

### 阶段 3：补 rerank 和可运维索引

目标：提升排序质量和索引可靠性。

范围：

- Reranker 接口
- rerank model 接入
- indexing job
- 文档重建
- dataset 全量重建
- 失败状态和重试

完成标志：

- rerank 前后排序可在 trace 中查看。
- 文档索引失败可定位、可重试。

### 阶段 4：补高级 RAG 能力

目标：对齐 Dify 的进阶知识库能力。

范围：

- 递归切分增强
- QA chunk
- 父子 chunk
- metadata filter
- 检索评估体系

完成标志：

- 可以用固定评测集比较不同检索策略。
- 父子 chunk 支持“小块召回，大块回答”。

## 近期建议拆分

建议优先拆成以下可执行任务：

1. 新增 Dataset embedding 配置和 `EmbeddingAdapter`。
2. 新增 `VectorIndexAdapter`，先实现一个开发可用后端。
3. 索引流程写入 segment embedding。
4. 实现 `semantic` 检索路径。
5. 扩展 trace，标记检索通道和向量命中分数。
6. 实现 `hybrid` 候选合并和 weighted score。
7. 新增 context budget 控制。
8. 新增 rerank 接口和一个可关闭的 rerank 配置。

## 非目标

以下能力不建议在下一阶段立即做：

- 多向量库插件市场。
- 多模态图片、OCR、附件索引。
- 复杂租户计费和限流。
- 完整 Dify 知识库 UI 复刻。

这些能力应等 semantic、hybrid、rerank 的核心链路稳定后再考虑。
