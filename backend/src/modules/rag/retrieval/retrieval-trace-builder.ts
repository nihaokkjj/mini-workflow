import { Injectable } from "@nestjs/common";
import { SearchHit } from "../adapters/search-index.adapter";
import { DatasetSelection } from "./dataset-selector";
import { RetrievalPlan } from "./retrieval-policy-resolver";

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

@Injectable()
export class RetrievalTraceBuilder {
  build(
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
}
