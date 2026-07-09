import { Controller, Post, Get, Body, Param, Res } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiParam, ApiResponse } from "@nestjs/swagger";
import { Response } from "express";
import { RunService } from "./run.service";
import { RunWorkflowDto } from "../../types";
import {
  setupSSE,
  pipeSSEStream,
  writeSSEError,
} from "../../common/sse/sse.helper";

@ApiTags("运行管理")
@Controller("api/runs")
export class RunController {
  constructor(private readonly service: RunService) {}

  @Post()
  @ApiOperation({
    summary: "创建运行",
    description: "启动一个新的工作流运行，返回 runId 用于后续获取执行流",
  })
  @ApiResponse({
    status: 201,
    description: "运行创建成功，返回 runId",
    schema: {
      example: { runId: "550e8400-e29b-41d4-a716-446655440003" },
    },
  })
  @ApiResponse({ status: 404, description: "工作流不存在" })
  async startRun(@Body() dto: RunWorkflowDto) {
    const run = await this.service.createRun(dto.workflowId, dto.inputs);
    return { runId: run.id };
  }

  @Post(":runId/cancel")
  @ApiOperation({
    summary: "取消运行",
    description: "取消一个正在执行的工作流运行",
  })
  @ApiParam({
    name: "runId",
    description: "运行 ID",
    example: "550e8400-e29b-41d4-a716-446655440003",
  })
  @ApiResponse({ status: 200, description: "取消成功" })
  @ApiResponse({ status: 404, description: "运行不存在" })
  async cancel(@Param("runId") runId: string) {
    const canceled = await this.service.cancelRun(runId);
    return { canceled };
  }

  @Get(":runId/stream")
  @ApiOperation({
    summary: "获取运行事件流",
    description:
      "通过 SSE（Server-Sent Events）实时获取工作流执行的每个节点事件。" +
      "返回事件类型包括：node_start、node_chunk、node_end、graph_end、error。",
  })
  @ApiParam({
    name: "runId",
    description: "运行 ID",
    example: "550e8400-e29b-41d4-a716-446655440003",
  })
  @ApiResponse({
    status: 200,
    description: "SSE 事件流（text/event-stream）",
  })
  @ApiResponse({ status: 404, description: "运行不存在" })
  async stream(@Param("runId") runId: string, @Res() res: Response) {
    setupSSE(res);

    const run = await this.service.findRun(runId);
    if (!run) {
      writeSSEError(res, "Run not found");
      return;
    }

    const stream = this.service.executeRun(
      run.workflowId,
      (run.inputs as Record<string, unknown>) ?? {},
      runId
    );
    await pipeSSEStream(res, stream);
  }
}
