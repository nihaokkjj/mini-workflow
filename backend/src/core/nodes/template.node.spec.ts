import { test } from "node:test";
import assert from "node:assert";
import { TemplateNode } from "./template.node";
import { VariablePool } from "./base.node";

const context = { tenantId: "t", appId: "a", workflowId: "w", userId: "u" };

test("TemplateNode resolves template and outputs result", async () => {
  const pool = new VariablePool();
  pool.setNodeOutput("start-1", { name: "world" });

  const node = new TemplateNode(
    { id: "tpl-1", type: "template", title: "Template", position: { x: 0, y: 0 }, data: { template: "Hello {{start-1.name}}!" } },
    pool,
    context,
  );

  const events: any[] = [];
  for await (const e of node.run()) events.push(e);

  assert.strictEqual(events[0].event, "node_start");
  const end = events.find((e) => e.event === "node_end");
  assert.ok(end);
  assert.strictEqual(end.outputs.result, "Hello world!");
});

test("TemplateNode handles template without variables", async () => {
  const pool = new VariablePool();

  const node = new TemplateNode(
    { id: "tpl-2", type: "template", title: "Template", position: { x: 0, y: 0 }, data: { template: "Static text" } },
    pool,
    context,
  );

  const events: any[] = [];
  for await (const e of node.run()) events.push(e);

  const end = events.find((e) => e.event === "node_end");
  assert.ok(end);
  assert.strictEqual(end.outputs.result, "Static text");
});

test("TemplateNode emits error on empty template", async () => {
  const pool = new VariablePool();

  const node = new TemplateNode(
    { id: "tpl-3", type: "template", title: "Template", position: { x: 0, y: 0 }, data: { template: "" } },
    pool,
    context,
  );

  const events: any[] = [];
  for await (const e of node.run()) events.push(e);

  const err = events.find((e) => e.event === "error");
  assert.ok(err);
  assert.ok((err.error as string).includes("empty"));
});
