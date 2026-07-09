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
import { Response } from "express";
import { ConversationService } from "./conversation.service";
import { RunService } from "../run/run.service";
import { CreateConversationDto, ChatRunDto, PaginationDto } from "../../types";

@ApiTags("会话管理")
@Controller("api/conversations")
export class ConversationController {
  constructor(
    private readonly convService: ConversationService,
    private readonly runService: RunService
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
    summary: "按应用查询会话列表（分页）",
    description: "根据 appId 分页查询某个应用下的所有会话",
  })
  @ApiQuery({
    name: "appId",
    description: "应用 ID",
    required: true,
    example: "550e8400-e29b-41d4-a716-446655440000",
  })
  @ApiQuery({ name: "page", required: false, type: Number, example: 1 })
  @ApiQuery({ name: "pageSize", required: false, type: Number, example: 20 })
  @ApiResponse({ status: 200, description: "分页会话列表" })
  async findByApp(
    @Query("appId") appId: string,
    @Query() pagination: PaginationDto
  ) {
    return this.convService.findByApp(
      appId,
      pagination.page,
      pagination.pageSize
    );
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
    summary: "获取会话消息（分页）",
    description: "分页获取指定会话的所有历史消息（按时间排序）",
  })
  @ApiParam({
    name: "id",
    description: "会话 ID",
    example: "550e8400-e29b-41d4-a716-446655440002",
  })
  @ApiQuery({ name: "page", required: false, type: Number, example: 1 })
  @ApiQuery({ name: "pageSize", required: false, type: Number, example: 50 })
  @ApiResponse({ status: 200, description: "分页消息列表" })
  @ApiResponse({ status: 404, description: "会话不存在" })
  async messages(@Param("id") id: string, @Query() pagination: PaginationDto) {
    return this.convService.findMessages(
      id,
      pagination.page,
      pagination.pageSize
    );
  }

  /**
   * 在会话上下文中执行工作流。
   * 全部逻辑已下沉到 RunService.runInConversation，Controller 仅做路由委托。
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
    @Res() res: Response
  ) {
    return this.runService.runInConversation(conversationId, dto, res);
  }
}
