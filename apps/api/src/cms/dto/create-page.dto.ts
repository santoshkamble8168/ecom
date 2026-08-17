import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsIn, IsObject, IsOptional, IsString, Matches, MaxLength } from "class-validator";

import { PAGE_TYPES, SLUG_PATTERN } from "../cms.constants";

export class CreatePageDto {
  @ApiProperty({ enum: PAGE_TYPES })
  @IsIn(PAGE_TYPES)
  type!: (typeof PAGE_TYPES)[number];

  @ApiProperty({ example: "home" })
  @IsString()
  @Matches(SLUG_PATTERN, {
    message: "slug must be lowercase alphanumeric with single hyphens (e.g. \"privacy-policy\")",
  })
  slug!: string;

  @ApiProperty({ example: "Homepage" })
  @IsString()
  @MaxLength(200)
  title!: string;

  @ApiProperty({ type: Object, description: "Structured fields — shape depends on `type`, see packages/types/src/cms.ts" })
  @IsObject()
  fields!: Record<string, unknown>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  seoTitle?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(300)
  seoDescription?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  seoCanonicalUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  seoOgImage?: string;
}
