import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString, Length, MaxLength } from "class-validator";

export class RecommendationQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  productSlug?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(8, 64)
  sessionId?: string;
}
