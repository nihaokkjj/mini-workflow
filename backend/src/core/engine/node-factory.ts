import { NodeConfig, ExecutionContext } from "../../types";
import { BaseNode, VariablePool } from "../nodes/base.node";
import { StartNode } from "../nodes/start.node";
import { EndNode } from "../nodes/end.node";
import { LLMNode } from "../nodes/llm.node";

/** Map of node type string to its constructor */
type NodeConstructor = new (
  config: NodeConfig,
  pool: VariablePool,
  context: ExecutionContext,
) => BaseNode;

export class NodeFactory {
  private static registry = new Map<string, NodeConstructor>();

  static {
    this.register("start", StartNode);
    this.register("end", EndNode);
    this.register("llm", LLMNode);
  }

  static register(type: string, ctor: NodeConstructor): void {
    this.registry.set(type, ctor);
  }

  static create(
    config: NodeConfig,
    pool: VariablePool,
    context: ExecutionContext,
  ): BaseNode {
    const Ctor = this.registry.get(config.type);
    if (!Ctor) {
      throw new Error(`Unknown node type: ${config.type}`);
    }
    return new Ctor(config, pool, context);
  }
}
