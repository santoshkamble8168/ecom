import type { PriceSimulationInput } from "@ecom/types";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsInt, IsOptional, IsString, Min } from "class-validator";

export class PriceSimulationDto implements PriceSimulationInput {
  @ApiProperty({ example: "CCN-BLK-M" })
  @IsString()
  variantSku!: string;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  quantity?: number;

  @ApiPropertyOptional({ example: "WELCOME10" })
  @IsOptional()
  @IsString()
  couponCode?: string;
}
