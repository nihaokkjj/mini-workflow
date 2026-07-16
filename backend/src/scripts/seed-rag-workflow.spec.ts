import { test } from "node:test";
import assert from "node:assert";
import { buildRagWorkflowGraph } from "./seed-rag-workflow";

test("RAG seed workflow stores LLM prompts in the runtime-supported format", () => {
  const graph = buildRagWorkflowGraph("dataset-1");

  const llmNode = graph.nodes.find((node) => node.id === "llm-1");
  assert.ok(llmNode);
  assert.strictEqual(llmNode.type, "llm");
  assert.strictEqual(llmNode.data.model, "gpt-4o-mini");
  assert.strictEqual(llmNode.data.baseURL, "https://api.openai.com/v1");
  assert.strictEqual(typeof llmNode.data.systemPrompt, "string");
  assert.strictEqual(typeof llmNode.data.userPrompt, "string");
  assert.ok(
    (llmNode.data.userPrompt as string).includes(
      "{{knowledge-retrieval-1.context}}"
    )
  );
  assert.ok((llmNode.data.userPrompt as string).includes("{{start-1.query}}"));
  assert.ok(!("prompt" in llmNode.data));
});
