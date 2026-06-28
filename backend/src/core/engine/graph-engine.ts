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

  constructor(graph: Graph, context: ExecutionContext, opts?: { maxSteps?: number; maxTimeMs?: number }) {
    this.graph = graph;
    this.pool = new VariablePool();
    this.context = context;
    this.maxSteps = opts?.maxSteps ?? 50;
    this.maxTimeMs = opts?.maxTimeMs ?? 30000;
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

  async *run(): AsyncGenerator<GraphEngineEvent> {
    // Validate before execution
    const validationError = this.validate();
    if (validationError) {
      yield { event: "error", nodeId: null, error: validationError, timestamp: Date.now() };
      return;
    }

    const order = this.topologicalSort();
    const skipped = new Set<string>();
    let stepCount = 0;
    const startTime = Date.now();

    for (const nodeId of order) {
      // Execution limits
      stepCount++;
      if (stepCount > this.maxSteps) {
        yield { event: "error", nodeId: null, error: `Execution limit reached: max ${this.maxSteps} steps`, timestamp: Date.now() };
        return;
      }
      if (Date.now() - startTime > this.maxTimeMs) {
        yield { event: "error", nodeId: null, error: `Execution timeout after ${this.maxTimeMs}ms`, timestamp: Date.now() };
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
      }

      // After branch node execution: mark the entire inactive subgraph as skipped
      const nodeConfig = this.node(nodeId);
      if (nodeConfig?.type === "if-else") {
        const sourceOutputs = this.pool.getNodeOutput(nodeId);
        if (sourceOutputs?.branch) {
          // Find all edges from this node that are NOT on the taken branch
          const inactiveTargets = new Set<string>();
          for (const edge of this.graph.edges) {
            if (edge.source !== nodeId) continue;
            if (edge.sourceHandle !== sourceOutputs.branch) {
              inactiveTargets.add(edge.target);
            }
          }
          // Mark the entire subgraph reachable from inactive targets as skipped
          if (inactiveTargets.size > 0) {
            const inactiveSubgraph = this.reachable(inactiveTargets);
            for (const skippedId of inactiveSubgraph) {
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
