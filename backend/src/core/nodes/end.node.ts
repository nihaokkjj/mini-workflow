import { BaseNode, VariablePool } from "./base.node";
import { NodeConfig, NodeType, ExecutionContext, GraphEngineEvent } from "../../types";

/**
 * EndNode — exit point of a workflow.
 * Collects selected variables from upstream nodes and produces the final output.
 */
export class EndNode extends BaseNode {
  readonly nodeType: NodeType = "end";

  async *run(): AsyncGenerator<GraphEngineEvent> {
    yield {
      event: "node_start",
      nodeId: this.config.id,
      nodeType: "end",
      timestamp: Date.now(),
    };

    // End node output is whatever was selected via its config, or all upstream outputs
    const outputs: Record<string, unknown> = {
      result: (this.pool.resolve("__last_output") as Record<string, unknown>)?.value ?? "Workflow completed.",
    };

    this.pool.setNodeOutput(this.config.id, outputs);

    yield {
      event: "node_end",
      nodeId: this.config.id,
      outputs,
      timestamp: Date.now(),
    };
  }
}
