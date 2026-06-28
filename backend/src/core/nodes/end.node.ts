import { BaseNode } from "./base.node";
import { NodeType, GraphEngineEvent } from "../../types";

export class EndNode extends BaseNode {
  readonly nodeType: NodeType = "end";

  async *run(): AsyncGenerator<GraphEngineEvent> {
    yield {
      event: "node_start",
      nodeId: this.config.id,
      nodeType: "end",
      timestamp: Date.now(),
    };

    const outputConfig = this.config.data.outputs as Record<string, string> | undefined;
    const outputs: Record<string, unknown> = {};

    if (outputConfig) {
      for (const [key, selector] of Object.entries(outputConfig)) {
        const resolved = this.pool.resolve(selector);
        outputs[key] = resolved !== undefined ? resolved : `{{${selector}}}`;
      }
    } else {
      outputs["result"] = "Workflow completed.";
    }

    this.pool.setNodeOutput(this.config.id, outputs);

    yield {
      event: "node_end",
      nodeId: this.config.id,
      outputs,
      timestamp: Date.now(),
    };
  }
}
