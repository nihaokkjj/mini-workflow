# RAG Phase 2 设计文档

- 日期：2026-07-03
- 范围：Semantic / Hybrid 检索、Embedding Adapter、Vector Index Adapter、多通道召回接口
- 作者：Claude Code

## 1. 背景与目标

当前 RAG 已实现 Phase 1 骨架：

- `RagModule` 负责索引与检索
- `knowledge-retrieval` 工作流节点提供检索入口
- SQLite 关键词索引兜底
- `retrievalMode` 字段已暴露为 `keyword | semantic | hybrid`，但后端仅有 keyword 实现

Phase 2 目标是在不破坏现有节点接口的前提下，把 `semantic` 模式真正跑通，并把 `SearchIndexAdapter` 升级成能承载多通道召回的 seam，为后续 rerank/fusion（P2-c）打好基础。

## 2. 设计决策

| 议题                    | 决策                                                                           |
| ----------------------- | ------------------------------------------------------------------------------ |
| Embedding 方案          | OpenAI-compatible Embedding API + SQLite 存向量                                |
| 向量存储                | 新增 `SegmentEmbedding` 表，检索时内存计算 cosine similarity                   |
| Embedding 配置          | 全局环境变量（`EMBEDDING_BASE_URL` / `EMBEDDING_API_KEY` / `EMBEDDING_MODEL`） |
| 已有数据                | 懒加载：首次 semantic 检索时实时生成并写入 embedding                           |
| Hybrid 模式             | keyword + semantic 两路召回，简单去重合并，不做分数融合                        |
| Rerank / context budget | 本期不实现，保留接口扩展空间                                                   |

## 3. 非目标

- 不引入外部向量库（Qdrant / Milvus / pgvector）
- 不实现复杂 hybrid fusion 算法（RRF、加权归一化）
- 不实现 reranker
- 不实现文档删除/重建索引的独立业务接口
- 不在前端新增知识库运营面板

## 4. 架构概览

```text
knowledge-retrieval node
        │
        ▼
RagRetrievalOrchestrator
        │
        ├── RetrievalPolicyResolver  → RetrievalPlan
        ├── DatasetSelector          → 授权后的 datasetIds
        │
        ▼
SqliteSearchIndexAdapter (SEARCH_INDEX_ADAPTER)
        │
        ├── mode=keyword  → SqliteKeywordSearchAdapter
        ├── mode=semantic → SqliteSemanticSearchAdapter
        │                       ├── OpenAIEmbeddingAdapter
        │                       └── SqliteVectorIndexAdapter
        │
        └── mode=hybrid → SqliteHybridSearchAdapter
                            ├── SqliteKeywordSearchAdapter
                            └── SqliteSemanticSearchAdapter
        │
        ▼
threshold filter → source hydrator → context assembler → trace
```

## 5. 数据模型变更

### 5.1 新增 `SegmentEmbedding` 实体

```ts
@Entity("segment_embeddings")
@Index(["segmentId"], { unique: true })
export class SegmentEmbedding {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column()
  segmentId: string;

  @ManyToOne(() => DocumentSegment, { onDelete: "CASCADE" })
  @JoinColumn({ name: "segmentId" })
  segment: DocumentSegment;

  @Column("simple-json")
  vector: number[];

  @Column()
  model: string;

  @CreateDateColumn()
  createdAt: Date;
}
```

- `vector` 以 JSON 数组形式存储，避免引入二进制/向量库依赖
- `model` 字段用于检测模型变更，自动失效重建

### 5.2 `Dataset` 实体

本期不新增 embedding 相关字段（因使用全局 env）。保留现有：

- `retrievalMode: "keyword" | "semantic" | "hybrid"`
- `topK`, `scoreThreshold`

后续若支持 per-dataset embedding 模型，可再扩展。

## 6. Adapter 层设计

### 6.1 `EmbeddingAdapter`

```ts
export interface EmbeddingAdapter {
  embed(texts: string[]): Promise<number[][]>;
}
```

实现：`OpenAIEmbeddingAdapter`

- 环境变量：
  - `EMBEDDING_BASE_URL`（默认 `https://api.openai.com/v1`）
  - `EMBEDDING_API_KEY`
  - `EMBEDDING_MODEL`（默认 `text-embedding-3-small`）
  - `EMBEDDING_DIMENSIONS`（可选）
- 使用 `openai` 包调用 `/embeddings`
- 支持批量请求（默认 64 条/批）
- 失败时抛出 `EmbeddingError`

### 6.2 `VectorIndexAdapter`

```ts
export interface VectorIndexAdapter {
  upsert(embeddings: SegmentEmbedding[]): Promise<void>;
  deleteByDocument(documentId: string): Promise<void>;
  deleteBySegmentIds(segmentIds: string[]): Promise<void>;
  search(input: VectorSearchQuery): Promise<VectorSearchHit[]>;
}

export interface VectorSearchQuery {
  datasetIds: string[];
  queryVector: number[];
  topK: number;
}

export interface VectorSearchHit {
  segmentId: string;
  score: number;
}
```

实现：`SqliteVectorIndexAdapter`

- 通过 TypeORM `SegmentEmbedding` 读取/写入向量
- 搜索时加载目标 dataset 的全部 embedding，内存计算 cosine similarity
- 不处理懒加载，仅做存储与相似度计算

### 6.3 升级后的 `SearchIndexAdapter`

```ts
export interface SearchIndexAdapter {
  search(plan: SearchPlan): Promise<CandidateHit[]>;
  deleteByDocument(documentId: string): Promise<void>;
}

export interface SearchPlan {
  datasetIds: string[];
  query: string;
  mode: "keyword" | "semantic" | "hybrid";
  topK: number;
  candidateK: number;
}

export interface CandidateHit {
  segmentId: string;
  score: number;
  channel: "keyword" | "semantic";
  rawScore?: number;
}
```

### 6.4 具体实现

- `SqliteKeywordSearchAdapter`：迁移现有关键词逻辑，只处理 `mode === "keyword"`
- `SqliteSemanticSearchAdapter`：
  1. 调用 `EmbeddingAdapter.embed([query])` 得到 queryVector
  2. 查询 `DocumentSegment` 获取候选 segment
  3. 检查 `SegmentEmbedding`，对缺失或模型不一致的 segment 批量生成 embedding 并写入
  4. 调用 `VectorIndexAdapter.search` 返回 `CandidateHit[]`
- `SqliteHybridSearchAdapter`：
  1. 并行调用 keyword 与 semantic 子适配器
  2. 按 `segmentId` 去重，保留更高分
  3. 返回合并后的 `CandidateHit[]`
- `SqliteSearchIndexAdapter`：作为 `SEARCH_INDEX_ADAPTER` 的统一实现，按 `mode` 分发到上述三个子适配器

### 6.5 索引写入侧

新增 `KeywordIndexWriter` 与 `VectorIndexWriter`：

```ts
export interface KeywordIndexWriter {
  upsertSegments(segments: IndexedSegment[]): Promise<void>;
  deleteByDocument(documentId: string): Promise<void>;
}

export interface VectorIndexWriter {
  upsertEmbeddings(embeddings: SegmentEmbedding[]): Promise<void>;
  deleteByDocument(documentId: string): Promise<void>;
}
```

`RagIndexingOrchestrator` 在删除旧 segment 和旧 keyword index 时，同步调用 `VectorIndexWriter.deleteByDocument` 清理过期 embedding。

## 7. 检索流程

### 7.1 Orchestrator 调用

```ts
const hits = await this.searchIndex.search({
  datasetIds: plan.datasetIds,
  query,
  mode: plan.retrievalMode,
  topK: plan.topK,
  candidateK: plan.candidateK,
});
```

返回的 `hits` 为 `CandidateHit[]`，后续 `threshold filter`、`sourceHydrator`、`trace` 均基于此。

### 7.2 RetrievalPlan 决议

`RetrievalPolicyResolver` 保持现有逻辑：

- 节点显式传 `retrievalMode` → 使用节点值
- 所有 dataset `retrievalMode` 一致 → 使用该值
- 不一致 → 默认 `keyword`
- `candidateK` 保持 `Math.max(topK * 2, topK)`

### 7.3 Semantic 通道懒加载

`SqliteSemanticSearchAdapter` 内部：

1. 嵌入 query
2. 加载目标 dataset 的全部 `DocumentSegment`
3. 读取已有 `SegmentEmbedding`
4. 对缺失或 `model` 不匹配的 segment：
   - 按 batch（64 条）调用 `EmbeddingAdapter.embed`
   - 写入 `SegmentEmbedding`
5. 计算 cosine similarity，取 topK

### 7.4 Hybrid 通道

`SqliteHybridSearchAdapter`：

1. 并行执行 keyword 与 semantic
2. 按 `segmentId` 去重，保留更高分
3. 返回带 `channel` 标记的命中

### 7.5 Trace 增强

`rawHits` / `filteredHits` / `droppedHits` 的类型从 `{ segmentId, score }` 扩展为 `CandidateHit`，包含 `channel`，便于调试。

## 8. 索引流程与生命周期

### 8.1 文档创建/更新

保持现有流程：

```text
extract → clean → split → persist DocumentSegment → write keyword index
```

新增：在删除旧 segment 时同步删除旧 embedding：

```ts
await this.segmentRepo.delete({ documentId: document.id });
await this.keywordIndexWriter.deleteByDocument(document.id);
await this.vectorIndexWriter.deleteByDocument(document.id);
```

### 8.2 懒加载触发

`SegmentEmbedding` 首次写入发生在 semantic 检索时：

- 条件 1：`DocumentSegment` 已存在但无对应 `SegmentEmbedding`
- 条件 2：`SegmentEmbedding.model !== process.env.EMBEDDING_MODEL`

### 8.3 并发与幂等

- `SegmentEmbedding.segmentId` 设唯一约束
- 重复写入等价于更新，不额外加锁
- 懒加载批量写入使用普通 TypeORM save

## 9. API / 前端 / 配置变化

### 9.1 后端环境变量

```bash
EMBEDDING_BASE_URL=https://api.openai.com/v1
EMBEDDING_API_KEY=sk-...
EMBEDDING_MODEL=text-embedding-3-small
# EMBEDDING_DIMENSIONS= 可选
```

### 9.2 API 变化

- `POST /api/rag/retrieve`：入参 `RetrieveDto` 已支持 `retrievalMode`，无需改动；返回 `trace` 增强 `channel`
- 知识库管理接口：`CreateDatasetDto` 已支持 `retrievalMode: semantic | hybrid`，无需改动
- 不新增显式 reindex 接口（懒加载自动补齐）

### 9.3 前端变化

- 当前 `KnowledgeRetrievalConfig` 已支持 `retrievalMode` 选择，Phase 2 无需改前端节点配置
- 可选增强（非必须）：在检索调试面板展示 `channel`

### 9.4 NestJS 模块注册

`RagModule` 新增 provider：

- `OpenAIEmbeddingAdapter`
- `SqliteVectorIndexAdapter`
- `SqliteKeywordSearchAdapter`
- `SqliteSemanticSearchAdapter`
- `SqliteHybridSearchAdapter`
- `SqliteSearchIndexAdapter`（作为 `SEARCH_INDEX_ADAPTER`）
- `SegmentEmbedding` 实体

## 10. 错误处理

| 场景                | 行为                                                                              |
| ------------------- | --------------------------------------------------------------------------------- |
| Embedding API 失败  | 抛出 `EmbeddingError`，orchestrator 转为节点 error，trace 记录 `embedding_failed` |
| 无 segment 命中     | 返回空结果                                                                        |
| 模型维度/模型名变更 | 通过 `SegmentEmbedding.model` 检测，自动重新 embedding                            |
| 空 query            | 保持现有 early return 空结果逻辑                                                  |
| Hybrid 单路失败     | 失败路抛出异常，整体检索失败（不静默降级）                                        |

## 11. 测试策略

### 11.1 单元测试

- `SqliteVectorIndexAdapter`：cosine similarity 计算正确性
- `OpenAIEmbeddingAdapter`：mock OpenAI client，验证 batch 调用
- `SqliteSemanticSearchAdapter`：mock 依赖，验证懒加载只调用一次 embedding API
- `RetrievalPolicyResolver`：mode 选择逻辑
- `RagRetrievalOrchestrator`：mock 所有依赖，验证按 mode 分发

### 11.2 集成测试

1. 创建 dataset，`retrievalMode=semantic`
2. 上传 markdown 文档
3. 第一次 semantic 检索：验证触发 embedding 写入，返回结果
4. 第二次 semantic 检索：验证使用已有 embedding，不重复调用 API
5. hybrid 检索：验证结果包含 keyword 与 semantic 两路
6. keyword 检索：验证行为与 Phase 1 一致

### 11.3 类型检查

- `npm run type-check` 确保 SearchIndexAdapter 升级后无类型错误

## 12. 风险与后续工作

| 风险                           | 缓解                                         |
| ------------------------------ | -------------------------------------------- |
| 大数据集 semantic 检索全表扫描 | Phase 2 规模可控；后续可引入 ANN 库或向量库  |
| 首次 semantic 检索慢           | 懒加载导致；后续可加异步预生成或显式 reindex |
| embedding 模型变更需全部重建   | 通过 `model` 字段自动检测，按需重建          |

后续 Phase 2-c 可在此基础上添加：

- 真正的 hybrid fusion 策略（RRF / 加权）
- Reranker
- Context budget 控制
- 异步 indexing job
