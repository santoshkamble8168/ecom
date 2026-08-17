import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsIn, IsInt, IsISO8601, IsOptional, IsString, Min } from "class-validator";

import { BANNER_PLACEMENTS } from "../cms.constants";

export class CreateBannerDto {
  @ApiProperty({ example: "Summer Sale Hero" })
  @IsString()
  title!: string;

  @ApiProperty()
  @IsString()
  imageUrl!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  mobileImageUrl?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  linkUrl?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  altText?: string | null;

  @ApiProperty({ enum: BANNER_PLACEMENTS })
  @IsIn(BANNER_PLACEMENTS)
  placement!: (typeof BANNER_PLACEMENTS)[number];

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsISO8601()
  startsAt?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsISO8601()
  endsAt?: string | null;
}
