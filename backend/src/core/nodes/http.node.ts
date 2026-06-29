import { BaseNode } from "./base.node";
import { NodeType, GraphEngineEvent } from "../../types";

export class HttpNode extends BaseNode {
  readonly nodeType: NodeType = "http";

  async *run(): AsyncGenerator<GraphEngineEvent> {
    const nodeId = this.config.id;
    yield { event: "node_start", nodeId, nodeType: "http", timestamp: Date.now() };

    const data = this.config.data;
    const method = ((data.method as string) || "GET").toUpperCase();
    const url = this.resolveTemplate((data.url as string) || "");
    const timeout = (data.timeout as number) || 30000;

    if (!url) {
      yield { event: "error", nodeId, error: "HTTP node url is empty", timestamp: Date.now() };
      return;
    }

    const rawHeaders = (data.headers as Record<string, string>) || {};
    const headers: Record<string, string> = {};
    for (const [key, value] of Object.entries(rawHeaders)) {
      headers[key] = this.resolveTemplate(value);
    }

    const rawBody = data.body ? this.resolveTemplate(String(data.body)) : undefined;

    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeout);
      const res = await fetch(url, {
        method,
        headers: Object.keys(headers).length ? headers : undefined,
        body: method !== "GET" ? rawBody : undefined,
        signal: controller.signal,
      });
      clearTimeout(timer);

      const bodyText = await res.text();
      let json: unknown | undefined;
      try {
        json = JSON.parse(bodyText);
      } catch {
        json = undefined;
      }

      const outputs: Record<string, unknown> = {
        status: res.status,
        body: bodyText,
        headers: Object.fromEntries(res.headers.entries()),
      };
      if (json !== undefined) outputs.json = json;

      this.pool.setNodeOutput(nodeId, outputs);
      yield { event: "node_end", nodeId, outputs, timestamp: Date.now() };
    } catch (err: any) {
      yield { event: "error", nodeId, error: `HTTP request failed: ${err.message}`, timestamp: Date.now() };
    }
  }
}
