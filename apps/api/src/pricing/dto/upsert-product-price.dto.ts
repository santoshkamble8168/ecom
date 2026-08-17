import type { UpsertProductPriceInput } from "@ecom/types";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsISO8601, IsOptional, IsString, Length, Matches } from "class-validator";

const MONEY_PATTERN = /^\d+(\.\d{1,2})?$/;

export class UpsertProductPriceDto implements Omit<UpsertProductPriceInput, "variantSku"> {
  @ApiPropertyOptional({ description: "Defaults to the price list with isDefault: true when omitted" })
  @IsOptional()
  @IsString()
  priceListId?: string;

  @ApiProperty({ example: "999.00" })
  @IsString()
  @Matches(MONEY_PATTERN)
  mrp!: string;

  @ApiProperty({ example: "799.00" })
  @IsString()
  @Matches(MONEY_PATTERN)
  sellingPrice!: string;

  @ApiPropertyOptional({ example: "649.00", nullable: true, description: "Pass null to clear an existing sale" })
  @IsOptional()
  @IsString()
  @Matches(MONEY_PATTERN)
  salePrice?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsISO8601()
  saleStartsAt?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsISO8601()
  saleEndsAt?: string | null;

  @ApiPropertyOptional({ example: "Festive season promo" })
  @IsOptional()
  @IsString()
  @Length(1, 300)
  reason?: string;
}
