import { Inject, Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Dataset } from "../../../database/entities/dataset.entity";
import { SEARCH_INDEX_ADAPTER, SearchIndexAdapter } from "../adapters/search-index.adapter";
import { ContextAssembler, Source } from "./context-assembler";
import { DatasetSelector } from "./dataset-selector";
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
}

@Injectable()
export class RagRetrievalOrchestrator {
  constructor(
    @InjectRepository(Dataset)
    private readonly datasetRepo: Repository<Dataset>,
    private readonly datasetSelector: DatasetSelector,
    @Inject(SEARCH_INDEX_ADAPTER)
    private readonly searchIndex: SearchIndexAdapter,
    private readonly sourceHydrator: SourceHydrator,
    private readonly contextAssembler: ContextAssembler,
  ) {}

  async retrieve(input: RetrieveInput): Promise<RetrieveResult> {
    const query = input.query.trim();
    if (!query) {
      return { query: "", context: "", sourceCount: 0, sources: [], hits: [] };
    }

    const datasetIds = await this.datasetSelector.select(input.appId, input.datasetIds);
    if (datasetIds.length === 0) {
      return { query, context: "", sourceCount: 0, sources: [], hits: [] };
    }

    const datasets = await this.datasetRepo.find({ where: datasetIds.map((id) => ({ id })) });
    if (datasets.length === 0) {
      return { query, context: "", sourceCount: 0, sources: [], hits: [] };
    }

    const topK = input.topK ?? Math.max(...datasets.map((dataset) => dataset.topK), 4);
    const scoreThreshold =
      input.scoreThreshold ?? Math.min(...datasets.map((dataset) => dataset.scoreThreshold), 0.15);

    // Semantic and hybrid modes are accepted already so the node contract does
    // not change when Phase 2 swaps in richer search adapters.
    const hits = await this.searchIndex.search({
      datasetIds: datasets.map((dataset) => dataset.id),
      query,
      topK,
    });

    const filteredHits = hits.filter((hit) => hit.score >= scoreThreshold);
    const sources = await this.sourceHydrator.hydrate(filteredHits);

    return {
      query,
      context: this.contextAssembler.assemble(sources),
      sourceCount: sources.length,
      sources,
      hits: filteredHits,
    };
  }
}
