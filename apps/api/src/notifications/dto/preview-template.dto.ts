import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsInt, IsObject, IsOptional, Min } from "class-validator";
import { Type } from "class-transformer";

export class PreviewTemplateDto {
  @ApiProperty({ type: Object })
  @IsObject()
  variables!: Record<string, unknown>;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  version?: number;
}
