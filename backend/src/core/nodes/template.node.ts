import { BaseNode } from "./base.node";
import { NodeType, GraphEngineEvent } from "../../types";

/** TemplateNode — resolves {{variable}} syntax using resolveTemplate() and yields the result */
export class TemplateNode extends BaseNode {
  readonly nodeType: NodeType = "template";

  async *run(): AsyncGenerator<GraphEngineEvent> {
    const nodeId = this.config.id;
    yield { event: "node_start", nodeId, nodeType: "template", timestamp: Date.now() };

    const rawTemplate = (this.config.data.template as string) || "";

    if (!rawTemplate) {
      yield { event: "error", nodeId, nodeType: "template", message: "Template node template is empty", timestamp: Date.now() };
      return;
    }

    const resolved = this.resolveTemplate(rawTemplate);

    const outputs: Record<string, unknown> = { text: resolved };
    this.pool.setNodeOutput(nodeId, outputs);
    yield { event: "node_end", nodeId, outputs, timestamp: Date.now() };
  }
}
