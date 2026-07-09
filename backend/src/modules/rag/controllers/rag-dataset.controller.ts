import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  UploadedFile,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import {
  ApiConsumes,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import { createMulterOptions } from "../../../common/upload/multer.config";
import { CreateDatasetDto } from "../dto/create-dataset.dto";
import { CreateDocumentDto } from "../dto/create-document.dto";
import { RagDatasetService } from "../services/rag-dataset.service";

@ApiTags("知识库管理")
@Controller("api")
export class RagDatasetController {
  constructor(private readonly ragDatasetService: RagDatasetService) {}

  @Post("rag/datasets")
  @ApiOperation({ summary: "创建知识库" })
  @ApiResponse({ status: 201, description: "知识库创建成功" })
  createDataset(@Body() dto: CreateDatasetDto) {
    return this.ragDatasetService.createDataset(dto);
  }

  @Get("rag/datasets")
  @ApiOperation({ summary: "获取知识库列表" })
  listDatasets() {
    return this.ragDatasetService.listDatasets();
  }

  @Get("rag/datasets/:id")
  @ApiOperation({ summary: "获取知识库详情" })
  @ApiParam({ name: "id", example: "550e8400-e29b-41d4-a716-446655440010" })
  getDataset(@Param("id") id: string) {
    return this.ragDatasetService.getDataset(id);
  }

  @Post("rag/datasets/:id/documents")
  @ApiOperation({ summary: "向知识库添加文档并建立索引" })
  @ApiParam({ name: "id", example: "550e8400-e29b-41d4-a716-446655440010" })
  createDocument(
    @Param("id") datasetId: string,
    @Body() dto: CreateDocumentDto
  ) {
    return this.ragDatasetService.createDocument(datasetId, dto);
  }

  @Post("rag/datasets/:id/documents/upload")
  @ApiOperation({ summary: "上传文件到知识库" })
  @ApiParam({ name: "id", example: "550e8400-e29b-41d4-a716-446655440010" })
  @ApiConsumes("multipart/form-data")
  @UseInterceptors(FileInterceptor("file", createMulterOptions()))
  async uploadDocument(
    @Param("id") datasetId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body("name") name?: string
  ) {
    return this.ragDatasetService.uploadDocument(datasetId, name, file);
  }

  @Get("rag/datasets/:id/documents")
  @ApiOperation({ summary: "列出知识库文档" })
  @ApiParam({ name: "id", example: "550e8400-e29b-41d4-a716-446655440010" })
  listDocuments(@Param("id") datasetId: string) {
    return this.ragDatasetService.listDocuments(datasetId);
  }

  @Post("apps/:appId/datasets/:datasetId")
  @ApiOperation({ summary: "将知识库绑定到应用" })
  bindDataset(
    @Param("appId") appId: string,
    @Param("datasetId") datasetId: string
  ) {
    return this.ragDatasetService.bindDataset(appId, datasetId);
  }

  @Get("apps/:appId/datasets")
  @ApiOperation({ summary: "获取应用已绑定知识库" })
  listBindings(@Param("appId") appId: string) {
    return this.ragDatasetService.listAppBindings(appId);
  }

  @Delete("apps/:appId/datasets/:datasetId")
  @ApiOperation({ summary: "解除应用与知识库绑定" })
  removeBinding(
    @Param("appId") appId: string,
    @Param("datasetId") datasetId: string
  ) {
    return this.ragDatasetService.unbindDataset(appId, datasetId);
  }
}
