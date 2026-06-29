import { Controller, Get } from "@nestjs/common";

interface ModelDto {
  id: string;
  name: string;
}

const DEFAULT_MODELS: ModelDto[] = [
  { id: "gpt-4o-mini", name: "gpt-4o-mini" },
  { id: "gpt-4o", name: "gpt-4o" },
  { id: "gpt-3.5-turbo", name: "gpt-3.5-turbo" },
  { id: "kimi-latest", name: "kimi-latest" },
];

@Controller("api/models")
export class ModelController {
  @Get()
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
