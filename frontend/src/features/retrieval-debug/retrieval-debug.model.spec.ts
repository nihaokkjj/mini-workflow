import assert from "node:assert";
import { test } from "node:test";
import {
  buildRetrieveRequest,
  isRetrievalResultDto,
  readScoreThresholdInput,
  readTopKInput,
  type RetrievalDebugFormState,
} from "./retrieval-debug.model";

const formState: RetrievalDebugFormState = {
  query: "  退款规则是什么  ",
  datasetIds: [],
  topK: 6,
  scoreThreshold: 0.2,
  retrievalMode: "hybrid",
};

test("buildRetrieveRequest preserves the fallback-to-all-datasets behavior", () => {
  assert.deepStrictEqual(buildRetrieveRequest("app-1", formState), {
    appId: "app-1",
    query: "退款规则是什么",
    datasetIds: undefined,
    topK: 6,
    scoreThreshold: 0.2,
    retrievalMode: "hybrid",
  });
});

test("buildRetrieveRequest keeps explicit dataset selection when present", () => {
  assert.deepStrictEqual(
    buildRetrieveRequest("app-1", {
      ...formState,
      datasetIds: ["dataset-1", "dataset-2"],
    }),
    {
      appId: "app-1",
      query: "退款规则是什么",
      datasetIds: ["dataset-1", "dataset-2"],
      topK: 6,
      scoreThreshold: 0.2,
      retrievalMode: "hybrid",
    }
  );
});

test("isRetrievalResultDto recognizes retrieval debug responses", () => {
  assert.strictEqual(
    isRetrievalResultDto({
      query: "退款规则",
      context: "[1] 退款规则",
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
          score: 0.9,
          position: 0,
        },
      ],
      hits: [{ segmentId: "segment-1", score: 0.9 }],
      trace: {
        requestedDatasetIds: [],
        availableDatasetIds: ["dataset-1"],
        selectedDatasetIds: ["dataset-1"],
        usedExplicitSelection: false,
        plan: {
          retrievalMode: "keyword",
          topK: 4,
          scoreThreshold: 0.15,
          candidateK: 8,
          contextBudgetTokens: 2000,
          enableQueryRewrite: false,
        },
        rawHits: [{ segmentId: "segment-1", score: 0.9 }],
        filteredHits: [{ segmentId: "segment-1", score: 0.9 }],
        droppedHits: [],
      },
    }),
    true
  );
  assert.strictEqual(isRetrievalResultDto({ query: "退款规则" }), false);
  assert.strictEqual(
    isRetrievalResultDto({
      query: "退款规则",
      context: "[1] 退款规则",
      sourceCount: 1,
      sources: [],
      hits: [],
      trace: {},
    }),
    false
  );
  assert.strictEqual(
    isRetrievalResultDto({
      query: "退款规则",
      context: "[1] 退款规则",
      sourceCount: 1,
      sources: [],
      hits: [],
      trace: {
        requestedDatasetIds: [],
        availableDatasetIds: ["dataset-1"],
        selectedDatasetIds: ["dataset-1"],
        usedExplicitSelection: false,
        plan: {
          retrievalMode: "keyword",
          topK: 4,
          scoreThreshold: 0.15,
          candidateK: 8,
          contextBudgetTokens: 2000,
          enableQueryRewrite: false,
        },
        rawHits: [{ segmentId: "segment-1", score: "bad" }],
        filteredHits: [],
        droppedHits: [],
      },
    }),
    false
  );
});

test("numeric debug inputs keep the previous valid state when the raw input is invalid", () => {
  assert.strictEqual(readTopKInput("", 4), 4);
  assert.strictEqual(readTopKInput("0", 4), 4);
  assert.strictEqual(readTopKInput("8", 4), 8);

  assert.strictEqual(readScoreThresholdInput("", 0.15), 0.15);
  assert.strictEqual(readScoreThresholdInput("1.5", 0.15), 0.15);
  assert.strictEqual(readScoreThresholdInput("0.35", 0.15), 0.35);
});
