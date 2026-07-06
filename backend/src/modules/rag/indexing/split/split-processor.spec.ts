import { test } from "node:test";
import assert from "node:assert";
import { SplitProcessor } from "./split-processor";

test("returns empty array for empty text", () => {
  const processor = new SplitProcessor();
  assert.deepStrictEqual(
    processor.split("", { chunkSize: 500, chunkOverlap: 80 }),
    []
  );
  assert.deepStrictEqual(
    processor.split("   ", { chunkSize: 500, chunkOverlap: 80 }),
    []
  );
});

test("returns a single chunk for text shorter than chunkSize", () => {
  const processor = new SplitProcessor();
  const result = processor.split("hello world", {
    chunkSize: 500,
    chunkOverlap: 80,
  });
  assert.strictEqual(result.length, 1);
  assert.strictEqual(result[0].content, "hello world");
  assert.strictEqual(result[0].position, 0);
  assert.ok(result[0].tokenCount > 0);
});

test("splits by paragraph boundary when possible", () => {
  const processor = new SplitProcessor();
  const p1 = "A".repeat(20);
  const p2 = "B".repeat(20);
  const text = `${p1}\n\n${p2}`;
  const result = processor.split(text, { chunkSize: 25, chunkOverlap: 0 });
  // Each paragraph fits in its own chunk
  assert.strictEqual(result.length, 2);
  assert.strictEqual(result[0].content, p1);
  assert.strictEqual(result[1].content, p2);
});

test("splits a single long paragraph that exceeds chunkSize", () => {
  const processor = new SplitProcessor();
  const text = "X".repeat(100);
  const result = processor.split(text, { chunkSize: 30, chunkOverlap: 0 });
  // Should produce ~4 chunks (100 / 30 ≈ 4)
  assert.ok(
    result.length >= 3,
    `expected at least 3 chunks, got ${result.length}`
  );
  // Each chunk should be ≤ chunkSize
  for (const chunk of result) {
    assert.ok(
      chunk.content.length <= 30,
      `chunk length ${chunk.content.length} > 30`
    );
  }
  // Concatenated content should cover the original (minus overlaps)
  const total = result.map((c) => c.content).join("");
  // With overlap=0, the split is exact
  assert.strictEqual(total, text);
});

test("applies overlap when splitting long paragraphs", () => {
  const processor = new SplitProcessor();
  const text = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const result = processor.split(text, { chunkSize: 10, chunkOverlap: 3 });
  assert.ok(result.length >= 3);
  // First chunk: ABCDEFGHIJ (10 chars)
  assert.strictEqual(result[0].content, "ABCDEFGHIJ");
  // Second chunk should start with overlap region
  assert.ok(result[1].content.startsWith("HIJ"));
});

test("multiple paragraphs merge into one chunk when combined length ≤ chunkSize", () => {
  const processor = new SplitProcessor();
  const p1 = "AAA";
  const p2 = "BBB";
  const p3 = "CCC";
  const text = `${p1}\n\n${p2}\n\n${p3}`;
  const result = processor.split(text, { chunkSize: 500, chunkOverlap: 0 });
  assert.strictEqual(result.length, 1);
  assert.ok(result[0].content.includes("AAA"));
  assert.ok(result[0].content.includes("BBB"));
  assert.ok(result[0].content.includes("CCC"));
});

test("paragraphs are split when adding the next paragraph would exceed chunkSize", () => {
  const processor = new SplitProcessor();
  const p1 = "A".repeat(30);
  const p2 = "B".repeat(30);
  const text = `${p1}\n\n${p2}`;
  const result = processor.split(text, { chunkSize: 40, chunkOverlap: 0 });
  // p1 fits, but p1 + p2 exceeds 40
  assert.strictEqual(result.length, 2);
  assert.strictEqual(result[0].content, p1);
  assert.strictEqual(result[1].content, p2);
});

test("positions are sequential starting from 0", () => {
  const processor = new SplitProcessor();
  const text = "A".repeat(200);
  const result = processor.split(text, { chunkSize: 50, chunkOverlap: 10 });
  for (let i = 0; i < result.length; i++) {
    assert.strictEqual(result[i].position, i);
  }
});

test("overlap seed is carried forward when a paragraph is pushed", () => {
  const processor = new SplitProcessor();
  const p1 = "A".repeat(30);
  const p2 = "B".repeat(30);
  const text = `${p1}\n\n${p2}`;
  const result = processor.split(text, { chunkSize: 40, chunkOverlap: 10 });
  assert.strictEqual(result.length, 2);
  // overlap seed from p1 should be prepended to p2
  assert.ok(result[1].content.endsWith(p2));
  assert.ok(
    result[1].content.includes("A"),
    "overlap seed from p1 should appear in the second chunk"
  );
});
