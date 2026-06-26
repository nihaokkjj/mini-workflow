import { Graph, EdgeConfig, ExecutionContext, GraphEngineEvent } from "../../types";
import { BaseNode, VariablePool } from "../nodes/base.node";
import { NodeFactory } from "./node-factory";

/**
 * GraphEngine — executes a workflow DAG.
 *
 * Algorithm:
 * 1. Topological sort (Kahn's) to determine node execution order.
 * 2. Execute nodes sequentially in topological order.
 * 3. After each node runs, feed its outputs to downstream nodes via VariablePool.
 */
export class GraphEngine {
  private graph: Graph;
  private pool: VariablePool;
  private context: ExecutionContext;

  constructor(graph: Graph, context: ExecutionContext) {
    this.graph = graph;
    this.pool = new VariablePool();
    this.context = context;
  }

  /** Get a node config by ID */
  private node(id: string) {
    return this.graph.nodes.find((n) => n.id === id);
  }

  /** Compute in-degree for every node */
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

  /** Build adjacency list: nodeId → [targetNodeIds] */
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

  /** Topological sort using Kahn's algorithm */
  private topologicalSort(): string[] {
    const inDegree = this.computeInDegrees();
    const adj = this.buildAdjList();
    const queue: string[] = [];
    const result: string[] = [];

    // Find all nodes with in-degree 0
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

  /** Execute the graph and yield events */
  async *run(): AsyncGenerator<GraphEngineEvent> {
    const order = this.topologicalSort();

    for (const nodeId of order) {
      const config = this.node(nodeId);
      if (!config) continue;

      const nodeInstance: BaseNode = NodeFactory.create(config, this.pool, this.context);

      for await (const event of nodeInstance.run()) {
        yield event;
        if (event.event === "error") {
          // Stop execution on any error
          return;
        }
      }
    }

    // Collect final output from the End node (last node in order)
    const endNode = this.graph.nodes.find((n) => n.type === "end");
    const finalOutputs = endNode
      ? (this.pool.getNodeOutput(endNode.id) ?? { result: "Workflow completed" })
      : { result: "Workflow completed" };

    yield { event: "graph_end", outputs: finalOutputs, timestamp: Date.now() };
  }
}
