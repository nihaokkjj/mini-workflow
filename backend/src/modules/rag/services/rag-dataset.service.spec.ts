import "reflect-metadata";
import assert from "node:assert";
import { test } from "node:test";
import { NotFoundException } from "@nestjs/common";
import { App } from "../../../database/entities/app.entity";
import { AppDatasetBinding } from "../../../database/entities/app-dataset-binding.entity";
import { Dataset } from "../../../database/entities/dataset.entity";
import { RagDatasetService } from "./rag-dataset.service";

function makeApp(overrides: Partial<App>): App {
  return {
    id: "app-1",
    name: "Support Bot",
    description: "",
    mode: "workflow",
    createdAt: new Date(),
    workflows: [],
    conversations: [],
    ...overrides,
  };
}

function makeDataset(overrides: Partial<Dataset>): Dataset {
  return {
    id: "dataset-1",
    name: "Help Center",
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

function makeBinding(overrides: Partial<AppDatasetBinding>): AppDatasetBinding {
  return {
    id: "binding-1",
    appId: "app-1",
    datasetId: "dataset-1",
    createdAt: new Date(),
    app: makeApp({ id: overrides.appId ?? "app-1" }),
    dataset: makeDataset({ id: overrides.datasetId ?? "dataset-1" }),
    ...overrides,
  };
}

function createService({
  app,
  dataset,
  existingBinding,
  bindings = [],
}: {
  app?: App | null;
  dataset?: Dataset | null;
  existingBinding?: AppDatasetBinding | null;
  bindings?: AppDatasetBinding[];
}) {
  const deleteCalls: Array<{ appId: string; datasetId: string }> = [];
  const findCalls: Array<unknown> = [];
  const saveCalls: AppDatasetBinding[] = [];

  const appRepo = {
    findOneBy: async () => app ?? null,
  };

  const datasetRepo = {
    findOneBy: async () => dataset ?? null,
  };

  const bindingRepo = {
    findOneBy: async () => existingBinding ?? null,
    create: (input: Partial<AppDatasetBinding>) => input as AppDatasetBinding,
    save: async (binding: AppDatasetBinding) => {
      const savedBinding = makeBinding({
        id: "binding-created",
        appId: binding.appId,
        datasetId: binding.datasetId,
      });
      saveCalls.push(savedBinding);
      return savedBinding;
    },
    find: async (options: unknown) => {
      findCalls.push(options);
      return bindings;
    },
    delete: async (criteria: { appId: string; datasetId: string }) => {
      deleteCalls.push(criteria);
    },
  };

  const service = new RagDatasetService(
    appRepo as never,
    datasetRepo as never,
    bindingRepo as never,
    {} as never,
    {} as never
  );

  return { service, deleteCalls, findCalls, saveCalls };
}

test("RagDatasetService creates a new binding when the app and dataset exist", async () => {
  const { service, saveCalls } = createService({
    app: makeApp({ id: "app-1" }),
    dataset: makeDataset({ id: "dataset-2" }),
  });

  const binding = await service.bindDataset("app-1", "dataset-2");

  assert.strictEqual(binding.appId, "app-1");
  assert.strictEqual(binding.datasetId, "dataset-2");
  assert.strictEqual(saveCalls.length, 1);
});

test("RagDatasetService returns the existing binding instead of duplicating it", async () => {
  const existingBinding = makeBinding({
    id: "binding-existing",
    datasetId: "dataset-2",
  });
  const { service, saveCalls } = createService({
    app: makeApp({ id: "app-1" }),
    dataset: makeDataset({ id: "dataset-2" }),
    existingBinding,
  });

  const binding = await service.bindDataset("app-1", "dataset-2");

  assert.strictEqual(binding, existingBinding);
  assert.strictEqual(saveCalls.length, 0);
});

test("RagDatasetService lists app bindings with dataset relations and supports unbinding", async () => {
  const bindings = [makeBinding({ datasetId: "dataset-1" })];
  const { service, deleteCalls, findCalls } = createService({ bindings });

  const result = await service.listAppBindings("app-1");
  await service.unbindDataset("app-1", "dataset-1");

  assert.deepStrictEqual(result, bindings);
  assert.deepStrictEqual(findCalls, [
    {
      where: { appId: "app-1" },
      relations: { dataset: true },
      order: { createdAt: "DESC" },
    },
  ]);
  assert.deepStrictEqual(deleteCalls, [
    { appId: "app-1", datasetId: "dataset-1" },
  ]);
});

test("RagDatasetService rejects bindings for unknown apps", async () => {
  const { service } = createService({
    app: null,
    dataset: makeDataset({ id: "dataset-1" }),
  });

  await assert.rejects(
    () => service.bindDataset("missing-app", "dataset-1"),
    (error: unknown) =>
      error instanceof NotFoundException && error.message === "App not found"
  );
});
