import { ApiPropertyOptional } from "@nestjs/swagger";
import { ArrayMaxSize, IsArray, IsBoolean, IsIn, IsInt, IsOptional, IsString, Max, Min } from "class-validator";
import { RECOMMENDATION_STRATEGIES } from "@ecom/types";

export class UpdateRecommendationSlotDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({ enum: RECOMMENDATION_STRATEGIES })
  @IsOptional()
  @IsIn([...RECOMMENDATION_STRATEGIES])
  strategy?: (typeof RECOMMENDATION_STRATEGIES)[number];

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isEnabled?: boolean;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(24)
  @IsString({ each: true })
  fallbackProductSlugs?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(24)
  limit?: number;
}
