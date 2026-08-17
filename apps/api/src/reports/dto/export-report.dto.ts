import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsIn, IsObject, IsOptional } from "class-validator";

export class ExportReportDto {
  @ApiPropertyOptional({ enum: ["csv"], default: "csv" })
  @IsOptional()
  @IsIn(["csv"])
  format?: "csv";

  @ApiPropertyOptional({ type: "object", additionalProperties: true })
  @IsOptional()
  @IsObject()
  params?: Record<string, unknown>;
}
