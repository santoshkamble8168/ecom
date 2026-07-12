import { ApiPropertyOptional } from "@nestjs/swagger";
import { Transform, Type } from "class-transformer";
import { IsBoolean, IsInt, IsOptional, IsString, Max, MaxLength, Min } from "class-validator";

import { parseCsvFilter } from "../utils/filter.parser";

export class DiscoveryQueryDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize = 20;

  @ApiPropertyOptional({ enum: ["newest", "price_asc", "price_desc", "popular", "discount"] })
  @IsOptional()
  @IsString()
  sort?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  q?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  minPrice?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  maxPrice?: string;

  @ApiPropertyOptional({ description: "Comma-separated size slugs" })
  @IsOptional()
  @IsString()
  sizes?: string;

  @ApiPropertyOptional({ description: "Comma-separated color slugs" })
  @IsOptional()
  @IsString()
  colors?: string;

  @ApiPropertyOptional({ description: "Comma-separated brand names" })
  @IsOptional()
  @IsString()
  brands?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) => value === "true" || value === true)
  @IsBoolean()
  onSale?: boolean;

  get sizesList(): string[] {
    return parseCsvFilter(this.sizes);
  }

  get colorsList(): string[] {
    return parseCsvFilter(this.colors);
  }

  get brandsList(): string[] {
    return parseCsvFilter(this.brands);
  }
}
