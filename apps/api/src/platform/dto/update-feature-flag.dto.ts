import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsBoolean, IsIn, IsInt, IsOptional, Max, Min } from "class-validator";

export class UpdateFeatureFlagDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isEnabled?: boolean;

  @ApiPropertyOptional({ enum: ["all", "development", "test", "production"] })
  @IsOptional()
  @IsIn(["all", "development", "test", "production"])
  environment?: "all" | "development" | "test" | "production";

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  rolloutPercent?: number;
}
