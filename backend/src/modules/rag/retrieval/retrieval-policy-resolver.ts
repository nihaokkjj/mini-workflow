import { Injectable } from "@nestjs/common";
import { Dataset } from "../../../database/entities/dataset.entity";
import { RetrieveInput } from "./rag-retrieval.orchestrator";

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

@Injectable()
export class RetrievalPolicyResolver {
  resolve(input: RetrieveInput, datasets: Dataset[]): RetrievalPlan {
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
}
