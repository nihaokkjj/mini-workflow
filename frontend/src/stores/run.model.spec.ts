import assert from "node:assert";
import { test } from "node:test";
import { initialRunState, runReducer } from "./run.model";

test("start action resets state and sets run id", () => {
  const next = runReducer(
    { ...initialRunState, error: "old" },
    { type: "start", runId: "run-1" }
  );
  assert.strictEqual(next.isRunning, true);
  assert.strictEqual(next.currentRunId, "run-1");
  assert.strictEqual(next.error, null);
});

test("event appends to events", () => {
  const event = {
    event: "node_start" as const,
    nodeId: "n1",
    nodeType: "llm" as const,
    timestamp: 1,
  };
  const next = runReducer(initialRunState, { type: "event", event });
  assert.strictEqual(next.events.length, 1);
  assert.strictEqual(next.events[0].nodeId, "n1");
});

test("finish clears running state", () => {
  const running = runReducer(initialRunState, { type: "start", runId: "r" });
  const next = runReducer(running, { type: "finish" });
  assert.strictEqual(next.isRunning, false);
  assert.strictEqual(next.executingNodeId, null);
});
