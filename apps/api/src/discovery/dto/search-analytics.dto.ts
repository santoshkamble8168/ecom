import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsInt, IsOptional, IsString, MaxLength, Min } from "class-validator";

export class SearchAnalyticsDto {
  @ApiProperty()
  @IsString()
  @MaxLength(200)
  query!: string;

  @ApiProperty()
  @IsInt()
  @Min(0)
  resultCount!: number;

  @ApiPropertyOptional()
  @IsOptional()
  filters?: Record<string, unknown>;
}
