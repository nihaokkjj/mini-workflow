import { Inject, Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Dataset } from "../../../database/entities/dataset.entity";
import {
  SEARCH_INDEX_ADAPTER,
  SearchIndexAdapter,
} from "../adapters/search-index.adapter";
import { ContextAssembler, Source } from "./context-assembler";
import { DatasetSelector } from "./dataset-selector";
import {
  RetrievalPlan,
  RetrievalPolicyResolver,
} from "./retrieval-policy-resolver";
import {
  RetrievalTrace,
  RetrievalTraceBuilder,
} from "./retrieval-trace-builder";
import { SourceHydrator } from "./source-hydrator";

export interface RetrieveInput {
  appId: string;
  query: string;
  datasetIds?: string[];
  topK?: number;
  scoreThreshold?: number;
  retrievalMode?: "keyword" | "semantic" | "hybrid";
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
    private readonly retrievalPolicyResolver: RetrievalPolicyResolver,
    @Inject(SEARCH_INDEX_ADAPTER)
    private readonly searchIndex: SearchIndexAdapter,
    private readonly sourceHydrator: SourceHydrator,
    private readonly contextAssembler: ContextAssembler,
    private readonly retrievalTraceBuilder: RetrievalTraceBuilder
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

    const plan = this.retrievalPolicyResolver.resolve(
      { ...input, query },
      datasets
    );

    // Semantic and hybrid modes are accepted already so the node contract does
    // not change when Phase 2 swaps in richer search adapters.
    const hits = await this.searchIndex.search({
      datasetIds: plan.datasetIds,
      query,
      topK: plan.topK,
    });

    const filteredHits = hits.filter((hit) => hit.score >= plan.scoreThreshold);
    const sources = await this.sourceHydrator.hydrate(filteredHits);
    const trace = this.retrievalTraceBuilder.build(
      selection,
      plan,
      hits,
      filteredHits,
      input.datasetIds
    );

    return {
      query,
      context: this.contextAssembler.assemble(sources),
      sourceCount: sources.length,
      sources,
      hits: filteredHits,
      trace,
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
      trace: this.retrievalTraceBuilder.build(
        selection,
        plan,
        [],
        [],
        requestedDatasetIds
      ),
    };
  }
}
