import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
} from "class-validator";

export const COUPON_TYPES = ["percent", "fixed", "free_shipping"] as const;

export class UpsertCouponDto {
  @ApiProperty({ example: "VIP20" })
  @IsString()
  @MaxLength(64)
  code!: string;

  @ApiPropertyOptional({ example: "20% off for VIP customers, one use per customer" })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiProperty({ enum: COUPON_TYPES })
  @IsIn(COUPON_TYPES)
  type!: (typeof COUPON_TYPES)[number];

  @ApiProperty({ example: "20.00" })
  @IsString()
  @Matches(/^\d+(\.\d{1,2})?$/)
  value!: string;

  @ApiPropertyOptional({ example: "500.00", nullable: true })
  @IsOptional()
  @Matches(/^\d+(\.\d{1,2})?$/)
  minCartValue?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsInt()
  @Min(1)
  maxUses?: number | null;

  @ApiPropertyOptional({ nullable: true, description: "Max times a single customer may use this coupon" })
  @IsOptional()
  @IsInt()
  @Min(1)
  perUserLimit?: number | null;

  @ApiPropertyOptional({ default: false, description: "Whether this coupon can be stacked with others" })
  @IsOptional()
  @IsBoolean()
  combinable?: boolean;

  @ApiPropertyOptional({ type: [String], description: "Empty = no category restriction" })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  eligibleCategoryIds?: string[];

  @ApiPropertyOptional({ type: [String], description: "Empty = no collection restriction" })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  eligibleCollectionIds?: string[];

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsDateString()
  expiresAt?: string | null;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
