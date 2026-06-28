import { BaseNode } from "./base.node";
import { NodeType, GraphEngineEvent } from "../../types";

export class IfElseNode extends BaseNode {
  readonly nodeType: NodeType = "if-else";

  async *run(): AsyncGenerator<GraphEngineEvent> {
    const nodeId = this.config.id;
    const data = this.config.data;

    yield { event: "node_start", nodeId, nodeType: "if-else", timestamp: Date.now() };

    // Read and resolve the condition expression
    const rawCondition = (data.condition as string) || "true";
    const resolved = this.resolveTemplate(rawCondition);

    // Safe evaluation
    let result: boolean;
    try {
      result = this.evaluateCondition(resolved);
    } catch (err: any) {
      yield { event: "error", nodeId, error: `Condition evaluation failed: ${err.message}`, timestamp: Date.now() };
      return;
    }

    const branch = result ? "true" : "false";
    const outputs = { result, branch, condition: resolved };
    this.pool.setNodeOutput(nodeId, outputs);

    yield { event: "node_end", nodeId, outputs, timestamp: Date.now() };
  }

  /**
   * Safely evaluate a condition expression.
   * Supported operators: == != >= <= > < contains
   * Example: "0.8 > 0.5", '"hello" contains "ell"', 'true == true'
   */
  private evaluateCondition(expr: string): boolean {
    const trimmed = expr.trim();
    const match = trimmed.match(/^(.+?)\s*(==|!=|>=|<=|>|<|contains)\s*(.+)$/);
    if (!match) {
      throw new Error(`Invalid condition expression: "${trimmed}". Expected format: "left op right"`);
    }
    const [, leftRaw, op, rightRaw] = match;
    const left = this.parseValue(leftRaw.trim());
    const right = this.parseValue(rightRaw.trim());

    switch (op) {
      case ">":  return left > right;
      case "<":  return left < right;
      case ">=": return left >= right;
      case "<=": return left <= right;
      case "==": return left == right;
      case "!=": return left != right;
      case "contains": return String(left).includes(String(right));
      default: throw new Error(`Unknown operator: ${op}`);
    }
  }

  /**
   * Parse a string value into number, boolean, or string.
   * - Quoted strings (single/double) are stripped to bare strings
   * - "true"/"false" become booleans
   * - Numeric strings become numbers
   * - Everything else stays as string
   */
  private parseValue(raw: string): number | string | boolean {
    const trimmed = raw.trim();
    // Strip surrounding quotes
    if ((trimmed.startsWith('"') && trimmed.endsWith('"')) ||
        (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
      return trimmed.slice(1, -1);
    }
    // Booleans
    if (trimmed === "true") return true;
    if (trimmed === "false") return false;
    // Numbers
    const num = Number(trimmed);
    if (!isNaN(num) && trimmed !== "") return num;
    // Default: string
    return trimmed;
  }
}
