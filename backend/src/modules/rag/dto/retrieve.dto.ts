import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class RetrieveDto {
  @ApiProperty({ example: "550e8400-e29b-41d4-a716-446655440000" })
  appId: string;

  @ApiProperty({ example: "退款政策是什么？" })
  query: string;

  @ApiPropertyOptional({ type: [String], example: ["550e8400-e29b-41d4-a716-446655440001"] })
  datasetIds?: string[];

  @ApiPropertyOptional({ example: 4 })
  topK?: number;

  @ApiPropertyOptional({ example: 0.15 })
  scoreThreshold?: number;

  @ApiPropertyOptional({ enum: ["keyword", "semantic", "hybrid"], default: "keyword" })
  retrievalMode?: "keyword" | "semantic" | "hybrid";
}
