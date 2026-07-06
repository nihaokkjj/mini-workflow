import assert from "node:assert";
import { test } from "node:test";
import {
  collectNodeRunResults,
  getCollapsibleTextState,
  readRetrievalRunOutput,
} from "./workflow-runtime.model";

test("collectNodeRunResults keeps node-end events in newest-first order", () => {
  const results = collectNodeRunResults(
    [
      {
        event: "node_start",
        nodeId: "start-1",
        nodeType: "start",
        timestamp: 1,
      },
      {
        event: "node_end",
        nodeId: "knowledge-1",
        outputs: {
          query: "退款规则",
          context: "A",
          sourceCount: 0,
          sources: [],
          hits: [],
          trace: {},
        },
        timestamp: 3,
      },
      {
        event: "node_end",
        nodeId: "llm-1",
        outputs: { text: "答案" },
        timestamp: 4,
      },
    ],
    [
      {
        id: "knowledge-1",
        type: "knowledge-retrieval",
        title: "",
        position: { x: 0, y: 0 },
        data: {},
      },
      {
        id: "llm-1",
        type: "llm",
        title: "",
        position: { x: 0, y: 0 },
        data: {},
      },
    ]
  );

  assert.deepStrictEqual(
    results.map((result) => [result.nodeId, result.nodeType]),
    [
      ["llm-1", "llm"],
      ["knowledge-1", "knowledge-retrieval"],
    ]
  );
});

test("readRetrievalRunOutput recognizes retrieval node outputs", () => {
  assert.ok(
    readRetrievalRunOutput({
      query: "退款规则",
      context: "context",
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
    })
  );
  assert.strictEqual(readRetrievalRunOutput({ text: "plain output" }), null);
});

test("getCollapsibleTextState collapses long context by default", () => {
  const state = getCollapsibleTextState("A".repeat(280), 120);

  assert.strictEqual(state.isCollapsedByDefault, true);
  assert.ok(state.preview.endsWith("..."));
});
