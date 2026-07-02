import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class CreateDatasetDto {
  @ApiProperty({ example: "产品帮助中心" })
  name: string;

  @ApiPropertyOptional({ example: "客服知识库" })
  description?: string;

  @ApiPropertyOptional({ enum: ["keyword", "semantic", "hybrid"], default: "keyword" })
  retrievalMode?: "keyword" | "semantic" | "hybrid";

  @ApiPropertyOptional({ enum: ["economy", "high_quality"], default: "economy" })
  indexingMode?: "economy" | "high_quality";

  @ApiPropertyOptional({ example: 500, default: 500 })
  chunkSize?: number;

  @ApiPropertyOptional({ example: 80, default: 80 })
  chunkOverlap?: number;

  @ApiPropertyOptional({ example: 4, default: 4 })
  topK?: number;

  @ApiPropertyOptional({ example: 0.15, default: 0.15 })
  scoreThreshold?: number;
}
