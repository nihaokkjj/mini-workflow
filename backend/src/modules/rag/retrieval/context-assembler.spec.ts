import { test } from "node:test";
import assert from "node:assert";
import { ContextAssembler, Source } from "./context-assembler";

function makeSource(overrides: Partial<Source> = {}): Source {
  return {
    title: "Doc / 段落 1",
    content: "content",
    datasetId: "dataset-1",
    datasetName: "Dataset",
    documentId: "document-1",
    documentName: "Doc",
    segmentId: "segment-1",
    score: 0.9,
    position: 0,
    ...overrides,
  };
}

test("assembles a single source", () => {
  const assembler = new ContextAssembler();
  const result = assembler.assemble([makeSource()]);
  assert.strictEqual(result, "[1] Doc / 段落 1\ncontent");
});

test("assembles multiple sources with numbering", () => {
  const assembler = new ContextAssembler();
  const result = assembler.assemble([
    makeSource({ documentName: "Doc1", content: "aaa" }),
    makeSource({ documentName: "Doc2", content: "bbb", position: 1 }),
  ]);
  const expected = "[1] Doc1 / 段落 1\naaa\n\n[2] Doc2 / 段落 2\nbbb";
  assert.strictEqual(result, expected);
});

test("returns empty string for empty sources", () => {
  const assembler = new ContextAssembler();
  assert.strictEqual(assembler.assemble([]), "");
});

test("position is displayed as 1-based", () => {
  const assembler = new ContextAssembler();
  const result = assembler.assemble([makeSource({ position: 3 })]);
  assert.ok(result.includes("段落 4"));
});
