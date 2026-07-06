import { test } from "node:test";
import assert from "node:assert";
import { ExtractProcessor } from "./extract-processor";

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

test("rejects file source type (not supported yet)", async () => {
  const processor = new ExtractProcessor();
  await assert.rejects(
    () =>
      processor.extract({ sourceType: "file", content: "/path/to/file.txt" }),
    { message: /not supported/ }
  );
});
