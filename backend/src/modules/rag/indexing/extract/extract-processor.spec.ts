import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import assert from "node:assert";
import { ExtractProcessor } from "./extract-processor";

function makeTempFile(ext: string, content: string): string {
  const dir = mkdtempSync("/tmp/rag-test-");
  const filePath = join(dir, `test${ext}`);
  writeFileSync(filePath, content);
  return filePath;
}

function cleanup(path: string): void {
  // Remove the file and its parent directory
  const { dir } = require("node:path").parse(path);
  rmSync(dir, { recursive: true, force: true });
}

test("extracts text source type as-is", async () => {
  const processor = new ExtractProcessor();
  const result = await processor.extract({
    sourceType: "text",
    content: "hello world",
  });
  assert.strictEqual(result.length, 1);
  assert.strictEqual(result[0].content, "hello world");
});

test("extracts markdown source type as-is", async () => {
  const processor = new ExtractProcessor();
  const result = await processor.extract({
    sourceType: "markdown",
    content: "# Title\n\nSome **bold** text",
  });
  assert.strictEqual(result.length, 1);
  assert.strictEqual(result[0].content, "# Title\n\nSome **bold** text");
});

test("rejects file sourceType without sourceUri", async () => {
  const processor = new ExtractProcessor();
  await assert.rejects(
    () => processor.extract({ sourceType: "file", content: "" }),
    { message: /sourceUri is required/ }
  );
});

test("extracts .txt file content", async () => {
  const filePath = makeTempFile(".txt", "hello from txt file");
  try {
    const processor = new ExtractProcessor();
    const result = await processor.extract({
      sourceType: "file",
      content: "",
      sourceUri: filePath,
    });
    assert.strictEqual(result.length, 1);
    assert.strictEqual(result[0].content, "hello from txt file");
  } finally {
    cleanup(filePath);
  }
});

test("extracts .md file content", async () => {
  const filePath = makeTempFile(".md", "# Hello\n\nmarkdown content");
  try {
    const processor = new ExtractProcessor();
    const result = await processor.extract({
      sourceType: "file",
      content: "",
      sourceUri: filePath,
    });
    assert.strictEqual(result.length, 1);
    assert.strictEqual(result[0].content, "# Hello\n\nmarkdown content");
  } finally {
    cleanup(filePath);
  }
});

test("extracts .csv file content", async () => {
  const filePath = makeTempFile(".csv", "a,b,c\n1,2,3");
  try {
    const processor = new ExtractProcessor();
    const result = await processor.extract({
      sourceType: "file",
      content: "",
      sourceUri: filePath,
    });
    assert.strictEqual(result.length, 1);
    assert.strictEqual(result[0].content, "a,b,c\n1,2,3");
  } finally {
    cleanup(filePath);
  }
});

test("rejects unsupported file extension", async () => {
  const filePath = makeTempFile(".png", "fake png data");
  try {
    const processor = new ExtractProcessor();
    await assert.rejects(
      () =>
        processor.extract({
          sourceType: "file",
          content: "",
          sourceUri: filePath,
        }),
      { message: /Unsupported file type: .png/ }
    );
  } finally {
    cleanup(filePath);
  }
});

test("rejects when file does not exist", async () => {
  const processor = new ExtractProcessor();
  await assert.rejects(
    () =>
      processor.extract({
        sourceType: "file",
        content: "",
        sourceUri: "/tmp/nonexistent-file-12345.txt",
      }),
    { message: /Failed to extract/ }
  );
});
