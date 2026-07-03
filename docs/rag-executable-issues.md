# RAG Executable Issues

当前环境未配置 GitHub CLI 或 GitHub 凭证，因此这 8 张 issue 先以标准 issue body 形式落盘。

如果后续仓库配置了 `gh` 或可用 token，可以按依赖顺序直接发布到 issue tracker。

## Issue 1

### Title

收紧知识库选择并补齐检索 trace

### Body

## What to build

把当前 `knowledge-retrieval` 节点和检索 debug API 背后的 dataset 选择逻辑升级为“选择 + app 绑定校验”，避免调用方通过显式 `datasetIds` 绕过绑定关系。

同时，把当前检索链路中隐含的策略决策和调试信息整理成稳定输出：

- 引入统一的检索计划对象，负责合并 dataset 默认值、节点覆盖值和系统默认值
- 为检索结果增加 trace，至少能说明使用了哪些 dataset、召回了哪些 hits、哪些 hits 因 threshold 被过滤

这张 issue 完成后，现有工作流节点和 debug API 的调用方式不需要变化，但检索行为会变得可授权、可解释、可调试。

## Acceptance criteria

- [ ] 显式传入未绑定到当前 app 的 `datasetIds` 时，请求被明确拒绝
- [ ] 未显式传入 `datasetIds` 时，仍回退到当前 app 绑定的全部 dataset
- [ ] 检索结果包含 `trace`，至少覆盖 dataset 选择、原始 hits、threshold 过滤结果
- [ ] 有测试覆盖显式 dataset、默认 dataset、非法 dataset 三条路径

## Blocked by

None - can start immediately

## Issue 2

### Title

文档生命周期最小闭环：删除、重建索引、状态机

### Body

## What to build

补齐知识库文档的最小生命周期闭环，让文档不再只有“创建并同步索引”这一条路。

这张 issue 需要提供：

- 删除文档
- 单篇文档重建索引
- 明确的文档状态机
- 清晰的文档生命周期职责边界，避免 CRUD、状态迁移、索引触发继续耦在同一个 service 里

目标是把当前同步 demo 链路，升级为可维护的文档管理能力，同时保证重建索引时不会累积重复 segment 或旧索引残留。

## Acceptance criteria

- [ ] 支持删除文档，并同步删除旧 segments 与旧索引项
- [ ] 支持对单篇文档触发重建索引
- [ ] 文档状态至少覆盖 `queued | indexing | completed | failed`
- [ ] 重建索引不会累计重复 segment
- [ ] 有 API 和 service 级测试覆盖删除与重建场景

## Blocked by

- Issue 1: 收紧知识库选择并补齐检索 trace

## Issue 3

### Title

应用级知识库绑定面板与节点 dataset 选择器

### Body

## What to build

把当前依赖“手填 dataset id”的节点配置方式，升级为 app 维度的知识库绑定和选择体验。

这张 issue 需要打通一条完整路径：

- 在应用维度查看和管理已绑定的知识库
- 在 `knowledge-retrieval` 节点配置中直接选择当前 app 可用的 dataset
- 继续保留“留空表示使用当前 app 全部绑定知识库”的行为

完成后，知识库使用路径应从“手工输入 id”进化为“先绑定，再在节点中选择”，使 RAG 配置更符合业务概念。

## Acceptance criteria

- [ ] 前端可查看并管理 app 当前绑定的 dataset
- [ ] `knowledge-retrieval` 节点配置支持选择绑定知识库，不再依赖手填 ID
- [ ] 留空时仍表示使用当前 app 的全部绑定知识库
- [ ] 有前端交互验证和后端绑定接口测试

## Blocked by

- Issue 1: 收紧知识库选择并补齐检索 trace

## Issue 4

### Title

检索调试面板与节点运行态来源可视化

### Body

## What to build

基于现有 retrieval debug API 和新增的 `trace` 字段，补齐 RAG 的可视化调试体验。

这张 issue 需要让开发者和工作流编排者能够直接看到：

- query
- 参与检索的 dataset
- 原始 hits
- 过滤后的结果
- 最终拼出的 context
- 返回给节点的 sources

同时，工作流运行态要能查看 `hits`、`sources`、`sourceCount`，而不是只把这些数据塞在原始 JSON 里。

## Acceptance criteria

- [ ] 可以直接输入 query 并查看检索结果、trace、最终 context
- [ ] 工作流节点运行结果支持查看 `sources` 和 `hits`
- [ ] 长 context 默认折叠，避免运行卡片信息失控
- [ ] 有前端状态流测试或关键交互覆盖

## Blocked by

- Issue 1: 收紧知识库选择并补齐检索 trace
- Issue 3: 应用级知识库绑定面板与节点 dataset 选择器

## Issue 5

### Title

Semantic retrieval 第一条可用链路

### Body

## What to build

把当前仅作为占位字段存在的 `semantic` 检索模式，升级为真正可用的一条端到端链路。

这张 issue 需要贯通：

- 语义索引数据生成
- 语义召回执行
- 检索结果回表
- 节点消费与 debug API 调试

实现重点是保持现有 `knowledge-retrieval` 节点接口稳定，把 embedding 和向量索引能力沉到 RAG 模块内部，而不是把供应商细节暴露到节点配置层。

## Acceptance criteria

- [ ] `semantic` 模式下，文档会生成可用于语义召回的索引数据
- [ ] 节点或 debug API 选择 `semantic` 时，结果走语义召回链路
- [ ] 失败模式可观测，至少能看到 embedding 或 indexing 错误
- [ ] 有端到端测试验证 `semantic` 模式可检索命中

## Blocked by

- Issue 1: 收紧知识库选择并补齐检索 trace
- Issue 2: 文档生命周期最小闭环：删除、重建索引、状态机

## Issue 6

### Title

Hybrid retrieval、fusion 与 rerank

### Body

## What to build

在 semantic 可用后，把 `hybrid` 从字段值升级为真正的多通道检索能力。

这张 issue 需要完成：

- keyword recall 和 semantic recall 的并行候选召回
- 融合排序
- rerank
- context budget 控制

完成后，调用方仍然只通过 `knowledge-retrieval` 节点表达“我要检索”，而不需要理解底层召回和排序细节。

## Acceptance criteria

- [ ] `hybrid` 模式会同时使用 keyword 和 semantic 候选
- [ ] 最终结果经过统一 fusion、rerank、threshold 过滤
- [ ] context 组装受 budget 控制，不会无限拼接
- [ ] debug 面板能区分候选来源和最终排序结果

## Blocked by

- Issue 5: Semantic retrieval 第一条可用链路

## Issue 7

### Title

异步 indexing job 与 dataset 全量重建

### Body

## What to build

把当前同步执行的索引流程升级为异步 job 模型，并补齐 dataset 级运维能力。

这张 issue 需要提供：

- indexing job 记录与状态管理
- 异步执行索引任务
- dataset 级全量重建入口
- 并发保护和幂等保障

目标是把当前“功能存在”的 RAG 索引链路，演进为可运维、可恢复、可观察的后端能力。

## Acceptance criteria

- [ ] 创建或重建文档索引走 job 流程，而不是同步阻塞
- [ ] 可以查看 job 状态、失败原因、开始结束时间
- [ ] 支持 dataset 级全量重建
- [ ] 同一文档不会同时存在多个 active indexing job
- [ ] 有测试覆盖并发保护和重复重建场景

## Blocked by

- Issue 2: 文档生命周期最小闭环：删除、重建索引、状态机
- Issue 5: Semantic retrieval 第一条可用链路

## Issue 8

### Title

聊天回答引用展示

### Body

## What to build

把后端已经返回的 `sources` 契约延伸到最终产品体验，在聊天回答中展示引用来源。

这张 issue 需要让终端用户能看到：

- 回答引用了哪些知识库文档
- 文档来自哪个 dataset
- 具体对应哪个段落

重点是复用当前 RAG 输出契约，不把来源展示逻辑反向塞进 `LLMNode`。

## Acceptance criteria

- [ ] 含知识检索的回答可以展示来源列表
- [ ] 来源至少显示文档名、段落位置、所属 dataset
- [ ] 没有来源时界面表现清晰，不显示误导性占位
- [ ] 有前端渲染和数据映射测试

## Blocked by

- Issue 4: 检索调试面板与节点运行态来源可视化
