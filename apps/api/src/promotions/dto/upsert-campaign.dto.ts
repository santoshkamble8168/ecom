import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsIn,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from "class-validator";

import { COUPON_TYPES } from "./upsert-coupon.dto";

export const CAMPAIGN_TYPES = ["sitewide", "collection", "product"] as const;

export class UpsertCampaignDto {
  @ApiProperty({ example: "Monsoon Flash Sale" })
  @IsString()
  @MaxLength(150)
  name!: string;

  @ApiProperty({ example: "monsoon-flash-sale" })
  @IsString()
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  slug!: string;

  @ApiProperty({ enum: CAMPAIGN_TYPES })
  @IsIn(CAMPAIGN_TYPES)
  type!: (typeof CAMPAIGN_TYPES)[number];

  @ApiPropertyOptional({ enum: COUPON_TYPES, nullable: true })
  @IsOptional()
  @IsIn(COUPON_TYPES)
  discountType?: (typeof COUPON_TYPES)[number] | null;

  @ApiPropertyOptional({ example: "15.00", nullable: true })
  @IsOptional()
  @Matches(/^\d+(\.\d{1,2})?$/)
  discountValue?: string | null;

  @ApiProperty({ example: "2026-08-20T00:00:00.000Z" })
  @IsDateString()
  startsAt!: string;

  @ApiProperty({ example: "2026-08-27T00:00:00.000Z" })
  @IsDateString()
  endsAt!: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ type: [String], description: "Variant SKUs to attach on creation" })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  productSkus?: string[];

  @ApiPropertyOptional({ type: [String], description: "Collection IDs to attach on creation" })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  collectionIds?: string[];
}
