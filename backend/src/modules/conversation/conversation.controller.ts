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
import {
  ApiTags,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
} from "@nestjs/swagger";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Response } from "express";
import { ConversationService } from "./conversation.service";
import { RunService } from "../run/run.service";
import { Conversation } from "../../database/entities/conversation.entity";
import { Workflow } from "../../database/entities/workflow.entity";
import { CreateConversationDto, ChatRunDto } from "../../types";

@ApiTags("会话管理")
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
  @ApiOperation({
    summary: "创建会话",
    description: "为指定应用创建一个新的对话会话",
  })
  @ApiResponse({ status: 201, description: "会话创建成功" })
  @ApiResponse({ status: 404, description: "应用不存在" })
  async create(@Body() dto: CreateConversationDto) {
    return this.convService.create(dto.appId);
  }

  @Get(":id")
  @ApiOperation({
    summary: "获取会话详情",
    description: "根据 ID 获取会话的详细信息",
  })
  @ApiParam({
    name: "id",
    description: "会话 ID",
    example: "550e8400-e29b-41d4-a716-446655440002",
  })
  @ApiResponse({ status: 200, description: "会话详情" })
  @ApiResponse({ status: 404, description: "会话不存在" })
  async findOne(@Param("id") id: string) {
    return this.convService.findOne(id);
  }

  @Get()
  @ApiOperation({
    summary: "按应用查询会话列表",
    description: "根据 appId 查询某个应用下的所有会话",
  })
  @ApiQuery({
    name: "appId",
    description: "应用 ID",
    required: true,
    example: "550e8400-e29b-41d4-a716-446655440000",
  })
  @ApiResponse({ status: 200, description: "会话列表" })
  async findByApp(@Query("appId") appId: string) {
    return this.convService.findByApp(appId);
  }

  @Delete(":id")
  @ApiOperation({
    summary: "删除会话",
    description: "根据 ID 删除会话及其关联的消息",
  })
  @ApiParam({
    name: "id",
    description: "会话 ID",
    example: "550e8400-e29b-41d4-a716-446655440002",
  })
  @ApiResponse({ status: 200, description: "删除成功" })
  @ApiResponse({ status: 404, description: "会话不存在" })
  async delete(@Param("id") id: string) {
    await this.convService.delete(id);
    return { success: true };
  }

  @Get(":id/messages")
  @ApiOperation({
    summary: "获取会话消息",
    description: "获取指定会话的所有历史消息（按时间排序）",
  })
  @ApiParam({
    name: "id",
    description: "会话 ID",
    example: "550e8400-e29b-41d4-a716-446655440002",
  })
  @ApiResponse({ status: 200, description: "消息列表" })
  @ApiResponse({ status: 404, description: "会话不存在" })
  async messages(@Param("id") id: string) {
    return this.convService.findMessages(id);
  }

  /**
   * Execute a workflow run in the context of a conversation.
   * Streams SSE events and auto-saves user/assistant messages.
   */
  @Post(":id/runs")
  @ApiOperation({
    summary: "在会话中执行工作流",
    description:
      "在指定会话中启动工作流执行，通过 SSE（Server-Sent Events）实时推送执行过程。" +
      "返回的事件类型包括：node_start（节点开始）、node_chunk（LLM 流式输出）、" +
      "node_end（节点完成）、graph_end（工作流结束）、error（错误）。",
  })
  @ApiParam({
    name: "id",
    description: "会话 ID",
    example: "550e8400-e29b-41d4-a716-446655440002",
  })
  @ApiResponse({
    status: 200,
    description: "SSE 事件流（text/event-stream）",
  })
  @ApiResponse({ status: 404, description: "会话或工作流不存在" })
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
        try {
          // Persist the final assistant text after streaming completes so a
          // storage failure does not hide the original run outcome.
          await this.convService.saveMessage(conversationId, "assistant", assistantContent);
        } catch (err: unknown) {
          const message =
            err instanceof Error ? err.message : "Failed to save assistant message";
          res.write(
            `event: error\ndata: ${JSON.stringify({ event: "error", nodeId: null, nodeType: null, message, timestamp: Date.now() })}\n\n`,
          );
        }
      }
      res.end();
    }
  }
}
