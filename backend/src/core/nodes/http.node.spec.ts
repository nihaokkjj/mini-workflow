import { test } from "node:test";
import assert from "node:assert";
import { HttpNode } from "./http.node";
import { VariablePool } from "./base.node";
import { GraphEngineEvent } from "../../types";

const context = { tenantId: "t", appId: "a", workflowId: "w", userId: "u" };

function mockDnsSafe() {
  const { lookup } = require("dns/promises") as typeof import("dns/promises");
  const originalLookup = lookup;
  const safeLookup: typeof lookup = ((hostname: string, opts?: any) => {
    if (opts?.all) {
      return [{ address: "93.184.216.34", family: 4 }];
    }
    return { address: "93.184.216.34", family: 4 };
  }) as any;
  require("dns/promises").lookup = safeLookup;
  return () => {
    require("dns/promises").lookup = originalLookup;
  };
}

test("HttpNode returns status and body", async () => {
  const restoreDns = mockDnsSafe();
  const pool = new VariablePool();
  const originalFetch = global.fetch;
  global.fetch = async () =>
    new Response('{"ok":true}', {
      status: 200,
      headers: { "content-type": "application/json" },
    });

  try {
    const node = new HttpNode(
      {
        id: "http-1",
        type: "http",
        title: "HTTP",
        position: { x: 0, y: 0 },
        data: { method: "GET", url: "https://example.com" },
      },
      pool,
      context
    );
    const events: GraphEngineEvent[] = [];
    for await (const e of node.run()) events.push(e as any);

    assert.strictEqual(events[0].event, "node_start");
    const end = events.find((e) => e.event === "node_end");
    assert.ok(end);
    assert.strictEqual((end as any).outputs.status, 200);
    assert.strictEqual((end as any).outputs.body, '{"ok":true}');
    assert.deepStrictEqual((end as any).outputs.json, { ok: true });
  } finally {
    global.fetch = originalFetch;
    restoreDns();
  }
});

test("HttpNode resolves templates in url", async () => {
  const restoreDns = mockDnsSafe();
  const pool = new VariablePool();
  pool.setNodeOutput("start-1", { endpoint: "https://api.example.com" });
  const originalFetch = global.fetch;
  let fetchedUrl = "";
  global.fetch = async (input: any) => {
    fetchedUrl = String(input);
    return new Response("done", { status: 200 });
  };

  try {
    const node = new HttpNode(
      {
        id: "http-2",
        type: "http",
        title: "HTTP",
        position: { x: 0, y: 0 },
        data: { method: "GET", url: "{{start-1.endpoint}}/x" },
      },
      pool,
      context
    );
    for await (const _ of node.run()) {
      /* drain */
    }
    assert.strictEqual(fetchedUrl, "https://api.example.com/x");
  } finally {
    global.fetch = originalFetch;
    restoreDns();
  }
});
