import { Controller, Get, Put, Param, Body } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiParam, ApiResponse } from "@nestjs/swagger";
import { WorkflowService } from "./workflow.service";
import { SaveWorkflowDto } from "../../types";

@ApiTags("工作流管理")
@Controller("api/workflows")
export class WorkflowController {
  constructor(private readonly service: WorkflowService) {}

  @Put("by-app/:appId")
  @ApiOperation({
    summary: "保存工作流",
    description:
      "为指定应用创建或更新工作流。如果该应用已有工作流则覆盖更新，否则新建。",
  })
  @ApiParam({
    name: "appId",
    description: "应用 ID",
    example: "550e8400-e29b-41d4-a716-446655440000",
  })
  @ApiResponse({ status: 200, description: "工作流保存成功" })
  @ApiResponse({ status: 404, description: "应用不存在" })
  save(@Param("appId") appId: string, @Body() dto: SaveWorkflowDto) {
    return this.service.createOrUpdate(appId, dto.graph);
  }

  @Get("by-app/:appId")
  @ApiOperation({
    summary: "按应用查询工作流",
    description: "根据应用 ID 获取该应用关联的工作流",
  })
  @ApiParam({
    name: "appId",
    description: "应用 ID",
    example: "550e8400-e29b-41d4-a716-446655440000",
  })
  @ApiResponse({ status: 200, description: "工作流详情" })
  @ApiResponse({ status: 404, description: "工作流不存在" })
  findByApp(@Param("appId") appId: string) {
    return this.service.findByAppId(appId);
  }

  @Get(":id")
  @ApiOperation({
    summary: "获取工作流",
    description: "根据工作流 ID 获取工作流详情",
  })
  @ApiParam({
    name: "id",
    description: "工作流 ID",
    example: "550e8400-e29b-41d4-a716-446655440001",
  })
  @ApiResponse({ status: 200, description: "工作流详情" })
  @ApiResponse({ status: 404, description: "工作流不存在" })
  findOne(@Param("id") id: string) {
    return this.service.findById(id);
  }
}
