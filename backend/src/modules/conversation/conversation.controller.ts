import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  Res,
  Query,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Response } from "express";
import { ConversationService } from "./conversation.service";
import { RunService } from "../run/run.service";
import { Conversation } from "../../database/entities/conversation.entity";
import { Workflow } from "../../database/entities/workflow.entity";
import { CreateConversationDto, ChatRunDto } from "../../types";

@Controller("api/conversations")
export class ConversationController {
  constructor(
    private readonly convService: ConversationService,
    private readonly runService: RunService,
    @InjectRepository(Conversation)
    private readonly convRepo: Repository<Conversation>,
    @InjectRepository(Workflow)
    private readonly workflowRepo: Repository<Workflow>,
  ) {}

  @Post()
  async create(@Body() dto: CreateConversationDto) {
    return this.convService.create(dto.appId);
  }

  @Get(":id")
  async findOne(@Param("id") id: string) {
    return this.convService.findOne(id);
  }

  @Get()
  async findByApp(@Query("appId") appId: string) {
    return this.convService.findByApp(appId);
  }

  @Delete(":id")
  async delete(@Param("id") id: string) {
    await this.convService.delete(id);
    return { success: true };
  }

  @Get(":id/messages")
  async messages(@Param("id") id: string) {
    return this.convService.findMessages(id);
  }

  /**
   * Execute a workflow run in the context of a conversation.
   * Streams SSE events and auto-saves user/assistant messages.
   */
  @Post(":id/runs")
  async chatRun(
    @Param("id") conversationId: string,
    @Body() dto: ChatRunDto,
    @Res() res: Response,
  ) {
    // Set SSE headers
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");
    res.flushHeaders();

    let assistantContent: string | undefined;

    try {
      // Validate conversation exists
      const conversation = await this.convRepo.findOneBy({
        id: conversationId,
      });
      if (!conversation) {
        res.write(
          `event: error\ndata: ${JSON.stringify({ event: "error", nodeId: null, nodeType: null, message: "Conversation not found", timestamp: Date.now() })}\n\n`,
        );
        res.end();
        return;
      }

      // Validate workflow exists and belongs to the same app
      const workflow = await this.workflowRepo.findOneBy({
        id: dto.workflowId,
      });
      if (!workflow) {
        res.write(
          `event: error\ndata: ${JSON.stringify({ event: "error", nodeId: null, nodeType: null, message: "Workflow not found", timestamp: Date.now() })}\n\n`,
        );
        res.end();
        return;
      }
      if (workflow.appId !== conversation.appId) {
        res.write(
          `event: error\ndata: ${JSON.stringify({ event: "error", nodeId: null, nodeType: null, message: "Workflow does not belong to the same app as the conversation", timestamp: Date.now() })}\n\n`,
        );
        res.end();
        return;
      }

      // Save user message
      const userContent =
        (dto.inputs.query as string) ?? JSON.stringify(dto.inputs);
      await this.convService.saveMessage(conversationId, "user", userContent);

      // Create run and stream execution events
      const run = await this.runService.createRun(dto.workflowId, dto.inputs);

      for await (const event of this.runService.executeRun(
        dto.workflowId,
        dto.inputs,
        run.id,
      )) {
        res.write(
          `event: ${event.event}\ndata: ${JSON.stringify(event)}\n\n`,
        );

        // On graph_end, capture assistant content for saving later
        if (event.event === "graph_end") {
          const outputs = event.outputs as Record<string, unknown>;
          assistantContent =
            (outputs.answer as string) ??
            (outputs.result as string) ??
            JSON.stringify(outputs);
        }
      }
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Unknown execution error";
      res.write(
        `event: error\ndata: ${JSON.stringify({ event: "error", nodeId: null, nodeType: null, message, timestamp: Date.now() })}\n\n`,
      );
    } finally {
      if (assistantContent) {
        await this.convService.saveMessage(conversationId, "assistant", assistantContent);
      }
      res.end();
    }
  }
}
