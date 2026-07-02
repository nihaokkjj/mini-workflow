import { Body, Controller, Post } from "@nestjs/common";
import { ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { RetrieveDto } from "../dto/retrieve.dto";
import { RagRetrievalOrchestrator } from "../retrieval/rag-retrieval.orchestrator";

@ApiTags("知识检索")
@Controller("api/rag")
export class RagRetrievalController {
  constructor(private readonly ragRetrieval: RagRetrievalOrchestrator) {}

  @Post("retrieve")
  @ApiOperation({ summary: "调试知识检索结果" })
  @ApiResponse({ status: 200, description: "检索结果" })
  retrieve(@Body() dto: RetrieveDto) {
    return this.ragRetrieval.retrieve(dto);
  }
}
