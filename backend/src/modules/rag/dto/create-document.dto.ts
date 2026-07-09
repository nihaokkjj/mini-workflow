import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsString, IsOptional, IsIn } from "class-validator";

export class CreateDocumentDto {
  @ApiProperty({ example: "退款规则" })
  @IsString()
  name: string;

  @ApiProperty({ enum: ["text", "markdown", "file"], example: "markdown" })
  @IsIn(["text", "markdown", "file"])
  sourceType: "text" | "markdown" | "file";

  @ApiPropertyOptional({ example: "https://example.com/docs/refund-policy" })
  @IsOptional()
  @IsString()
  sourceUri?: string;

  @ApiProperty({ example: "# 退款规则\n7 天内支持退款" })
  @IsString()
  content: string;

  @ApiPropertyOptional({ example: { locale: "zh-CN" } })
  @IsOptional()
  metadata?: Record<string, unknown>;
}
