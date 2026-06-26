import { BaseNode, VariablePool } from "./base.node";
import { NodeConfig, NodeType, ExecutionContext, GraphEngineEvent } from "../../types";

/**
 * StartNode — entry point of a workflow.
 * Defines input variables that the user provides when starting the run.
 */
export class StartNode extends BaseNode {
  readonly nodeType: NodeType = "start";

  async *run(): AsyncGenerator<GraphEngineEvent> {
    yield {
      event: "node_start",
      nodeId: this.config.id,
      nodeType: "start",
      timestamp: Date.now(),
    };

    // Start node passes its inputs through as outputs
    const inputs = this.config.data.inputs as Record<string, unknown> | undefined;
    const outputs = inputs ?? {};

    this.pool.setNodeOutput(this.config.id, outputs);

    yield {
      event: "node_end",
      nodeId: this.config.id,
      outputs,
      timestamp: Date.now(),
    };
  }
}
