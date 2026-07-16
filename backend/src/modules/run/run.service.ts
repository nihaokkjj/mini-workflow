import { Injectable, OnModuleInit } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { In, Repository } from "typeorm";
import { Response } from "express";
import { Run } from "../../database/entities/run.entity";
import { Workflow } from "../../database/entities/workflow.entity";
import { Conversation } from "../../database/entities/conversation.entity";
import { Message } from "../../database/entities/message.entity";
import { GraphEngine } from "../../core/engine/graph-engine";
import { GraphEngineEvent, ExecutionContext, ChatRunDto } from "../../types";
import { RagRetrievalOrchestrator } from "../rag/retrieval/rag-retrieval.orchestrator";
import { decryptGraphSensitiveFields } from "../../common/crypto/graph-crypto";
import {
  setupSSE,
  pipeSSEStream,
  writeSSEEvent,
  writeSSEError,
} from "../../common/sse/sse.helper";

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
    @InjectRepository(Conversation)
    private readonly convRepo: Repository<Conversation>,
    @InjectRepository(Message)
    private readonly msgRepo: Repository<Message>,
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

  async findRun(runId: string): Promise<Run | null> {
    return this.runRepo.findOneBy({ id: runId });
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

    // 只有 pending run 能进入执行，避免取消请求抢先落库后引擎仍继续运行。
    const startResult = await this.updateRun(
      runId,
      { status: ["pending"] },
      { status: "running" }
    );
    if ((startResult.affected ?? 0) === 0) {
      yield this.makeErrorEvent("Run was canceled");
      return;
    }

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
    decryptGraphSensitiveFields(graph);
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

  /**
   * 保存一条消息到指定会话。
   * RunService 持有 msgRepo 后无需再通过 ConversationService 中转。
   */
  async saveMessage(
    conversationId: string,
    role: "user" | "assistant" | "system",
    content: string,
    nodeId?: string
  ): Promise<Message> {
    const msg = this.msgRepo.create({ conversationId, role, content, nodeId });
    return this.msgRepo.save(msg);
  }

  /**
   * 在会话上下文中执行工作流 — 深度方法，吸收校验、消息持久化和 SSE 流式推送。
   *
   * Controller 只需调用这一个接口，不再需要注入裸仓库或手动管理 SSE 生命周期。
   * 返回前已将用户消息和助手回复写入数据库。
   */
  async runInConversation(
    conversationId: string,
    dto: ChatRunDto,
    res: Response
  ): Promise<void> {
    setupSSE(res);

    // 校验会话是否存在
    const conversation = await this.convRepo.findOneBy({ id: conversationId });
    if (!conversation) {
      writeSSEError(res, "Conversation not found");
      return;
    }

    // 校验工作流是否存在且属于同一应用
    const workflow = await this.workflowRepo.findOneBy({ id: dto.workflowId });
    if (!workflow) {
      writeSSEError(res, "Workflow not found");
      return;
    }
    if (workflow.appId !== conversation.appId) {
      writeSSEError(
        res,
        "Workflow does not belong to the same app as the conversation"
      );
      return;
    }

    // 持久化用户输入消息
    const userContent =
      (dto.inputs.query as string) ?? JSON.stringify(dto.inputs);
    await this.saveMessage(conversationId, "user", userContent);

    // 创建运行记录并流式推送执行事件
    const run = await this.createRun(dto.workflowId, dto.inputs);
    let assistantContent: string | undefined;

    // 会话流是单请求协议，先把 runId 发给前端，停止时才能取消后端执行。
    writeSSEEvent(res, {
      event: "run_started",
      runId: run.id,
      timestamp: Date.now(),
    });

    await pipeSSEStream(
      res,
      this.executeRun(dto.workflowId, dto.inputs, run.id),
      (outputs) => {
        assistantContent =
          (outputs.answer as string) ??
          (outputs.result as string) ??
          JSON.stringify(outputs);
      }
    );

    // 流式推送结束后持久化助手回复
    if (assistantContent) {
      try {
        await this.saveMessage(conversationId, "assistant", assistantContent);
      } catch (err: unknown) {
        const message =
          err instanceof Error
            ? err.message
            : "Failed to save assistant message";
        res.write(
          `event: error\ndata: ${JSON.stringify({ event: "error", nodeId: null, nodeType: null, message, timestamp: Date.now() })}\n\n`
        );
      }
    }
  }
}
