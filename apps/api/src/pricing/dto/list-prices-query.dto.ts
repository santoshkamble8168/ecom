import { ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsInt, IsOptional, IsString, Max, Min } from "class-validator";

export class ListPricesQueryDto {
  @ApiPropertyOptional({ description: "Filter by price list id" })
  @IsOptional()
  @IsString()
  priceListId?: string;

  @ApiPropertyOptional({ description: "Filter by variant SKU (exact match)" })
  @IsOptional()
  @IsString()
  variantSku?: string;

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
