import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsString,
  IsOptional,
  IsIn,
  IsInt,
  Min,
  Max,
  IsNumber,
} from "class-validator";

export class CreateDatasetDto {
  @ApiProperty({ example: "产品帮助中心" })
  @IsString()
  name: string;

  @ApiPropertyOptional({ example: "客服知识库" })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    enum: ["keyword", "semantic", "hybrid"],
    default: "keyword",
  })
  @IsOptional()
  @IsIn(["keyword", "semantic", "hybrid"])
  retrievalMode?: "keyword" | "semantic" | "hybrid";

  @ApiPropertyOptional({
    enum: ["economy", "high_quality"],
    default: "economy",
  })
  @IsOptional()
  @IsIn(["economy", "high_quality"])
  indexingMode?: "economy" | "high_quality";

  @ApiPropertyOptional({ example: 500, default: 500 })
  @IsOptional()
  @IsInt()
  @Min(100)
  @Max(4000)
  chunkSize?: number;

  @ApiPropertyOptional({ example: 80, default: 80 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(500)
  chunkOverlap?: number;

  @ApiPropertyOptional({ example: 4, default: 4 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  topK?: number;

  @ApiPropertyOptional({ example: 0.15, default: 0.15 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  scoreThreshold?: number;
}
