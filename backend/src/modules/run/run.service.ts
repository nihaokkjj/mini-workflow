import { Injectable, OnModuleInit } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { In, Repository } from "typeorm";
import { Run } from "../../database/entities/run.entity";
import { Workflow } from "../../database/entities/workflow.entity";
import { GraphEngine } from "../../core/engine/graph-engine";
import { GraphEngineEvent, ExecutionContext } from "../../types";
import { RagRetrievalOrchestrator } from "../rag/retrieval/rag-retrieval.orchestrator";

type RunTerminalStatus = "completed" | "failed" | "canceled" | "timeout";

interface ActiveRun {
  controller: AbortController;
  timedOut: boolean;
}

@Injectable()
export class RunService implements OnModuleInit {
  private readonly activeRuns = new Map<string, ActiveRun>();
  private readonly runTimeoutMs = 60000;

  constructor(
    @InjectRepository(Run)
    private readonly runRepo: Repository<Run>,
    @InjectRepository(Workflow)
    private readonly workflowRepo: Repository<Workflow>,
    private readonly ragRetrieval: RagRetrievalOrchestrator
  ) {}

  async onModuleInit(): Promise<void> {
    // Recover stale runs left in "running" state after a server restart.
    // Since the in-memory AbortController is gone, these runs can never
    // complete or be canceled — mark them as failed so they don't block
    // the user's workflow history.
    const result = await this.runRepo.update(
      { status: "running" } as any,
      {
        status: "failed",
        errorMessage: "Server restarted while run was in progress",
        finishedAt: new Date(),
      } as any
    );
    if ((result.affected ?? 0) > 0) {
      // Use console directly — NestJS logger isn't ready during OnModuleInit
      console.log(
        `[RunService] Marked ${result.affected} stale running run(s) as failed after restart`
      );
    }
  }

  async createRun(
    workflowId: string,
    inputs: Record<string, unknown>
  ): Promise<Run> {
    const run = this.runRepo.create({ workflowId, inputs, status: "pending" });
    return this.runRepo.save(run);
  }

  private updateRun(
    id: string,
    where: { status: string[] },
    data: Record<string, unknown>
  ) {
    // Thin helper to avoid fighting TypeORM's _QueryDeepPartialEntity which
    // recurses into relation properties that we never set via update().
    return this.runRepo.update(
      { id, status: In(where.status) } as any,
      data as any
    );
  }

  async completeRun(
    runId: string,
    outputs: Record<string, unknown>,
    status: RunTerminalStatus,
    error?: string
  ): Promise<void> {
    // Atomic update: only transition if the run is still in a mutable state.
    // This prevents a late completeRun from overwriting a concurrent cancelRun.
    const data: Record<string, unknown> = {
      status,
      outputs,
      finishedAt: new Date(),
    };
    if (error) data.errorMessage = error;
    await this.updateRun(runId, { status: ["pending", "running"] }, data);
  }

  async cancelRun(runId: string): Promise<boolean> {
    const activeRun = this.activeRuns.get(runId);
    if (activeRun) {
      activeRun.controller.abort(new Error("Run was canceled"));
    }

    // Atomic update: only cancel if the run is still in a mutable state.
    const result = await this.updateRun(
      runId,
      { status: ["pending", "running"] },
      {
        status: "canceled",
        errorMessage: "Run was canceled",
        finishedAt: new Date(),
      }
    );

    return (result.affected ?? 0) > 0;
  }

  private makeErrorEvent(
    message: string,
    nodeId: string | null = null
  ): GraphEngineEvent {
    return {
      event: "error",
      nodeId,
      nodeType: null,
      message,
      timestamp: Date.now(),
    };
  }

  async *executeRun(
    workflowId: string,
    inputs: Record<string, unknown>,
    runId: string
  ): AsyncGenerator<GraphEngineEvent> {
    const workflow = await this.workflowRepo.findOneBy({ id: workflowId });
    if (!workflow) {
      await this.completeRun(runId, {}, "failed", "Workflow not found");
      yield this.makeErrorEvent("Workflow not found");
      return;
    }

    // Mark running — only if still pending (guards against concurrent starts)
    await this.updateRun(runId, { status: ["pending"] }, { status: "running" });

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
      ragRuntime: {
        retrieve: (input) => this.ragRetrieval.retrieve(input),
      },
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
          finalStatus = activeRun.timedOut
            ? "timeout"
            : controller.signal.aborted
              ? "canceled"
              : "failed";
          errorMsg = event.message;
        }
      }
    } catch (err: unknown) {
      // Engine validation and node execution can still throw directly. Convert
      // those failures into the same terminal event/status path as SSE errors.
      errorMsg = err instanceof Error ? err.message : "Unknown execution error";
      finalStatus = activeRun.timedOut
        ? "timeout"
        : controller.signal.aborted
          ? "canceled"
          : "failed";
      yield this.makeErrorEvent(errorMsg);
    } finally {
      clearTimeout(timeout);
      this.activeRuns.delete(runId);
      await this.completeRun(
        runId,
        finalOutputs,
        finalStatus,
        errorMsg || undefined
      );
    }
  }
}
