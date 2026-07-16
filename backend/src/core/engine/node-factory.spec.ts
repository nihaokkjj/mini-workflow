import { test } from "node:test";
import assert from "node:assert";
import { NodeFactory } from "./node-factory";
import { VariablePool } from "../nodes/base.node";
import type { NodeConfig, ExecutionContext } from "../../types";

const ctx: ExecutionContext = {
  tenantId: "t",
  appId: "a",
  workflowId: "w",
  userId: "u",
};
const pool = new VariablePool();

function makeConfig(type: string): NodeConfig {
  return {
    id: "node-1",
    type: type as any,
    title: "Node",
    position: { x: 0, y: 0 },
    data: {},
  };
}

test("has() returns true for built-in node types", () => {
  assert.strictEqual(NodeFactory.has("start"), true);
  assert.strictEqual(NodeFactory.has("end"), true);
  assert.strictEqual(NodeFactory.has("llm"), true);
  assert.strictEqual(NodeFactory.has("if-else"), true);
  assert.strictEqual(NodeFactory.has("http"), true);
  assert.strictEqual(NodeFactory.has("template"), true);
  assert.strictEqual(NodeFactory.has("code"), true);
  assert.strictEqual(NodeFactory.has("knowledge-retrieval"), true);
  assert.strictEqual(NodeFactory.has("iteration"), true);
});

test("has() returns false for unknown node types", () => {
  assert.strictEqual(NodeFactory.has("non-existent"), false);
  assert.strictEqual(NodeFactory.has(""), false);
});

test("create() returns a BaseNode instance for known types", () => {
  const node = NodeFactory.create(makeConfig("start"), pool, ctx);
  assert.ok(node);
  assert.strictEqual(node.nodeType, "start");
});

test("create() throws for unknown node types", () => {
  assert.throws(
    () => NodeFactory.create(makeConfig("unknown-type"), pool, ctx),
    { message: /Unknown node type/ }
  );
});

test("register() allows overriding an existing node type", () => {
  // Save original and override
  const Original = (NodeFactory as any).registry.get("start");
  const Dummy = class {
    readonly nodeType = "start";
    config: any;
    pool: any;
    context: any;
    constructor(c: any, p: any, ctx: any) {
      this.config = c;
      this.pool = p;
      this.context = ctx;
    }
    async *run() {
      yield {
        event: "node_end",
        nodeId: "x",
        outputs: { dummy: true },
        timestamp: 0,
      };
    }
  };
  NodeFactory.register("start", Dummy as any);
  assert.strictEqual(NodeFactory.has("start"), true);
  const node = NodeFactory.create(makeConfig("start"), pool, ctx);
  assert.ok(node);
  // Restore original
  NodeFactory.register("start", Original);
});

test("create() passes config, pool, and context to the node constructor", () => {
  const node = NodeFactory.create(
    {
      id: "my-node",
      type: "start",
      title: "My Node",
      position: { x: 10, y: 20 },
      data: { key: "val" },
    },
    pool,
    ctx
  );
  assert.strictEqual(node.config.id, "my-node");
  assert.strictEqual(node.config.title, "My Node");
  assert.strictEqual(node.pool, pool);
  assert.strictEqual(node.context, ctx);
});
