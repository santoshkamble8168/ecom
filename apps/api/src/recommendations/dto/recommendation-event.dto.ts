import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsIn, IsOptional, IsString, Length, MaxLength } from "class-validator";
import { RECOMMENDATION_SLOTS } from "@ecom/types";

export class RecommendationEventDto {
  @ApiProperty({ enum: ["recommendation_view", "recommendation_click"] })
  @IsIn(["recommendation_view", "recommendation_click"])
  name!: "recommendation_view" | "recommendation_click";

  @ApiProperty({ enum: RECOMMENDATION_SLOTS })
  @IsIn([...RECOMMENDATION_SLOTS])
  slot!: (typeof RECOMMENDATION_SLOTS)[number];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  productSlug?: string;

  @ApiProperty()
  @IsString()
  @Length(8, 64)
  sessionId!: string;
}
