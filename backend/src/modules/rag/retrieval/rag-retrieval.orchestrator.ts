import { Inject, Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Dataset } from "../../../database/entities/dataset.entity";
import {
  SEARCH_INDEX_ADAPTER,
  SearchHit,
  SearchIndexAdapter,
} from "../adapters/search-index.adapter";
import { DatasetSelection, DatasetSelector } from "./dataset-selector";
import { Source, SourceHydrator } from "./source-hydrator";

export interface RetrieveInput {
  appId: string;
  query: string;
  datasetIds?: string[];
  topK?: number;
  scoreThreshold?: number;
  retrievalMode?: "keyword" | "semantic" | "hybrid";
}

export interface RetrievalPlan {
  appId: string;
  query: string;
  datasetIds: string[];
  retrievalMode: "keyword" | "semantic" | "hybrid";
  topK: number;
  scoreThreshold: number;
  candidateK: number;
  contextBudgetTokens: number;
  enableQueryRewrite: boolean;
}

export interface RetrievalTrace {
  requestedDatasetIds: string[];
  availableDatasetIds: string[];
  selectedDatasetIds: string[];
  usedExplicitSelection: boolean;
  plan: {
    retrievalMode: "keyword" | "semantic" | "hybrid";
    topK: number;
    scoreThreshold: number;
    candidateK: number;
    contextBudgetTokens: number;
    enableQueryRewrite: boolean;
  };
  rawHits: SearchHit[];
  filteredHits: SearchHit[];
  droppedHits: Array<
    SearchHit & {
      reason: "score_below_threshold";
    }
  >;
}

export interface RetrieveResult {
  query: string;
  context: string;
  sourceCount: number;
  sources: Source[];
  hits: Array<{
    segmentId: string;
    score: number;
  }>;
  trace: RetrievalTrace;
}

@Injectable()
export class RagRetrievalOrchestrator {
  constructor(
    @InjectRepository(Dataset)
    private readonly datasetRepo: Repository<Dataset>,
    private readonly datasetSelector: DatasetSelector,
    @Inject(SEARCH_INDEX_ADAPTER)
    private readonly searchIndex: SearchIndexAdapter,
    private readonly sourceHydrator: SourceHydrator
  ) {}

  async retrieve(input: RetrieveInput): Promise<RetrieveResult> {
    const query = input.query.trim();
    if (!query) {
      return this.emptyResult(
        {
          appId: input.appId,
          query: "",
          datasetIds: [],
          retrievalMode: input.retrievalMode ?? "keyword",
          topK: input.topK ?? 4,
          scoreThreshold: input.scoreThreshold ?? 0.15,
          candidateK: Math.max((input.topK ?? 4) * 2, input.topK ?? 4),
          contextBudgetTokens: 2000,
          enableQueryRewrite: false,
        },
        input.datasetIds
      );
    }

    const selection = await this.datasetSelector.select(
      input.appId,
      input.datasetIds
    );
    if (selection.datasetIds.length === 0) {
      return this.emptyResult(
        {
          appId: input.appId,
          query,
          datasetIds: [],
          retrievalMode: input.retrievalMode ?? "keyword",
          topK: input.topK ?? 4,
          scoreThreshold: input.scoreThreshold ?? 0.15,
          candidateK: Math.max((input.topK ?? 4) * 2, input.topK ?? 4),
          contextBudgetTokens: 2000,
          enableQueryRewrite: false,
        },
        input.datasetIds,
        selection
      );
    }

    const datasets = await this.datasetRepo.find({
      where: selection.datasetIds.map((id) => ({ id })),
    });
    if (datasets.length === 0) {
      return this.emptyResult(
        {
          appId: input.appId,
          query,
          datasetIds: selection.datasetIds,
          retrievalMode: input.retrievalMode ?? "keyword",
          topK: input.topK ?? 4,
          scoreThreshold: input.scoreThreshold ?? 0.15,
          candidateK: Math.max((input.topK ?? 4) * 2, input.topK ?? 4),
          contextBudgetTokens: 2000,
          enableQueryRewrite: false,
        },
        input.datasetIds,
        selection
      );
    }

    const plan = this.resolvePlan({ ...input, query }, datasets);

    // Semantic and hybrid modes are accepted already so the node contract does
    // not change when Phase 2 swaps in richer search adapters.
    const hits = await this.searchIndex.search({
      datasetIds: plan.datasetIds,
      query,
      topK: plan.topK,
    });

    const filteredHits = hits.filter((hit) => hit.score >= plan.scoreThreshold);
    const sources = await this.sourceHydrator.hydrate(filteredHits);
    const trace = this.buildTrace(
      selection,
      plan,
      hits,
      filteredHits,
      input.datasetIds
    );

    return {
      query,
      context: this.assembleContext(sources),
      sourceCount: sources.length,
      sources,
      hits: filteredHits,
      trace,
    };
  }

  /**
   * 解析检索策略。将输入覆盖、数据集默认值和系统兜底值合并为一份执行计划。
   */
  private resolvePlan(
    input: RetrieveInput,
    datasets: Dataset[]
  ): RetrievalPlan {
    const topK =
      input.topK ??
      (datasets.length > 0
        ? Math.max(...datasets.map((dataset) => dataset.topK))
        : 4);
    const scoreThreshold =
      input.scoreThreshold ??
      (datasets.length > 0
        ? Math.min(...datasets.map((dataset) => dataset.scoreThreshold))
        : 0.15);

    const datasetModes = Array.from(
      new Set(datasets.map((dataset) => dataset.retrievalMode))
    );

    return {
      appId: input.appId,
      query: input.query.trim(),
      datasetIds: datasets.map((dataset) => dataset.id),
      retrievalMode:
        input.retrievalMode ??
        (datasetModes.length === 1 ? datasetModes[0] : "keyword"),
      topK,
      scoreThreshold,
      // Keep the first plan conservative; later phases can widen recall without
      // changing the node/controller contract.
      candidateK: Math.max(topK * 2, topK),
      contextBudgetTokens: 2000,
      enableQueryRewrite: false,
    };
  }

  /**
   * 将检索到的来源拼接为供 LLM 使用的上下文字符串。
   */
  private assembleContext(sources: Source[]): string {
    return sources
      .map(
        (source, index) =>
          `[${index + 1}] ${source.documentName} / 段落 ${source.position + 1}\n${source.content}`
      )
      .join("\n\n");
  }

  /**
   * 构建检索链路追踪。将数据集选择、执行计划、原始命中和过滤结果打包，
   * 用于下游调试和审计。
   */
  private buildTrace(
    selection: DatasetSelection,
    plan: RetrievalPlan,
    rawHits: SearchHit[],
    filteredHits: SearchHit[],
    requestedDatasetIds?: string[]
  ): RetrievalTrace {
    const keptIds = new Set(filteredHits.map((hit) => hit.segmentId));

    return {
      requestedDatasetIds: requestedDatasetIds ?? [],
      availableDatasetIds: selection.availableDatasetIds,
      selectedDatasetIds: selection.datasetIds,
      usedExplicitSelection: selection.usedExplicitSelection,
      plan: {
        retrievalMode: plan.retrievalMode,
        topK: plan.topK,
        scoreThreshold: plan.scoreThreshold,
        candidateK: plan.candidateK,
        contextBudgetTokens: plan.contextBudgetTokens,
        enableQueryRewrite: plan.enableQueryRewrite,
      },
      rawHits,
      filteredHits,
      droppedHits: rawHits
        .filter((hit) => !keptIds.has(hit.segmentId))
        .map((hit) => ({ ...hit, reason: "score_below_threshold" as const })),
    };
  }

  private emptyResult(
    plan: RetrievalPlan,
    requestedDatasetIds?: string[],
    selection = {
      datasetIds: plan.datasetIds,
      availableDatasetIds: plan.datasetIds,
      usedExplicitSelection: Boolean(requestedDatasetIds?.length),
    }
  ): RetrieveResult {
    return {
      query: plan.query,
      context: "",
      sourceCount: 0,
      sources: [],
      hits: [],
      trace: this.buildTrace(selection, plan, [], [], requestedDatasetIds),
    };
  }
}
