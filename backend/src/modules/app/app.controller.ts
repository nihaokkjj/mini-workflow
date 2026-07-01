import { Controller, Get, Post, Delete, Param, Body } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiParam, ApiResponse } from "@nestjs/swagger";
import { AppService } from "./app.service";
import { CreateAppDto } from "../../types";

@ApiTags("应用管理")
@Controller("api/apps")
export class AppController {
  constructor(private readonly service: AppService) {}

  @Post()
  @ApiOperation({
    summary: "创建应用",
    description: "创建一个新的应用（Chat 或 Workflow 模式）",
  })
  @ApiResponse({ status: 201, description: "应用创建成功" })
  @ApiResponse({ status: 400, description: "请求参数错误" })
  create(@Body() dto: CreateAppDto) {
    return this.service.create(dto);
  }

  @Get()
  @ApiOperation({
    summary: "获取所有应用",
    description: "返回所有已创建的应用列表",
  })
  @ApiResponse({ status: 200, description: "应用列表" })
  findAll() {
    return this.service.findAll();
  }

  @Get(":id")
  @ApiOperation({
    summary: "获取单个应用",
    description: "根据 ID 获取应用详情",
  })
  @ApiParam({
    name: "id",
    description: "应用 ID",
    example: "550e8400-e29b-41d4-a716-446655440000",
  })
  @ApiResponse({ status: 200, description: "应用详情" })
  @ApiResponse({ status: 404, description: "应用不存在" })
  findOne(@Param("id") id: string) {
    return this.service.findById(id);
  }

  @Delete(":id")
  @ApiOperation({
    summary: "删除应用",
    description: "根据 ID 删除一个应用及其关联的工作流和会话",
  })
  @ApiParam({
    name: "id",
    description: "应用 ID",
    example: "550e8400-e29b-41d4-a716-446655440000",
  })
  @ApiResponse({ status: 200, description: "删除成功" })
  @ApiResponse({ status: 404, description: "应用不存在" })
  remove(@Param("id") id: string) {
    return this.service.delete(id);
  }
}
