import { test } from "node:test";
import assert from "node:assert";
import { RetrievalPolicyResolver } from "./retrieval-policy-resolver";
import { Dataset } from "../../../database/entities/dataset.entity";

function makeDataset(overrides: Partial<Dataset>): Dataset {
  return {
    id: "dataset-1",
    name: "Test",
    description: null,
    status: "active",
    retrievalMode: "keyword",
    indexingMode: "economy",
    chunkSize: 500,
    chunkOverlap: 80,
    topK: 4,
    scoreThreshold: 0.15,
    createdAt: new Date(),
    updatedAt: new Date(),
    appBindings: [],
    documents: [],
    ...overrides,
  };
}

const baseInput = {
  appId: "app-1",
  query: "test query",
};

test("resolves topK from input override", () => {
  const resolver = new RetrievalPolicyResolver();
  const plan = resolver.resolve({ ...baseInput, topK: 10 }, [
    makeDataset({ topK: 4 }),
  ]);
  assert.strictEqual(plan.topK, 10);
});

test("resolves topK from the max across datasets when input is omitted", () => {
  const resolver = new RetrievalPolicyResolver();
  const plan = resolver.resolve(baseInput, [
    makeDataset({ id: "d1", topK: 4 }),
    makeDataset({ id: "d2", topK: 8 }),
  ]);
  assert.strictEqual(plan.topK, 8);
});

test("defaults topK to 4 when no datasets exist", () => {
  const resolver = new RetrievalPolicyResolver();
  const plan = resolver.resolve(baseInput, []);
  assert.strictEqual(plan.topK, 4);
});

test("resolves scoreThreshold from input override", () => {
  const resolver = new RetrievalPolicyResolver();
  const plan = resolver.resolve({ ...baseInput, scoreThreshold: 0.5 }, [
    makeDataset({ scoreThreshold: 0.15 }),
  ]);
  assert.strictEqual(plan.scoreThreshold, 0.5);
});

test("resolves scoreThreshold to the min across datasets when input is omitted", () => {
  const resolver = new RetrievalPolicyResolver();
  const plan = resolver.resolve(baseInput, [
    makeDataset({ id: "d1", scoreThreshold: 0.3 }),
    makeDataset({ id: "d2", scoreThreshold: 0.1 }),
  ]);
  assert.strictEqual(plan.scoreThreshold, 0.1);
});

test("defaults scoreThreshold to 0.15 when no datasets exist", () => {
  const resolver = new RetrievalPolicyResolver();
  const plan = resolver.resolve(baseInput, []);
  assert.strictEqual(plan.scoreThreshold, 0.15);
});

test("resolves retrievalMode from input override", () => {
  const resolver = new RetrievalPolicyResolver();
  const plan = resolver.resolve({ ...baseInput, retrievalMode: "hybrid" }, [
    makeDataset({ retrievalMode: "keyword" }),
  ]);
  assert.strictEqual(plan.retrievalMode, "hybrid");
});

test("resolves retrievalMode from datasets when they all agree", () => {
  const resolver = new RetrievalPolicyResolver();
  const plan = resolver.resolve(baseInput, [
    makeDataset({ id: "d1", retrievalMode: "semantic" }),
    makeDataset({ id: "d2", retrievalMode: "semantic" }),
  ]);
  assert.strictEqual(plan.retrievalMode, "semantic");
});

test("defaults to keyword when datasets have mixed retrieval modes", () => {
  const resolver = new RetrievalPolicyResolver();
  const plan = resolver.resolve(baseInput, [
    makeDataset({ id: "d1", retrievalMode: "semantic" }),
    makeDataset({ id: "d2", retrievalMode: "keyword" }),
  ]);
  assert.strictEqual(plan.retrievalMode, "keyword");
});

test("defaults retrievalMode to keyword when no datasets exist", () => {
  const resolver = new RetrievalPolicyResolver();
  const plan = resolver.resolve(baseInput, []);
  assert.strictEqual(plan.retrievalMode, "keyword");
});

test("candidateK is always at least topK * 2", () => {
  const resolver = new RetrievalPolicyResolver();
  const plan = resolver.resolve({ ...baseInput, topK: 5 }, []);
  assert.strictEqual(plan.candidateK, 10);
});

test("plan includes datasetIds from datasets", () => {
  const resolver = new RetrievalPolicyResolver();
  const plan = resolver.resolve(baseInput, [
    makeDataset({ id: "d1" }),
    makeDataset({ id: "d2" }),
  ]);
  assert.deepStrictEqual(plan.datasetIds, ["d1", "d2"]);
});
