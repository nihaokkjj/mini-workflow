import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class CreateDocumentDto {
  @ApiProperty({ example: "退款规则" })
  name: string;

  @ApiProperty({ enum: ["text", "markdown", "file"], example: "markdown" })
  sourceType: "text" | "markdown" | "file";

  @ApiPropertyOptional({ example: "https://example.com/docs/refund-policy" })
  sourceUri?: string;

  @ApiProperty({ example: "# 退款规则\n7 天内支持退款" })
  content: string;

  @ApiPropertyOptional({ example: { locale: "zh-CN" } })
  metadata?: Record<string, unknown>;
}
