import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  Query,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
} from "@nestjs/swagger";
import { AppService } from "./app.service";
import { CreateAppDto, PaginationDto } from "../../types";

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
    summary: "获取所有应用（分页）",
    description: "分页返回应用列表，支持 page 和 pageSize 参数",
  })
  @ApiQuery({ name: "page", required: false, type: Number, example: 1 })
  @ApiQuery({ name: "pageSize", required: false, type: Number, example: 20 })
  @ApiResponse({ status: 200, description: "分页应用列表" })
  findAll(@Query() pagination: PaginationDto) {
    return this.service.findAll(pagination.page, pagination.pageSize);
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
