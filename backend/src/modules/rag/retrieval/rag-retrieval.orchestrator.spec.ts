import assert from "node:assert";
import { test } from "node:test";
import { ForbiddenException } from "@nestjs/common";
import { Dataset } from "../../../database/entities/dataset.entity";
import { AppDatasetBinding } from "../../../database/entities/app-dataset-binding.entity";
import {
  SearchHit,
  SearchIndexAdapter,
} from "../adapters/search-index.adapter";
import { DatasetSelector } from "./dataset-selector";
import { RagRetrievalOrchestrator } from "./rag-retrieval.orchestrator";
import { Source, SourceHydrator } from "./source-hydrator";

function makeDataset(overrides: Partial<Dataset> = {}): Dataset {
  return {
    id: "dataset-1",
    name: "Dataset",
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

function makeBinding(
  overrides: Partial<AppDatasetBinding> = {}
): AppDatasetBinding {
  return {
    id: "binding-1",
    appId: "app-1",
    datasetId: "dataset-1",
    createdAt: new Date(),
    app: undefined as never,
    dataset: undefined as never,
    ...overrides,
  };
}

function createOrchestrator({
  datasets,
  bindings,
  hits,
  sources,
}: {
  datasets: Dataset[];
  bindings: AppDatasetBinding[];
  hits: SearchHit[];
  sources: Source[];
}) {
  const datasetRepo = {
    find: async ({ where }: { where: Array<{ id: string }> }) => {
      const ids = new Set(where.map((entry) => entry.id));
      return datasets.filter((dataset) => ids.has(dataset.id));
    },
  };

  const bindingRepo = {
    find: async ({ where }: { where: { appId: string } }) =>
      bindings.filter((binding) => binding.appId === where.appId),
  };

  const searchIndex: SearchIndexAdapter = {
    upsertSegments: async () => undefined,
    deleteByDocument: async () => undefined,
    search: async () => hits,
  };

  const sourceHydrator = {
    hydrate: async (searchHits: SearchHit[]) =>
      sources.filter((source) =>
        searchHits.some((hit) => hit.segmentId === source.segmentId)
      ),
  };

  return new RagRetrievalOrchestrator(
    datasetRepo as never,
    new DatasetSelector(bindingRepo as never),
    searchIndex,
    sourceHydrator as never
  );
}

test("RagRetrievalOrchestrator uses app bindings when datasetIds are omitted", async () => {
  const orchestrator = createOrchestrator({
    datasets: [
      makeDataset({ id: "dataset-1", topK: 2, scoreThreshold: 0.4 }),
      makeDataset({ id: "dataset-2", topK: 5, scoreThreshold: 0.2 }),
    ],
    bindings: [
      makeBinding({ datasetId: "dataset-1" }),
      makeBinding({ id: "binding-2", datasetId: "dataset-2" }),
    ],
    hits: [
      { segmentId: "segment-1", score: 0.8 },
      { segmentId: "segment-2", score: 0.1 },
    ],
    sources: [
      {
        title: "退款规则 / 段落 1",
        content: "7 天内支持退款",
        datasetId: "dataset-1",
        datasetName: "帮助中心",
        documentId: "document-1",
        documentName: "退款规则",
        segmentId: "segment-1",
        score: 0.8,
        position: 0,
      },
    ],
  });

  const result = await orchestrator.retrieve({
    appId: "app-1",
    query: "退款规则",
  });

  assert.deepStrictEqual(result.trace.selectedDatasetIds, [
    "dataset-1",
    "dataset-2",
  ]);
  assert.strictEqual(result.trace.usedExplicitSelection, false);
  assert.strictEqual(result.trace.plan.topK, 5);
  assert.strictEqual(result.trace.plan.scoreThreshold, 0.2);
  assert.deepStrictEqual(result.trace.rawHits, [
    { segmentId: "segment-1", score: 0.8 },
    { segmentId: "segment-2", score: 0.1 },
  ]);
  assert.deepStrictEqual(result.trace.filteredHits, [
    { segmentId: "segment-1", score: 0.8 },
  ]);
  assert.deepStrictEqual(result.trace.droppedHits, [
    { segmentId: "segment-2", score: 0.1, reason: "score_below_threshold" },
  ]);
  assert.strictEqual(result.sourceCount, 1);
});

test("RagRetrievalOrchestrator respects explicit authorized datasetIds", async () => {
  const orchestrator = createOrchestrator({
    datasets: [
      makeDataset({
        id: "dataset-1",
        retrievalMode: "hybrid",
        topK: 6,
        scoreThreshold: 0.3,
      }),
    ],
    bindings: [makeBinding({ datasetId: "dataset-1" })],
    hits: [{ segmentId: "segment-1", score: 0.9 }],
    sources: [
      {
        title: "商品说明 / 段落 1",
        content: "支持 7 天无理由",
        datasetId: "dataset-1",
        datasetName: "帮助中心",
        documentId: "document-1",
        documentName: "商品说明",
        segmentId: "segment-1",
        score: 0.9,
        position: 0,
      },
    ],
  });

  const result = await orchestrator.retrieve({
    appId: "app-1",
    query: "支持退货吗",
    datasetIds: ["dataset-1"],
  });

  assert.deepStrictEqual(result.trace.requestedDatasetIds, ["dataset-1"]);
  assert.deepStrictEqual(result.trace.selectedDatasetIds, ["dataset-1"]);
  assert.strictEqual(result.trace.usedExplicitSelection, true);
  assert.strictEqual(result.trace.plan.retrievalMode, "hybrid");
});

test("RagRetrievalOrchestrator rejects datasetIds that are not bound to the app", async () => {
  const orchestrator = createOrchestrator({
    datasets: [makeDataset({ id: "dataset-1" })],
    bindings: [makeBinding({ datasetId: "dataset-1" })],
    hits: [],
    sources: [],
  });

  await assert.rejects(
    () =>
      orchestrator.retrieve({
        appId: "app-1",
        query: "退款规则",
        datasetIds: ["dataset-2"],
      }),
    (error: unknown) =>
      error instanceof ForbiddenException &&
      error.message.includes("Datasets are not bound to app app-1: dataset-2")
  );
});

test("retrieval policy resolves topK from input override", async () => {
  const orchestrator = createOrchestrator({
    datasets: [makeDataset({ id: "dataset-1", topK: 4 })],
    bindings: [makeBinding({ datasetId: "dataset-1" })],
    hits: [],
    sources: [],
  });

  const result = await orchestrator.retrieve({
    appId: "app-1",
    query: "test",
    topK: 10,
  });

  assert.strictEqual(result.trace.plan.topK, 10);
});

test("retrieval policy resolves topK from max across datasets", async () => {
  const orchestrator = createOrchestrator({
    datasets: [
      makeDataset({ id: "dataset-1", topK: 4 }),
      makeDataset({ id: "dataset-2", topK: 8 }),
    ],
    bindings: [
      makeBinding({ datasetId: "dataset-1" }),
      makeBinding({ id: "binding-2", datasetId: "dataset-2" }),
    ],
    hits: [],
    sources: [],
  });

  const result = await orchestrator.retrieve({
    appId: "app-1",
    query: "test",
  });

  assert.strictEqual(result.trace.plan.topK, 8);
});

test("retrieval policy resolves scoreThreshold from input override", async () => {
  const orchestrator = createOrchestrator({
    datasets: [makeDataset({ id: "dataset-1", scoreThreshold: 0.15 })],
    bindings: [makeBinding({ datasetId: "dataset-1" })],
    hits: [],
    sources: [],
  });

  const result = await orchestrator.retrieve({
    appId: "app-1",
    query: "test",
    scoreThreshold: 0.5,
  });

  assert.strictEqual(result.trace.plan.scoreThreshold, 0.5);
});

test("retrieval policy defaults to keyword when datasets have mixed retrieval modes", async () => {
  const orchestrator = createOrchestrator({
    datasets: [
      makeDataset({ id: "dataset-1", retrievalMode: "semantic" }),
      makeDataset({ id: "dataset-2", retrievalMode: "keyword" }),
    ],
    bindings: [
      makeBinding({ datasetId: "dataset-1" }),
      makeBinding({ id: "binding-2", datasetId: "dataset-2" }),
    ],
    hits: [],
    sources: [],
  });

  const result = await orchestrator.retrieve({
    appId: "app-1",
    query: "test",
  });

  assert.strictEqual(result.trace.plan.retrievalMode, "keyword");
});

test("retrieval policy uses dataset retrievalMode when all datasets agree", async () => {
  const orchestrator = createOrchestrator({
    datasets: [
      makeDataset({ id: "dataset-1", retrievalMode: "semantic" }),
      makeDataset({ id: "dataset-2", retrievalMode: "semantic" }),
    ],
    bindings: [
      makeBinding({ datasetId: "dataset-1" }),
      makeBinding({ id: "binding-2", datasetId: "dataset-2" }),
    ],
    hits: [],
    sources: [],
  });

  const result = await orchestrator.retrieve({
    appId: "app-1",
    query: "test",
  });

  assert.strictEqual(result.trace.plan.retrievalMode, "semantic");
});

test("retrieval policy candidateK is at least topK * 2", async () => {
  const orchestrator = createOrchestrator({
    datasets: [makeDataset({ id: "dataset-1", topK: 5 })],
    bindings: [makeBinding({ datasetId: "dataset-1" })],
    hits: [],
    sources: [],
  });

  const result = await orchestrator.retrieve({
    appId: "app-1",
    query: "test",
  });

  assert.strictEqual(result.trace.plan.candidateK, 10);
});

test("context assembly formats sources with numbering", async () => {
  const orchestrator = createOrchestrator({
    datasets: [makeDataset()],
    bindings: [makeBinding()],
    hits: [{ segmentId: "segment-1", score: 0.9 }],
    sources: [
      {
        title: "Doc / 段落 1",
        content: "first content",
        datasetId: "dataset-1",
        datasetName: "Dataset",
        documentId: "document-1",
        documentName: "Doc1",
        segmentId: "segment-1",
        score: 0.9,
        position: 0,
      },
    ],
  });

  const result = await orchestrator.retrieve({
    appId: "app-1",
    query: "test",
  });

  assert.strictEqual(result.context, "[1] Doc1 / 段落 1\nfirst content");
});

test("trace classifies hits below threshold as dropped", async () => {
  const orchestrator = createOrchestrator({
    datasets: [makeDataset()],
    bindings: [makeBinding()],
    hits: [
      { segmentId: "segment-1", score: 0.9 },
      { segmentId: "segment-2", score: 0.1 },
    ],
    sources: [
      {
        title: "Doc / 段落 1",
        content: "content",
        datasetId: "dataset-1",
        datasetName: "Dataset",
        documentId: "document-1",
        documentName: "Doc",
        segmentId: "segment-1",
        score: 0.9,
        position: 0,
      },
    ],
  });

  const result = await orchestrator.retrieve({
    appId: "app-1",
    query: "test",
  });

  assert.strictEqual(result.trace.droppedHits.length, 1);
  assert.strictEqual(result.trace.droppedHits[0].segmentId, "segment-2");
  assert.strictEqual(
    result.trace.droppedHits[0].reason,
    "score_below_threshold"
  );
});
