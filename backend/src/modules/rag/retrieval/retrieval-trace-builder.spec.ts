import { test } from "node:test";
import assert from "node:assert";
import { RetrievalTraceBuilder } from "./retrieval-trace-builder";
import { DatasetSelection } from "./dataset-selector";
import { RetrievalPlan } from "./retrieval-policy-resolver";
import { SearchHit } from "../adapters/search-index.adapter";

function makeSelection(
  overrides: Partial<DatasetSelection> = {}
): DatasetSelection {
  return {
    datasetIds: ["dataset-1"],
    availableDatasetIds: ["dataset-1"],
    usedExplicitSelection: false,
    ...overrides,
  };
}

function makePlan(overrides: Partial<RetrievalPlan> = {}): RetrievalPlan {
  return {
    appId: "app-1",
    query: "test",
    datasetIds: ["dataset-1"],
    retrievalMode: "keyword",
    topK: 4,
    scoreThreshold: 0.15,
    candidateK: 8,
    contextBudgetTokens: 2000,
    enableQueryRewrite: false,
    ...overrides,
  };
}

test("builds trace with full plan details", () => {
  const builder = new RetrievalTraceBuilder();
  const trace = builder.build(makeSelection(), makePlan(), [], []);
  assert.strictEqual(trace.plan.retrievalMode, "keyword");
  assert.strictEqual(trace.plan.topK, 4);
  assert.strictEqual(trace.plan.scoreThreshold, 0.15);
  assert.strictEqual(trace.plan.candidateK, 8);
  assert.strictEqual(trace.usedExplicitSelection, false);
});

test("classifies hits below threshold as dropped", () => {
  const builder = new RetrievalTraceBuilder();
  const rawHits: SearchHit[] = [
    { segmentId: "seg-1", score: 0.9 },
    { segmentId: "seg-2", score: 0.1 },
    { segmentId: "seg-3", score: 0.05 },
  ];
  const filteredHits: SearchHit[] = [{ segmentId: "seg-1", score: 0.9 }];
  const trace = builder.build(
    makeSelection(),
    makePlan(),
    rawHits,
    filteredHits
  );

  assert.deepStrictEqual(trace.rawHits, rawHits);
  assert.deepStrictEqual(trace.filteredHits, filteredHits);
  assert.strictEqual(trace.droppedHits.length, 2);
  assert.strictEqual(trace.droppedHits[0].segmentId, "seg-2");
  assert.strictEqual(trace.droppedHits[0].reason, "score_below_threshold");
  assert.strictEqual(trace.droppedHits[1].segmentId, "seg-3");
});

test("empty hits produce empty dropped hits", () => {
  const builder = new RetrievalTraceBuilder();
  const trace = builder.build(makeSelection(), makePlan(), [], []);
  assert.deepStrictEqual(trace.rawHits, []);
  assert.deepStrictEqual(trace.filteredHits, []);
  assert.deepStrictEqual(trace.droppedHits, []);
});

test("propagates selection metadata", () => {
  const builder = new RetrievalTraceBuilder();
  const trace = builder.build(
    makeSelection({
      datasetIds: ["d1", "d2"],
      availableDatasetIds: ["d1", "d2", "d3"],
      usedExplicitSelection: true,
    }),
    makePlan(),
    [],
    [],
    ["d1", "d2"]
  );
  assert.deepStrictEqual(trace.requestedDatasetIds, ["d1", "d2"]);
  assert.deepStrictEqual(trace.selectedDatasetIds, ["d1", "d2"]);
  assert.deepStrictEqual(trace.availableDatasetIds, ["d1", "d2", "d3"]);
  assert.strictEqual(trace.usedExplicitSelection, true);
});
