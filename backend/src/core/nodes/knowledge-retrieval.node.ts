import { BaseNode } from "./base.node";
import { GraphEngineEvent, NodeType } from "../../types";

interface KnowledgeRetrievalNodeData {
  queryTemplate?: string;
  datasetIds?: string[];
  topK?: number;
  scoreThreshold?: number;
  retrievalMode?: "keyword" | "semantic" | "hybrid";
}

export class KnowledgeRetrievalNode extends BaseNode {
  readonly nodeType: NodeType = "knowledge-retrieval";

  async *run(): AsyncGenerator<GraphEngineEvent> {
    const nodeId = this.config.id;
    const data = this.config.data as KnowledgeRetrievalNodeData;

    yield { event: "node_start", nodeId, nodeType: this.nodeType, timestamp: Date.now() };

    const query = this.resolveTemplate(data.queryTemplate || "{{start-1.query}}").trim();
    if (!query) {
      yield {
        event: "error",
        nodeId,
        nodeType: this.nodeType,
        message: "Knowledge retrieval query is empty",
        timestamp: Date.now(),
      };
      return;
    }

    if (!this.context.ragRuntime) {
      yield {
        event: "error",
        nodeId,
        nodeType: this.nodeType,
        message: "RAG runtime is not available",
        timestamp: Date.now(),
      };
      return;
    }

    try {
      const outputs = await this.context.ragRuntime.retrieve({
        appId: this.context.appId,
        query,
        datasetIds: data.datasetIds,
        topK: data.topK,
        scoreThreshold: data.scoreThreshold,
        retrievalMode: data.retrievalMode,
      });

      this.pool.setNodeOutput(nodeId, outputs);
      yield { event: "node_end", nodeId, outputs, timestamp: Date.now() };
    } catch (error) {
      yield {
        event: "error",
        nodeId,
        nodeType: this.nodeType,
        message: error instanceof Error ? error.message : "Knowledge retrieval failed",
        timestamp: Date.now(),
      };
    }
  }
}
