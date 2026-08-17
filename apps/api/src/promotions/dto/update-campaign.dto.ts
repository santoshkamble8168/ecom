import { ApiPropertyOptional, PartialType } from "@nestjs/swagger";
import { IsIn, IsOptional } from "class-validator";

import { UpsertCampaignDto } from "./upsert-campaign.dto";

export const CAMPAIGN_STATUSES = ["scheduled", "active", "ended", "cancelled"] as const;

export class UpdateCampaignDto extends PartialType(UpsertCampaignDto) {
  @ApiPropertyOptional({
    enum: CAMPAIGN_STATUSES,
    description: "Explicit status transition, validated against the campaign state machine",
  })
  @IsOptional()
  @IsIn(CAMPAIGN_STATUSES)
  status?: (typeof CAMPAIGN_STATUSES)[number];
}
