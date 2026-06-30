import ivm from "isolated-vm";
import { BaseNode } from "./base.node";
import { NodeType, GraphEngineEvent } from "../../types";

/** CodeNode — runs user JavaScript inside an isolated-vm sandbox with 8MB memory and 5s timeout */
export class CodeNode extends BaseNode {
  readonly nodeType: NodeType = "code";

  async *run(): AsyncGenerator<GraphEngineEvent> {
    const nodeId = this.config.id;
    yield { event: "node_start", nodeId, nodeType: "code", timestamp: Date.now() };

    const userCode = (this.config.data.code as string) || "";

    if (!userCode) {
      yield { event: "error", nodeId, nodeType: "code", message: "Code node code is empty", timestamp: Date.now() };
      return;
    }

    // Create an isolate with 8MB memory limit
    const isolate = new ivm.Isolate({ memoryLimit: 8 });
    const context = await isolate.createContext();

    try {
      // Resolve inputs from the variable pool
      const inputs = this.getInputs();

      // Set $inputs as a global inside the isolate
      await context.global.set("$inputs", new ivm.ExternalCopy(inputs).copyInto());

      // Wrap user code in an IIFE that receives $inputs as a parameter
      const wrappedCode = `(function($inputs){ ${userCode} })($inputs)`;

      // Execute with 5s timeout and copy the result out
      const rawResult = await context.eval(wrappedCode, { timeout: 5000, copy: true });

      // Copy the result out, handling ivm.Reference vs primitive
      let result: unknown;
      if (rawResult instanceof ivm.Reference) {
        result = await rawResult.copy();
        rawResult.release();
      } else {
        result = rawResult;
      }

      const outputs: Record<string, unknown> = { result };
      this.pool.setNodeOutput(nodeId, outputs);
      yield { event: "node_end", nodeId, outputs, timestamp: Date.now() };
    } catch (err: any) {
      yield { event: "error", nodeId, nodeType: "code", message: `Code execution failed: ${err.message}`, timestamp: Date.now() };
    } finally {
      // Clean up the isolate to free memory
      isolate.dispose();
    }
  }
}
