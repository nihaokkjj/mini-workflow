import { Graph, EdgeConfig, ExecutionContext, GraphEngineEvent } from "../../types";
import { BaseNode, VariablePool } from "../nodes/base.node";
import { NodeFactory } from "./node-factory";

export class ExecutionLimitError extends Error {
  constructor(msg: string) { super(msg); this.name = "ExecutionLimitError"; }
}

export class GraphEngine {
  private graph: Graph;
  private pool: VariablePool;
  private context: ExecutionContext;
  private maxSteps: number;
  private maxTimeMs: number;
  private abortSignal?: AbortSignal;

  constructor(graph: Graph, context: ExecutionContext, opts?: { maxSteps?: number; maxTimeMs?: number; abortSignal?: AbortSignal }) {
    this.graph = graph;
    this.pool = new VariablePool();
    this.context = context;
    this.maxSteps = opts?.maxSteps ?? 50;
    this.maxTimeMs = opts?.maxTimeMs ?? 30000;
    this.abortSignal = opts?.abortSignal ?? context.abortSignal;
  }

  private node(id: string) {
    return this.graph.nodes.find((n) => n.id === id);
  }

  private computeInDegrees(): Map<string, number> {
    const inDegree = new Map<string, number>();
    for (const node of this.graph.nodes) {
      inDegree.set(node.id, 0);
    }
    for (const edge of this.graph.edges) {
      inDegree.set(edge.target, (inDegree.get(edge.target) ?? 0) + 1);
    }
    return inDegree;
  }

  private buildAdjList(): Map<string, string[]> {
    const adj = new Map<string, string[]>();
    for (const node of this.graph.nodes) {
      adj.set(node.id, []);
    }
    for (const edge of this.graph.edges) {
      const list = adj.get(edge.source) ?? [];
      list.push(edge.target);
      adj.set(edge.source, list);
    }
    return adj;
  }

  private topologicalSort(): string[] {
    const inDegree = this.computeInDegrees();
    const adj = this.buildAdjList();
    const queue: string[] = [];
    const result: string[] = [];

    for (const [nodeId, degree] of inDegree) {
      if (degree === 0) queue.push(nodeId);
    }

    while (queue.length > 0) {
      const current = queue.shift()!;
      result.push(current);
      for (const neighbor of adj.get(current) ?? []) {
        const newDeg = (inDegree.get(neighbor) ?? 1) - 1;
        inDegree.set(neighbor, newDeg);
        if (newDeg === 0) queue.push(neighbor);
      }
    }

    if (result.length !== this.graph.nodes.length) {
      throw new Error("Cycle detected in workflow graph");
    }
    return result;
  }

  /** Validate the graph structure. Returns null if valid, error message otherwise. */
  validate(): string | null {
    const { nodes, edges } = this.graph;

    // 1. Exactly one Start node
    const startNodes = nodes.filter((n) => n.type === "start");
    if (startNodes.length === 0) return "Workflow must have exactly 1 Start node (found 0)";
    if (startNodes.length > 1) return `Workflow must have exactly 1 Start node (found ${startNodes.length})`;

    // 2. At least one End node
    const endNodes = nodes.filter((n) => n.type === "end");
    if (endNodes.length === 0) return "Workflow must have at least 1 End node";

    // 3. Non-Start nodes must have incoming edges
    const hasIncoming = new Set(edges.map((e) => e.target));
    for (const n of nodes) {
      if (n.type === "start") continue;
      if (!hasIncoming.has(n.id)) {
        return `Node "${n.id}" (type: ${n.type}) has no incoming edge — isolated nodes are not allowed`;
      }
    }

    // 4. All node types must be registered
    for (const n of nodes) {
      if (!NodeFactory.has(n.type)) {
        return `Unknown node type: "${n.type}" on node "${n.id}"`;
      }
    }

    return null;
  }

  /** Compute which downstream nodes should execute based on branch routing. */
  private getActiveTargets(sourceNodeId: string): Set<string> {
    const sourceOutputs = this.pool.getNodeOutput(sourceNodeId);
    const active = new Set<string>();

    for (const edge of this.graph.edges) {
      if (edge.source !== sourceNodeId) continue;

      if (sourceOutputs?.branch) {
        // Branch node: only follow edges matching the branch value
        if (edge.sourceHandle === sourceOutputs.branch) {
          active.add(edge.target);
        }
      } else {
        // Non-branch node: follow all downstream edges
        active.add(edge.target);
      }
    }
    return active;
  }

  /** Find all nodes reachable from a given set of starting nodes */
  private reachable(startNodes: Set<string>): Set<string> {
    const adj = this.buildAdjList();
    const visited = new Set<string>();
    const queue = [...startNodes];
    while (queue.length > 0) {
      const current = queue.shift()!;
      if (visited.has(current)) continue;
      visited.add(current);
      for (const neighbor of adj.get(current) ?? []) {
        if (!visited.has(neighbor)) queue.push(neighbor);
      }
    }
    return visited;
  }

  private abortMessage(): string | null {
    if (!this.abortSignal?.aborted) return null;
    const reason = this.abortSignal.reason;
    if (reason instanceof Error) return reason.message;
    if (typeof reason === "string") return reason;
    return "Run was canceled";
  }

  async *run(): AsyncGenerator<GraphEngineEvent> {
    // Validate before execution
    const validationError = this.validate();
    if (validationError) {
      yield { event: "error", nodeId: null, nodeType: null, message: validationError, timestamp: Date.now() };
      return;
    }

    const order = this.topologicalSort();
    const skipped = new Set<string>();
    let stepCount = 0;
    const startTime = Date.now();

    for (const nodeId of order) {
      const abortMessage = this.abortMessage();
      if (abortMessage) {
        yield { event: "error", nodeId: null, nodeType: null, message: abortMessage, timestamp: Date.now() };
        return;
      }

      // Execution limits
      stepCount++;
      if (stepCount > this.maxSteps) {
        yield { event: "error", nodeId: null, nodeType: null, message: `Execution limit reached: max ${this.maxSteps} steps`, timestamp: Date.now() };
        return;
      }
      if (Date.now() - startTime > this.maxTimeMs) {
        yield { event: "error", nodeId: null, nodeType: null, message: `Execution timeout after ${this.maxTimeMs}ms`, timestamp: Date.now() };
        return;
      }

      // Skip nodes on inactive branches
      if (skipped.has(nodeId)) continue;

      const config = this.node(nodeId);
      if (!config) continue;

      const nodeInstance: BaseNode = NodeFactory.create(config, this.pool, this.context);

      for await (const event of nodeInstance.run()) {
        if (event.event === "error") {
          yield event;
          return;
        }
        yield event;

        const nodeAbortMessage = this.abortMessage();
        if (nodeAbortMessage) {
          yield { event: "error", nodeId, nodeType: config.type, message: nodeAbortMessage, timestamp: Date.now() };
          return;
        }
      }

      // After branch node execution: mark only nodes reachable exclusively from
      // inactive branches. Shared downstream nodes, such as a merged End node,
      // must still run when the active branch reaches them.
      const nodeConfig = this.node(nodeId);
      if (nodeConfig?.type === "if-else") {
        const sourceOutputs = this.pool.getNodeOutput(nodeId);
        if (sourceOutputs?.branch) {
          const activeTargets = this.getActiveTargets(nodeId);
          const inactiveTargets = new Set<string>();
          for (const edge of this.graph.edges) {
            if (edge.source !== nodeId) continue;
            if (edge.sourceHandle !== sourceOutputs.branch) {
              inactiveTargets.add(edge.target);
            }
          }

          if (inactiveTargets.size > 0) {
            const inactiveSubgraph = this.reachable(inactiveTargets);
            const activeSubgraph = this.reachable(activeTargets);
            for (const skippedId of inactiveSubgraph) {
              if (activeSubgraph.has(skippedId)) continue;
              skipped.add(skippedId);
              yield { event: "node_skipped", nodeId: skippedId, reason: "Branch not taken", timestamp: Date.now() };
            }
          }
        }
      }
    }

    // Collect final output from End nodes
    const endNode = this.graph.nodes.find((n) => n.type === "end");
    const endOutputs = endNode
      ? (this.pool.getNodeOutput(endNode.id) ?? { result: "Workflow completed" })
      : { result: "Workflow completed" };

    yield { event: "graph_end", outputs: endOutputs, timestamp: Date.now() };
  }
}
