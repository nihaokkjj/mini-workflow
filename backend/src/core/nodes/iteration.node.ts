import { BaseNode } from "./base.node";
import { GraphEngineEvent, NodeType } from "../../types";

export class IterationNode extends BaseNode {
  readonly nodeType: NodeType = "iteration";

  async *run(): AsyncGenerator<GraphEngineEvent> {
    const nodeId = this.config.id;
    yield {
      event: "node_start",
      nodeId,
      nodeType: "iteration",
      timestamp: Date.now(),
    };

    try {
      const items = this.resolveItems(this.config.data.items);
      const itemTemplate = (this.config.data.itemTemplate as string) || "";
      const joinWith = (this.config.data.joinWith as string) ?? "\n";

      const renderedItems = items.map((item, index) =>
        this.renderItem(itemTemplate, item, index)
      );
      const outputs: Record<string, unknown> = {
        items: renderedItems,
        count: renderedItems.length,
        text: renderedItems.join(joinWith),
      };

      this.pool.setNodeOutput(nodeId, outputs);
      yield { event: "node_end", nodeId, outputs, timestamp: Date.now() };
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Iteration node failed";
      yield {
        event: "error",
        nodeId,
        nodeType: "iteration",
        message,
        timestamp: Date.now(),
      };
    }
  }

  private resolveItems(rawItems: unknown): unknown[] {
    if (Array.isArray(rawItems)) return rawItems;

    if (typeof rawItems !== "string" || rawItems.trim().length === 0) {
      throw new Error(
        "Iteration node items must be an array or array reference"
      );
    }

    const trimmed = rawItems.trim();
    const resolved =
      trimmed.startsWith("$") && !trimmed.includes("{{")
        ? this.pool.resolve(trimmed.slice(1))
        : this.resolveTemplate(trimmed);

    if (Array.isArray(resolved)) return resolved;

    if (typeof resolved === "string") {
      try {
        const parsed = JSON.parse(resolved);
        if (Array.isArray(parsed)) return parsed;
      } catch {
        // 用户输入可能是普通字符串模板，下面统一返回可读错误。
      }
    }

    throw new Error("Iteration node items did not resolve to an array");
  }

  private renderItem(template: string, item: unknown, index: number): string {
    if (!template) {
      return typeof item === "string" ? item : JSON.stringify(item);
    }

    const withLocalValues = template.replace(
      /\{\{([^}]+)\}\}/g,
      (match, selector: string) => {
        const key = selector.trim();
        if (key === "item") return this.stringifyItem(item);
        if (key === "index") return String(index);
        if (key.startsWith("item.")) {
          const value = this.readItemPath(item, key.slice("item.".length));
          return value === undefined ? match : this.stringifyItem(value);
        }
        return match;
      }
    );

    return this.resolveTemplate(withLocalValues);
  }

  private readItemPath(item: unknown, path: string): unknown {
    return path.split(".").reduce<unknown>((current, segment) => {
      if (current === null || typeof current !== "object") return undefined;
      return (current as Record<string, unknown>)[segment];
    }, item);
  }

  private stringifyItem(value: unknown): string {
    if (typeof value === "string") return value;
    if (value === null || value === undefined) return "";
    return typeof value === "object" ? JSON.stringify(value) : String(value);
  }
}
