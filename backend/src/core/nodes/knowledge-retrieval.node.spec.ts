import { test } from "node:test";
import assert from "node:assert";
import { KnowledgeRetrievalNode } from "./knowledge-retrieval.node";
import { VariablePool } from "./base.node";

test("KnowledgeRetrievalNode resolves the query and stores retrieval outputs", async () => {
  const pool = new VariablePool();
  pool.setNodeOutput("start-1", { query: "退款规则是什么？" });

  const node = new KnowledgeRetrievalNode(
    {
      id: "knowledge-1",
      type: "knowledge-retrieval",
      title: "Knowledge",
      position: { x: 0, y: 0 },
      data: {
        queryTemplate: "{{start-1.query}}",
        datasetIds: ["dataset-1"],
        topK: 3,
      },
    },
    pool,
    {
      tenantId: "tenant-1",
      appId: "app-1",
      workflowId: "workflow-1",
      userId: "user-1",
      ragRuntime: {
        retrieve: async (input) => ({
          query: input.query,
          context: "[1] 退款规则 / 段落 1\n7 天内支持退款",
          sourceCount: 1,
          sources: [
            {
              title: "退款规则 / 段落 1",
              content: "7 天内支持退款",
              datasetId: "dataset-1",
              datasetName: "帮助中心",
              documentId: "document-1",
              documentName: "退款规则",
              segmentId: "segment-1",
              score: 1.2,
              position: 0,
            },
          ],
          hits: [{ segmentId: "segment-1", score: 1.2 }],
          trace: {
            requestedDatasetIds: ["dataset-1"],
            availableDatasetIds: ["dataset-1"],
            selectedDatasetIds: ["dataset-1"],
            usedExplicitSelection: true,
            plan: {
              retrievalMode: "keyword",
              topK: 3,
              scoreThreshold: 0.15,
              candidateK: 6,
              contextBudgetTokens: 2000,
              enableQueryRewrite: false,
            },
            rawHits: [{ segmentId: "segment-1", score: 1.2 }],
            filteredHits: [{ segmentId: "segment-1", score: 1.2 }],
            droppedHits: [],
          },
        }),
      },
    }
  );

  const events: any[] = [];
  for await (const event of node.run()) events.push(event);

  const end = events.find((event) => event.event === "node_end");
  assert.ok(end);
  assert.strictEqual(end.outputs.query, "退款规则是什么？");
  assert.strictEqual(end.outputs.sourceCount, 1);
  assert.strictEqual(end.outputs.hits[0].segmentId, "segment-1");
  assert.strictEqual(
    pool.resolve("knowledge-1.context"),
    "[1] 退款规则 / 段落 1\n7 天内支持退款"
  );
});
