import type { UpsertTaxRuleInput } from "@ecom/types";
import { ApiProperty, ApiPropertyOptional, PartialType } from "@nestjs/swagger";
import { IsBoolean, IsInt, IsOptional, IsString, Length, Matches } from "class-validator";

export class UpsertTaxRuleDto implements UpsertTaxRuleInput {
  @ApiProperty({ example: "GST Apparel (5%)" })
  @IsString()
  @Length(1, 150)
  name!: string;

  @ApiProperty({ example: "0.0500", description: "Decimal fraction, e.g. 0.05 for 5%" })
  @IsString()
  @Matches(/^\d(\.\d{1,4})?$/)
  rate!: string;

  @ApiPropertyOptional({ default: "all" })
  @IsOptional()
  @IsString()
  @Length(1, 50)
  appliesTo?: string;

  @ApiPropertyOptional({ nullable: true, description: "Omit/null for a sitewide rule" })
  @IsOptional()
  @IsString()
  categoryId?: string | null;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsInt()
  priority?: number;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateTaxRuleDto extends PartialType(UpsertTaxRuleDto) {}
