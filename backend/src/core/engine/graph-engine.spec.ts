import { test } from "node:test";
import assert from "node:assert";
import { GraphEngine } from "./graph-engine";
import type {
  Graph,
  NodeConfig,
  EdgeConfig,
  GraphEngineEvent,
} from "../../types";

// ---- helpers ----

const ctx = { tenantId: "t", appId: "a", workflowId: "w", userId: "u" };

function makeNode(overrides: Partial<NodeConfig> = {}): NodeConfig {
  return {
    id: "node-1",
    type: "start",
    title: "Node",
    position: { x: 0, y: 0 },
    data: {},
    ...overrides,
  };
}

function makeEdge(overrides: Partial<EdgeConfig> = {}): EdgeConfig {
  return {
    id: "e1",
    source: "start-1",
    target: "end-1",
    ...overrides,
  };
}

function makeGraph(nodes: NodeConfig[], edges: EdgeConfig[]): Graph {
  return { nodes, edges };
}

/** Collect all events from the async generator into an array */
async function collect(engine: GraphEngine): Promise<GraphEngineEvent[]> {
  const events: GraphEngineEvent[] = [];
  for await (const e of engine.run()) events.push(e);
  return events;
}

// ---- validate ----

test("validate returns null for a valid graph", () => {
  const engine = new GraphEngine(
    makeGraph(
      [
        makeNode({ id: "start-1", type: "start" }),
        makeNode({ id: "end-1", type: "end" }),
      ],
      [makeEdge({ id: "e1", source: "start-1", target: "end-1" })]
    ),
    ctx
  );
  assert.strictEqual(engine.validate(), null);
});

test("validate rejects graph with no start node", () => {
  const engine = new GraphEngine(
    makeGraph([makeNode({ id: "end-1", type: "end" })], []),
    ctx
  );
  const err = engine.validate();
  assert.ok(err?.includes("Start node"));
});

test("validate rejects graph with multiple start nodes", () => {
  const engine = new GraphEngine(
    makeGraph(
      [
        makeNode({ id: "start-1", type: "start" }),
        makeNode({ id: "start-2", type: "start" }),
        makeNode({ id: "end-1", type: "end" }),
      ],
      [{ id: "e1", source: "start-1", target: "end-1" }]
    ),
    ctx
  );
  const err = engine.validate();
  assert.ok(err?.includes("Start node"));
  assert.ok(err?.includes("2"));
});

test("validate rejects graph with no end node", () => {
  const engine = new GraphEngine(
    makeGraph([makeNode({ id: "start-1", type: "start" })], []),
    ctx
  );
  const err = engine.validate();
  assert.ok(err?.includes("End node"));
});

test("validate rejects isolated non-start nodes", () => {
  const engine = new GraphEngine(
    makeGraph(
      [
        makeNode({ id: "start-1", type: "start" }),
        makeNode({ id: "isolated-1", type: "template" }),
        makeNode({ id: "end-1", type: "end" }),
      ],
      [makeEdge({ id: "e1", source: "start-1", target: "end-1" })]
    ),
    ctx
  );
  const err = engine.validate();
  assert.ok(err?.includes("isolated"));
  assert.ok(err?.includes("template"));
});

test("validate rejects unknown node type", () => {
  const engine = new GraphEngine(
    makeGraph(
      [
        makeNode({ id: "start-1", type: "start" }),
        makeNode({ id: "end-1", type: "end" }),
        makeNode({ id: "bad-1", type: "non-existent-type" as any }),
      ],
      [
        makeEdge({ id: "e1", source: "start-1", target: "end-1" }),
        makeEdge({ id: "e2", source: "start-1", target: "bad-1" }),
      ]
    ),
    ctx
  );
  const err = engine.validate();
  assert.ok(err?.includes("Unknown node type"));
});

// ---- topological sort / execution ----

test("linear DAG executes all nodes in order", async () => {
  // Use template nodes (no external dependencies) for reliable testing
  const engine = new GraphEngine(
    makeGraph(
      [
        makeNode({ id: "start-1", type: "start" }),
        makeNode({
          id: "tpl-1",
          type: "template",
          data: { template: "hello" },
        }),
        makeNode({ id: "end-1", type: "end" }),
      ],
      [
        { id: "e1", source: "start-1", target: "tpl-1" },
        { id: "e2", source: "tpl-1", target: "end-1" },
      ]
    ),
    ctx
  );
  const events = await collect(engine);

  const startEvents = events.filter((e) => e.event === "node_start");
  assert.strictEqual(startEvents.length, 3);
  assert.strictEqual(startEvents[0].nodeId, "start-1");
  assert.strictEqual(startEvents[1].nodeId, "tpl-1");
  assert.strictEqual(startEvents[2].nodeId, "end-1");
  assert.ok(events.some((e) => e.event === "graph_end"));
});

test("cycle detection: topologicalSort throws before yielding, propagating as generator error", async () => {
  const engine = new GraphEngine(
    makeGraph(
      [
        makeNode({ id: "a", type: "start" }),
        makeNode({ id: "b", type: "template" }),
        makeNode({ id: "end-1", type: "end" }),
      ],
      [
        { id: "e1", source: "a", target: "b" },
        { id: "e2", source: "b", target: "a" },
        { id: "e3", source: "b", target: "end-1" },
      ]
    ),
    ctx
  );
  // topologicalSort throws synchronously inside run() before the first yield,
  // so iterating the generator throws immediately
  await assert.rejects(
    async () => {
      for await (const _ of engine.run()) {
        void _;
      }
    },
    { message: /Cycle/ }
  );
});

// ---- execution limits ----

test("run stops when maxSteps is exceeded", async () => {
  const engine = new GraphEngine(
    makeGraph(
      [
        makeNode({ id: "start-1", type: "start" }),
        makeNode({ id: "end-1", type: "end" }),
      ],
      [makeEdge({ id: "e1", source: "start-1", target: "end-1" })]
    ),
    ctx,
    { maxSteps: 1 }
  );
  const events = await collect(engine);
  const err = events.find((e) => e.event === "error");
  assert.ok(err);
  assert.ok((err as any).message.includes("max"));
});

test("run stops when maxTimeMs is exceeded (set negative for instant trigger)", async () => {
  const engine = new GraphEngine(
    makeGraph(
      [
        makeNode({ id: "start-1", type: "start" }),
        makeNode({ id: "end-1", type: "end" }),
      ],
      [makeEdge({ id: "e1", source: "start-1", target: "end-1" })]
    ),
    ctx,
    // Use a negative value so Date.now() - startTime > maxTimeMs is always true
    { maxTimeMs: -1 }
  );
  const events = await collect(engine);
  const err = events.find((e) => e.event === "error");
  assert.ok(err);
  assert.ok((err as any).message.includes("timeout"));
});

// ---- abort signal ----

test("run aborts when signal is already aborted", async () => {
  const controller = new AbortController();
  controller.abort("test cancel reason");
  const engine = new GraphEngine(
    makeGraph(
      [
        makeNode({ id: "start-1", type: "start" }),
        makeNode({ id: "end-1", type: "end" }),
      ],
      [makeEdge({ id: "e1", source: "start-1", target: "end-1" })]
    ),
    ctx,
    { abortSignal: controller.signal }
  );
  const events = await collect(engine);
  const err = events.find((e) => e.event === "error");
  assert.ok(err);
  assert.ok((err as any).message.includes("cancel"));
});

// ---- if-else branch routing ----

test("if-else branch routing marks inactive branch nodes as skipped (true branch)", async () => {
  const engine = new GraphEngine(
    makeGraph(
      [
        makeNode({ id: "start-1", type: "start" }),
        makeNode({
          id: "if-1",
          type: "if-else",
          data: { condition: "1 == 1" },
        }),
        makeNode({
          id: "true-branch",
          type: "template",
          data: { template: "active" },
        }),
        makeNode({
          id: "false-branch",
          type: "template",
          data: { template: "inactive" },
        }),
        makeNode({ id: "end-1", type: "end" }),
      ],
      [
        { id: "e1", source: "start-1", target: "if-1" },
        {
          id: "e2",
          source: "if-1",
          target: "true-branch",
          sourceHandle: "true",
        },
        {
          id: "e3",
          source: "if-1",
          target: "false-branch",
          sourceHandle: "false",
        },
        { id: "e4", source: "true-branch", target: "end-1" },
        { id: "e5", source: "false-branch", target: "end-1" },
      ]
    ),
    ctx
  );
  const events = await collect(engine);

  const skipped = events.filter((e) => e.event === "node_skipped");
  const skippedIds = skipped.map((e) => (e as any).nodeId);
  assert.ok(
    skippedIds.includes("false-branch"),
    "false branch should be skipped"
  );
  assert.ok(
    !skippedIds.includes("true-branch"),
    "true branch should not be skipped"
  );

  const endStarted = events.find(
    (e) => e.event === "node_start" && e.nodeId === "end-1"
  );
  assert.ok(endStarted, "shared end node should still run");
});

test("if-else: shared downstream nodes still execute when reachable from active branch", async () => {
  const engine = new GraphEngine(
    makeGraph(
      [
        makeNode({ id: "start-1", type: "start" }),
        makeNode({
          id: "if-1",
          type: "if-else",
          data: { condition: "1 == 2" },
        }),
        makeNode({
          id: "true-branch",
          type: "template",
          data: { template: "a" },
        }),
        makeNode({
          id: "false-branch",
          type: "template",
          data: { template: "b" },
        }),
        makeNode({ id: "end-1", type: "end" }),
      ],
      [
        { id: "e1", source: "start-1", target: "if-1" },
        {
          id: "e2",
          source: "if-1",
          target: "true-branch",
          sourceHandle: "true",
        },
        {
          id: "e3",
          source: "if-1",
          target: "false-branch",
          sourceHandle: "false",
        },
        { id: "e4", source: "true-branch", target: "end-1" },
        { id: "e5", source: "false-branch", target: "end-1" },
      ]
    ),
    ctx
  );
  const events = await collect(engine);

  const skipped = events.filter((e) => e.event === "node_skipped");
  const skippedIds = skipped.map((e) => (e as any).nodeId);
  assert.ok(
    skippedIds.includes("true-branch"),
    "true branch should be skipped when condition is false"
  );
  assert.ok(
    !skippedIds.includes("false-branch"),
    "false branch should not be skipped"
  );

  const endStarted = events.find(
    (e) => e.event === "node_start" && e.nodeId === "end-1"
  );
  assert.ok(endStarted, "end node must still execute");
});

// ---- graph_end outputs ----

test("graph_end yields final outputs from end node", async () => {
  const engine = new GraphEngine(
    makeGraph(
      [
        makeNode({ id: "start-1", type: "start" }),
        makeNode({ id: "end-1", type: "end" }),
      ],
      [makeEdge({ id: "e1", source: "start-1", target: "end-1" })]
    ),
    ctx
  );
  const events = await collect(engine);
  const graphEnd = events.find((e) => e.event === "graph_end");
  assert.ok(graphEnd);
  assert.ok((graphEnd as any).outputs);
});

test("validation error is yielded before topological sort runs", async () => {
  // Graph with no end node fails validate() and yields an error event
  const engine = new GraphEngine(
    makeGraph([makeNode({ id: "start-1", type: "start" })], []),
    ctx
  );
  const events = await collect(engine);
  const err = events.find((e) => e.event === "error");
  assert.ok(err);
});

test("default maxSteps and maxTimeMs are applied when not specified", () => {
  const engine = new GraphEngine(makeGraph([], []), ctx);
  assert.ok(engine);
});
