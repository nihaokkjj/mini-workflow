import { Controller, Get } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse } from "@nestjs/swagger";

interface ModelDto {
  id: string;
  name: string;
}

const DEFAULT_MODELS: ModelDto[] = [
  { id: "deepseek-chat", name: "DeepSeek-Chat" },
  { id: "deepseek-reasoner", name: "DeepSeek-Reasoner" },
  { id: "kimi-latest", name: "kimi-latest" },
  { id: "gpt-5.4", name: "GPT-5.4" },
];

@ApiTags("模型管理")
@Controller("api/models")
export class ModelController {
  @Get()
  @ApiOperation({
    summary: "获取可用模型列表",
    description:
      "返回当前环境可用的 LLM 模型列表。" +
      "默认返回 kimi-latest，可通过环境变量 MODELS 自定义（JSON 数组格式）。",
  })
  @ApiResponse({
    status: 200,
    description: "模型列表",
    schema: {
      example: [
        { id: "kimi-latest", name: "kimi-latest" },
        { id: "gpt-4o-mini", name: "gpt-4o-mini" },
      ],
    },
  })
  list(): ModelDto[] {
    const env = process.env.MODELS;
    if (env) {
      try {
        return JSON.parse(env) as ModelDto[];
      } catch {
        // fall through
      }
    }
    return DEFAULT_MODELS;
  }
}
