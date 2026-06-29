import { NodeConfig, ExecutionContext } from "../../types";
import { BaseNode, VariablePool } from "../nodes/base.node";
import { StartNode } from "../nodes/start.node";
import { EndNode } from "../nodes/end.node";
import { LLMNode } from "../nodes/llm.node";
import { IfElseNode } from "../nodes/if-else.node";
import { HttpNode } from "../nodes/http.node";
import { TemplateNode } from "../nodes/template.node";

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
    this.register("if-else", IfElseNode);
    this.register("http", HttpNode);
    this.register("template", TemplateNode);
  }

  static register(type: string, ctor: NodeConstructor): void {
    this.registry.set(type, ctor);
  }

  static has(type: string): boolean {
    return this.registry.has(type);
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
