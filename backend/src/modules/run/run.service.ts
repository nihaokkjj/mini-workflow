import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Run } from "../../database/entities/run.entity";
import { Workflow } from "../../database/entities/workflow.entity";
import { GraphEngine } from "../../core/engine/graph-engine";
import { GraphEngineEvent, ExecutionContext } from "../../types";

@Injectable()
export class RunService {
  constructor(
    @InjectRepository(Run)
    private readonly runRepo: Repository<Run>,
    @InjectRepository(Workflow)
    private readonly workflowRepo: Repository<Workflow>,
  ) {}

  async createRun(workflowId: string, inputs: Record<string, unknown>): Promise<Run> {
    const run = this.runRepo.create({ workflowId, inputs, status: "pending" });
    return this.runRepo.save(run);
  }

  async completeRun(runId: string, outputs: Record<string, unknown>, error?: string): Promise<void> {
    const run = await this.runRepo.findOneBy({ id: runId });
    if (!run) return;
    run.status = error ? "failed" : "completed";
    run.outputs = outputs;
    if (error) run.errorMessage = error;
    run.finishedAt = new Date();
    await this.runRepo.save(run);
  }

  async *executeRun(
    workflowId: string,
    inputs: Record<string, unknown>,
    runId: string,
  ): AsyncGenerator<GraphEngineEvent> {
    const workflow = await this.workflowRepo.findOneBy({ id: workflowId });
    if (!workflow) {
      yield { event: "error", nodeId: null, error: "Workflow not found", timestamp: Date.now() };
      return;
    }

    // Mark running
    await this.runRepo.update(runId, { status: "running" });

    // Build context and engine
    const context: ExecutionContext = {
      tenantId: "default",
      appId: workflow.appId,
      workflowId,
      userId: "anonymous",
    };

    // Inject run inputs into the start node
    const graph = { ...workflow.graph };
    const startNode = graph.nodes.find((n) => n.type === "start");
    if (startNode) {
      startNode.data = { ...startNode.data, inputs };
    }

    const engine = new GraphEngine(graph, context);

    let finalOutputs: Record<string, unknown> = {};
    let hasError = false;
    let errorMsg = "";

    try {
      for await (const event of engine.run()) {
        yield event;
        if (event.event === "graph_end") {
          finalOutputs = event.outputs as Record<string, unknown>;
        }
        if (event.event === "error") {
          hasError = true;
          errorMsg = event.error;
        }
      }
    } finally {
      await this.completeRun(runId, finalOutputs, hasError ? errorMsg : undefined);
    }
  }
}
