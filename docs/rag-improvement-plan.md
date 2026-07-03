# mini-dify RAG 完善方案

## 1. 现状判断

当前项目已经把 RAG 放在了正确的 seam 上：

- 工作流侧通过 `knowledge-retrieval` 节点接入
- 后端侧通过 `RagModule` 承担索引和检索
- 下游继续消费 `context` 和 `sources`

这条主路径是对的，不建议回退到“把检索塞进聊天接口”或“把检索塞进 `LLMNode`”。

但当前实现仍然停留在“Phase 1 骨架可跑通”的状态，主要问题有 5 个：

1. `retrievalMode` 已暴露给节点和 API，但后端仍只有一个关键词适配器，`semantic` / `hybrid` 只是占位。
2. 检索参数的合并方式过于简化，`topK` 和 `scoreThreshold` 是从 dataset 里做 `max/min` 推断，后续很难承载混合检索策略。
3. 显式传入 `datasetIds` 时没有经过 app 绑定校验，调用方可以绕开绑定关系。
4. 索引链路是同步执行的，缺少重建、幂等、并发保护和可观测性。
5. 前端只有节点配置，没有知识库运营面板、引用展示和检索调试面板，能力难以真正被使用。

## 2. 目标

下一阶段不应该推翻现有骨架，而应该继续“加深 `RagModule`，保持节点接口稳定”。

目标状态：

- `knowledge-retrieval` 节点的输入输出基本不变
- `RagRetrievalOrchestrator` 变成真正的深模块，内部吸收检索策略复杂度
- `RagIndexingOrchestrator` 从同步脚本式实现，演进成有状态、可重建、可观测的索引流水线
- 前端补齐“配置知识库、绑定知识库、查看命中、展示引用”这条完整链路

## 3. 设计原则

1. 工作流节点继续只表达“我要检索什么”，不表达“怎么检索”。
2. 业务表仍然是事实来源，索引后端只是 adapter。
3. 检索策略放在 retrieval seam 内部，不把复杂参数散落到节点、控制器、前端。
4. 所有命中都必须回表为稳定业务对象，再传给下游。
5. 先补齐结构缺口，再上 embedding、hybrid、rerank；不要反过来。

## 4. 分层完善方案

### 4.1 P1.5：先补结构缺口

这是最优先的一层，解决“骨架能跑，但还不够稳”的问题。

建议新增 4 个内部模块：

- `RetrievalPolicyResolver`
  负责把 dataset 默认值、节点覆盖值、系统默认值合并成单个 `RetrievalPlan`。
- `AuthorizedDatasetSelector`
  负责选择 dataset，并校验显式传入的 `datasetIds` 是否属于当前 app 的绑定集合。
- `RetrievalTraceBuilder`
  负责把“选了哪些 dataset、召回了哪些 hit、过滤掉了哪些 hit”整理成调试信息。
- `DocumentLifecycleService`
  负责文档删除、重建索引、状态迁移，避免这些逻辑散落在 controller 和 orchestrator。

建议把当前接口收敛成下面的内部模型：

```ts
interface RetrievalPlan {
  appId: string;
  query: string;
  datasetIds: string[];
  mode: "keyword" | "semantic" | "hybrid";
  topK: number;
  scoreThreshold: number;
  candidateK: number;
  contextBudgetTokens: number;
  enableQueryRewrite: boolean;
}
```

这样调用方仍然只传简单输入，但复杂策略合并被沉到 retrieval 模块内部。

这一层要落地的变更：

- `DatasetSelector` 改成“选择 + 授权校验”，不再直接信任显式 `datasetIds`
- `RagRetrievalOrchestrator` 不再自己拼 `topK/max`、`threshold/min`
- `RetrieveResult` 增加 `trace` 字段，供 debug API 和前端调试使用
- 增加文档删除、文档重建接口
- 文档状态补齐 `queued | indexing | completed | failed`

### 4.2 P2：把检索质量能力真正接进来

这一层的关键不是“多加两个 if”，而是把 `SearchIndexAdapter` 设计成能承载多通道召回。

当前接口：

```ts
search(input: SearchQuery): Promise<SearchHit[]>
```

对 hybrid 来说太浅，建议升级为：

```ts
interface SearchPlan {
  datasetIds: string[];
  query: string;
  mode: "keyword" | "semantic" | "hybrid";
  topK: number;
  candidateK: number;
  filters?: Record<string, unknown>;
}

interface CandidateHit {
  segmentId: string;
  score: number;
  channel: "keyword" | "semantic";
  rawScore?: number;
  metadata?: Record<string, unknown>;
}
```

然后把检索编排拆成：

```text
query rewrite
-> keyword recall
-> semantic recall
-> fusion
-> rerank
-> threshold filter
-> hydrate
-> context assemble
```

建议新增的 seam：

- `EmbeddingAdapter`
- `VectorIndexAdapter`
- `QueryRewriteModule`
- `Reranker`
- `FusionStrategy`

建议新增的 dataset 配置：

- `embeddingProvider`
- `embeddingModel`
- `rerankProvider`
- `rerankModel`
- `contextBudgetTokens`
- `candidateK`
- `queryRewriteEnabled`

这层的关键点是：embedding、vector store、rerank 都是 adapter，不要把供应商细节暴露到节点配置里。

### 4.3 P3：把索引流水线做成真正的业务能力

当前 `createDocument -> 同步 indexDocument` 只适合演示，不适合持续演进。

建议把索引侧改成“命令 + 任务”的模型：

```text
create document
-> enqueue indexing job
-> extract
-> clean
-> split
-> persist segments
-> build keyword index
-> build embedding/vector index
-> complete job
```

建议新增实体：

- `indexing_jobs`
  记录任务状态、开始结束时间、失败原因、重试次数。

建议新增能力：

- 文档重建索引
- dataset 全量重建索引
- 并发保护
  同一文档同时只能有一个 active indexing job。
- 幂等保障
  重建前先删旧 segment 和旧 index，再写新版本。

这一层完成后，RAG 才算从“功能存在”进化到“系统可运维”。

### 4.4 P4：补齐产品闭环

当前前端只有节点配置，没有知识库运营面。

建议补 4 个界面能力：

1. 知识库列表页
   支持创建 dataset、查看状态、查看绑定关系。
2. 知识库详情页
   支持创建文档、重建索引、删除文档、查看索引状态。
3. 应用绑定面板
   在 app 维度管理 dataset binding，而不是让节点配置直接依赖手填 id。
4. 检索调试面板
   直接展示 query、命中 segment、过滤后结果、最终 context。

工作流运行态也要补两块：

- `node_end.outputs.sources` 的可视化查看
- Chat 页面对最终回答展示 citation / source list

## 5. 推荐的模块重构

建议把 `backend/src/modules/rag/` 深化成下面的形状：

```text
rag/
  contracts/
    retrieval-plan.ts
    retrieval-result.ts
    source.ts
  dataset/
    rag-dataset.service.ts
    dataset-binding.service.ts
    document-lifecycle.service.ts
  indexing/
    rag-indexing.orchestrator.ts
    indexing-job.service.ts
    extract/
    clean/
    split/
  retrieval/
    rag-retrieval.orchestrator.ts
    retrieval-policy-resolver.ts
    authorized-dataset-selector.ts
    query-rewriter.ts
    fusion-strategy.ts
    reranker.ts
    source-hydrator.ts
    context-assembler.ts
    retrieval-trace-builder.ts
  adapters/
    search-index.adapter.ts
    keyword-index.adapter.ts
    vector-index.adapter.ts
    embedding.adapter.ts
```

这里最重要的不是目录本身，而是让 orchestrator 只负责编排，把策略决策和 adapter 细节继续下沉。

## 6. 对现有代码的具体调整建议

### 后端

1. `backend/src/modules/rag/retrieval/rag-retrieval.orchestrator.ts`
   不再直接读取 dataset 并拼 `topK` / `scoreThreshold`，改为依赖 `RetrievalPolicyResolver`。
2. `backend/src/modules/rag/retrieval/dataset-selector.ts`
   改成带权限语义的 selector，显式传入的 dataset 也必须经过 app binding 校验。
3. `backend/src/modules/rag/adapters/search-index.adapter.ts`
   扩成支持 keyword / semantic / hybrid 的 `SearchPlan` 和 `CandidateHit`。
4. `backend/src/modules/rag/indexing/rag-indexing.orchestrator.ts`
   不再只接受同步调用，后续改成 job consumer 复用。
5. `backend/src/modules/rag/services/rag-dataset.service.ts`
   拆出文档生命周期职责，避免 dataset service 既管 CRUD 又管索引。

### 数据层

1. 保留 `Dataset / DatasetDocument / DocumentSegment / AppDatasetBinding` 作为稳定事实表。
2. `DocumentSegmentIndex` 不要继续承担长期“检索后端”角色。
   它适合 Phase 1 兜底，不适合承载 hybrid 检索。
3. 新增 `indexing_jobs`，必要时再新增 `segment_embeddings` 或由向量库 adapter 自己持久化。

### 前端

1. 节点配置不应该长期依赖手填 `datasetIds`。
2. 增加 dataset 多选器，并显示“当前 app 绑定知识库”。
3. 运行调试面板展示 `trace`、`hits`、`sources`。
4. Chat 展示引用来源，否则 `sources` 只能停留在后端返回值里。

## 7. 推荐实施顺序

建议按下面 6 个 issue 推进，而不是一次性做完。

1. `P1.5-a`
   授权化 dataset selector + retrieval policy resolver + retrieval trace。
2. `P1.5-b`
   文档删除 / 重建索引 / 文档状态机 / indexing job 表。
3. `P2-a`
   `SearchIndexAdapter` 升级为多通道召回接口。
4. `P2-b`
   引入 `EmbeddingAdapter` + `VectorIndexAdapter` + semantic recall。
5. `P2-c`
   hybrid fusion + reranker + context budget 控制。
6. `P3`
   前端知识库运营页、调试页、回答引用展示。

## 8. 不建议现在做的事

1. 不建议现在把检索逻辑挪进 `LLMNode`。
2. 不建议现在直接接入重量级向量库并重写整个模块。
3. 不建议让节点配置承担 embedding model、rerank model 这类底层参数。
4. 不建议继续扩展“手填 dataset id”这条前端交互。

## 9. 结论

这个项目接下来最合理的路线不是“继续往 Phase 1 上堆功能”，而是：

1. 先把当前 RAG seam 做深
2. 再把 semantic / hybrid / rerank 接到这个 seam 后面
3. 最后补齐知识库运营、调试和引用展示

如果按这个顺序推进，现有的 `knowledge-retrieval` 节点和 `RagModule` 不需要推翻，只需要继续深化，就能从“可跑通”平滑演进到“可扩展、可运维、可上线”。
