import { NodeConfig, NodeType, ExecutionContext, GraphEngineEvent } from "../../types";

/** Variable pool — stores all values exchanged between nodes during execution */
export class VariablePool {
  private store = new Map<string, unknown>();

  /** Set a node's output under its nodeId */
  setNodeOutput(nodeId: string, outputs: Record<string, unknown>): void {
    this.store.set(nodeId, outputs);
    // Also set individual fields for selector-style access: "nodeId.field"
    for (const [key, value] of Object.entries(outputs)) {
      this.store.set(`${nodeId}.${key}`, value);
    }
  }

  /** Get a node's full output */
  getNodeOutput(nodeId: string): Record<string, unknown> | undefined {
    return this.store.get(nodeId) as Record<string, unknown> | undefined;
  }

  /** Resolve a variable reference like "nodeId.field" or "nodeId" */
  resolve(selector: string): unknown {
    return this.store.get(selector);
  }
}

/** Base class for all nodes — every node type extends this */
export abstract class BaseNode {
  abstract readonly nodeType: NodeType;

  constructor(
    public readonly config: NodeConfig,
    public readonly pool: VariablePool,
    public readonly context: ExecutionContext,
  ) {}

  /**
   * Execute the node and yield events asynchronously.
   * Must call `pool.setNodeOutput(this.config.id, outputs)` when done.
   */
  abstract run(): AsyncGenerator<GraphEngineEvent>;

  /** Resolve a template string like "Hello {{llm-1.text}}" against the pool */
  protected resolveTemplate(template: string): string {
    return template.replace(/\{\{([^}]+)\}\}/g, (_, selector: string) => {
      const resolved = this.pool.resolve(selector.trim());
      return resolved !== undefined ? String(resolved) : `{{${selector}}}`;
    });
  }

  /** Resolve a reference from node data: if the value starts with $, resolve it from the pool */
  protected resolveValue(value: unknown): unknown {
    if (typeof value === "string" && value.startsWith("$")) {
      return this.pool.resolve(value.slice(1));
    }
    return value;
  }

  /** Resolve node inputs from config.data.inputs mapping */
  protected getInputs(): Record<string, unknown> {
    const inputsConfig = this.config.data.inputs as Record<string, string> | undefined;
    if (!inputsConfig) return {};
    const result: Record<string, unknown> = {};
    for (const [key, template] of Object.entries(inputsConfig)) {
      result[key] = this.resolveTemplate(template);
    }
    return result;
  }
}
