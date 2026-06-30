import { test } from "node:test";
import assert from "node:assert";
import { CodeNode } from "./code.node";
import { VariablePool } from "./base.node";

const context = { tenantId: "t", appId: "a", workflowId: "w", userId: "u" };

test("CodeNode executes code and returns result", async () => {
  const pool = new VariablePool();

  const node = new CodeNode(
    { id: "code-1", type: "code", title: "Code", position: { x: 0, y: 0 }, data: { code: "return 10 + 20;" } },
    pool,
    context,
  );

  const events: any[] = [];
  for await (const e of node.run()) events.push(e);

  assert.strictEqual(events[0].event, "node_start");
  const end = events.find((e) => e.event === "node_end");
  assert.ok(end);
  assert.strictEqual(end.outputs.result, 30);
});

test("CodeNode can access $inputs from the variable pool", async () => {
  const pool = new VariablePool();
  pool.setNodeOutput("start-1", { name: "world" });

  const node = new CodeNode(
    {
      id: "code-2",
      type: "code",
      title: "Code",
      position: { x: 0, y: 0 },
      data: {
        code: "return 'hello ' + $inputs.name;",
        inputs: { name: "{{start-1.name}}" },
      },
    },
    pool,
    context,
  );

  const events: any[] = [];
  for await (const e of node.run()) events.push(e);

  const end = events.find((e) => e.event === "node_end");
  assert.ok(end);
  assert.strictEqual(end.outputs.result, "hello world");
});

test("CodeNode emits error when code is empty", async () => {
  const pool = new VariablePool();

  const node = new CodeNode(
    { id: "code-3", type: "code", title: "Code", position: { x: 0, y: 0 }, data: { code: "" } },
    pool,
    context,
  );

  const events: any[] = [];
  for await (const e of node.run()) events.push(e);

  const err = events.find((e) => e.event === "error");
  assert.ok(err);
  assert.ok((err.error as string).includes("empty"));
});

test("CodeNode emits error on runtime exception", async () => {
  const pool = new VariablePool();

  const node = new CodeNode(
    { id: "code-4", type: "code", title: "Code", position: { x: 0, y: 0 }, data: { code: "throw new Error('something went wrong');" } },
    pool,
    context,
  );

  const events: any[] = [];
  for await (const e of node.run()) events.push(e);

  const err = events.find((e) => e.event === "error");
  assert.ok(err);
  assert.ok((err.error as string).includes("something went wrong"));
});
