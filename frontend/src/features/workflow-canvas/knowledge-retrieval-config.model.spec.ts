import assert from "node:assert";
import { test } from "node:test";
import {
  clearExplicitDatasetSelection,
  readSelectedDatasetIds,
  setExplicitDatasetSelection,
  toggleExplicitDatasetSelection,
} from "./knowledge-retrieval-config.model";

test("readSelectedDatasetIds keeps unique non-empty string dataset ids", () => {
  assert.deepStrictEqual(
    readSelectedDatasetIds({
      datasetIds: ["dataset-1", "", "dataset-1", "dataset-2", 42, null],
    }),
    ["dataset-1", "dataset-2"]
  );
});

test("toggleExplicitDatasetSelection adds and removes dataset ids", () => {
  const added = toggleExplicitDatasetSelection(
    { datasetIds: ["dataset-1"] },
    "dataset-2"
  );
  assert.deepStrictEqual(readSelectedDatasetIds(added), [
    "dataset-1",
    "dataset-2",
  ]);

  const removed = toggleExplicitDatasetSelection(added, "dataset-1");
  assert.deepStrictEqual(readSelectedDatasetIds(removed), ["dataset-2"]);
});

test("clearing explicit dataset ids falls back to using all bound datasets", () => {
  const explicitSelection = setExplicitDatasetSelection(
    { queryTemplate: "{{start-1.query}}" },
    ["dataset-1", "dataset-2"]
  );
  assert.deepStrictEqual(readSelectedDatasetIds(explicitSelection), [
    "dataset-1",
    "dataset-2",
  ]);

  const clearedSelection = clearExplicitDatasetSelection(explicitSelection);
  assert.deepStrictEqual(readSelectedDatasetIds(clearedSelection), []);
});
