import "reflect-metadata";
import { test } from "node:test";
import assert from "node:assert";
import { ForbiddenException } from "@nestjs/common";
import { DatasetSelector, DatasetSelection } from "./dataset-selector";

// Define a minimal binding interface to avoid importing TypeORM entity
interface BindingStub {
  id: string;
  appId: string;
  datasetId: string;
}

function createSelector(bindings: BindingStub[]): DatasetSelector {
  const repo = {
    find: async ({ where }: { where: { appId: string } }) =>
      bindings.filter((b) => b.appId === where.appId),
  };
  return new DatasetSelector(repo as never);
}

test("returns all bound datasets when no explicit ids are provided", async () => {
  const selector = createSelector([
    { id: "b1", appId: "app-1", datasetId: "dataset-1" },
    { id: "b2", appId: "app-1", datasetId: "dataset-2" },
  ]);
  const result = await selector.select("app-1");
  assert.deepStrictEqual(result.datasetIds, ["dataset-1", "dataset-2"]);
  assert.strictEqual(result.usedExplicitSelection, false);
});

test("returns empty array when app has no bindings", async () => {
  const selector = createSelector([]);
  const result = await selector.select("app-1");
  assert.deepStrictEqual(result.datasetIds, []);
  assert.strictEqual(result.usedExplicitSelection, false);
});

test("accepts authorized explicit dataset ids", async () => {
  const selector = createSelector([
    { id: "b1", appId: "app-1", datasetId: "dataset-1" },
    { id: "b2", appId: "app-1", datasetId: "dataset-2" },
  ]);
  const result = await selector.select("app-1", ["dataset-1"]);
  assert.deepStrictEqual(result.datasetIds, ["dataset-1"]);
  assert.strictEqual(result.usedExplicitSelection, true);
});

test("rejects explicit dataset ids that are not bound to the app", async () => {
  const selector = createSelector([
    { id: "b1", appId: "app-1", datasetId: "dataset-1" },
  ]);
  await assert.rejects(
    () => selector.select("app-1", ["dataset-2"]),
    (err: unknown) => err instanceof ForbiddenException
  );
});

test("deduplicates explicit dataset ids", async () => {
  const selector = createSelector([
    { id: "b1", appId: "app-1", datasetId: "dataset-1" },
  ]);
  const result = await selector.select("app-1", ["dataset-1", "dataset-1"]);
  assert.deepStrictEqual(result.datasetIds, ["dataset-1"]);
});

test("includes availableDatasetIds in result", async () => {
  const selector = createSelector([
    { id: "b1", appId: "app-1", datasetId: "dataset-1" },
    { id: "b2", appId: "app-1", datasetId: "dataset-2" },
  ]);
  const result = await selector.select("app-1");
  assert.deepStrictEqual(result.availableDatasetIds, [
    "dataset-1",
    "dataset-2",
  ]);
});

test("deduplicates available dataset ids from bindings", async () => {
  const selector = createSelector([
    { id: "b1", appId: "app-1", datasetId: "dataset-1" },
    { id: "b2", appId: "app-1", datasetId: "dataset-1" },
  ]);
  const result = await selector.select("app-1");
  assert.deepStrictEqual(result.datasetIds, ["dataset-1"]);
});
