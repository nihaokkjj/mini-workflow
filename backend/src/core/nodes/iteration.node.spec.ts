import { test } from "node:test";
import assert from "node:assert";
import { IterationNode } from "./iteration.node";
import { VariablePool } from "./base.node";

const context = { tenantId: "t", appId: "a", workflowId: "w", userId: "u" };

test("IterationNode renders array items with item fields", async () => {
  const pool = new VariablePool();
  pool.setNodeOutput("start-1", {
    products: [
      { name: "Alpha", price: 10 },
      { name: "Beta", price: 20 },
    ],
  });

  const node = new IterationNode(
    {
      id: "iteration-1",
      type: "iteration",
      title: "Iteration",
      position: { x: 0, y: 0 },
      data: {
        items: "$start-1.products",
        itemTemplate: "{{index}}. {{item.name}} = {{item.price}}",
        joinWith: "\n",
      },
    },
    pool,
    context
  );

  const events: any[] = [];
  for await (const event of node.run()) events.push(event);

  const end = events.find((event) => event.event === "node_end");
  assert.ok(end);
  assert.deepStrictEqual(end.outputs.items, ["0. Alpha = 10", "1. Beta = 20"]);
  assert.strictEqual(end.outputs.count, 2);
  assert.strictEqual(end.outputs.text, "0. Alpha = 10\n1. Beta = 20");
});

test("IterationNode accepts JSON array literal input", async () => {
  const pool = new VariablePool();
  const node = new IterationNode(
    {
      id: "iteration-2",
      type: "iteration",
      title: "Iteration",
      position: { x: 0, y: 0 },
      data: {
        items: '["one", "two"]',
        itemTemplate: "- {{item}}",
        joinWith: ", ",
      },
    },
    pool,
    context
  );

  const events: any[] = [];
  for await (const event of node.run()) events.push(event);

  const end = events.find((event) => event.event === "node_end");
  assert.ok(end);
  assert.deepStrictEqual(end.outputs.items, ["- one", "- two"]);
  assert.strictEqual(end.outputs.text, "- one, - two");
});

test("IterationNode emits error when items do not resolve to an array", async () => {
  const pool = new VariablePool();
  const node = new IterationNode(
    {
      id: "iteration-3",
      type: "iteration",
      title: "Iteration",
      position: { x: 0, y: 0 },
      data: { items: "not an array" },
    },
    pool,
    context
  );

  const events: any[] = [];
  for await (const event of node.run()) events.push(event);

  const error = events.find((event) => event.event === "error");
  assert.ok(error);
  assert.match(error.message, /array/);
});
