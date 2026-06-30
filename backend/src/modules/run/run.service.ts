import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Run } from "../../database/entities/run.entity";
import { Workflow } from "../../database/entities/workflow.entity";
import { GraphEngine } from "../../core/engine/graph-engine";
import { GraphEngineEvent, ExecutionContext } from "../../types";

type RunTerminalStatus = "completed" | "failed" | "canceled" | "timeout";

interface ActiveRun {
  controller: AbortController;
  timedOut: boolean;
}

@Injectable()
export class RunService {
  private readonly activeRuns = new Map<string, ActiveRun>();
  private readonly runTimeoutMs = 60000;

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

  async completeRun(
    runId: string,
    outputs: Record<string, unknown>,
    status: RunTerminalStatus,
    error?: string,
  ): Promise<void> {
    const run = await this.runRepo.findOneBy({ id: runId });
    if (!run) return;
    if (run.status === "canceled" || run.status === "timeout") return;
    run.status = status;
    run.outputs = outputs;
    if (error) run.errorMessage = error;
    run.finishedAt = new Date();
    await this.runRepo.save(run);
  }

  async cancelRun(runId: string): Promise<boolean> {
    const activeRun = this.activeRuns.get(runId);
    const run = await this.runRepo.findOneBy({ id: runId });
    if (!run) return false;

    if (activeRun) {
      activeRun.controller.abort(new Error("Run was canceled"));
    }

    if (run.status === "pending" || run.status === "running") {
      run.status = "canceled";
      run.errorMessage = "Run was canceled";
      run.finishedAt = new Date();
      await this.runRepo.save(run);
    }

    return true;
  }

  private makeErrorEvent(message: string, nodeId: string | null = null): GraphEngineEvent {
    return { event: "error", nodeId, nodeType: null, message, timestamp: Date.now() };
  }

  async *executeRun(
    workflowId: string,
    inputs: Record<string, unknown>,
    runId: string,
  ): AsyncGenerator<GraphEngineEvent> {
    const workflow = await this.workflowRepo.findOneBy({ id: workflowId });
    if (!workflow) {
      await this.completeRun(runId, {}, "failed", "Workflow not found");
      yield this.makeErrorEvent("Workflow not found");
      return;
    }

    // Mark running
    await this.runRepo.update(runId, { status: "running" });

    // Build context and engine
    const controller = new AbortController();
    const activeRun: ActiveRun = { controller, timedOut: false };
    this.activeRuns.set(runId, activeRun);
    const timeout = setTimeout(() => {
      activeRun.timedOut = true;
      controller.abort(new Error(`Run timed out after ${this.runTimeoutMs}ms`));
    }, this.runTimeoutMs);

    const context: ExecutionContext = {
      tenantId: "default",
      appId: workflow.appId,
      workflowId,
      userId: "anonymous",
      abortSignal: controller.signal,
    };

    // Inject run inputs into the start node
    const graph = { ...workflow.graph };
    const startNode = graph.nodes.find((n) => n.type === "start");
    if (startNode) {
      startNode.data = { ...startNode.data, inputs };
    }

    const engine = new GraphEngine(graph, context, {
      maxTimeMs: this.runTimeoutMs,
      abortSignal: controller.signal,
    });

    let finalOutputs: Record<string, unknown> = {};
    let finalStatus: RunTerminalStatus = "completed";
    let errorMsg = "";

    try {
      for await (const event of engine.run()) {
        yield event;
        if (event.event === "graph_end") {
          finalOutputs = event.outputs as Record<string, unknown>;
        }
        if (event.event === "error") {
          finalStatus = activeRun.timedOut ? "timeout" : controller.signal.aborted ? "canceled" : "failed";
          errorMsg = event.message;
        }
      }
    } finally {
      clearTimeout(timeout);
      this.activeRuns.delete(runId);
      await this.completeRun(runId, finalOutputs, finalStatus, errorMsg || undefined);
    }
  }
}
