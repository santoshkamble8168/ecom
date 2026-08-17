import { ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsIn, IsInt, IsOptional, Max, Min } from "class-validator";

const CAMPAIGN_FILTER_STATUSES = ["scheduled", "active", "ended", "cancelled"] as const;

export class ListCampaignsQueryDto {
  @ApiPropertyOptional({ enum: CAMPAIGN_FILTER_STATUSES })
  @IsOptional()
  @IsIn(CAMPAIGN_FILTER_STATUSES)
  status?: (typeof CAMPAIGN_FILTER_STATUSES)[number];

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number;
}
