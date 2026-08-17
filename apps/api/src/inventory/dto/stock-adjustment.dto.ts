import type { StockAdjustmentInput } from "@ecom/types";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsInt, IsOptional, IsString, Length, NotEquals } from "class-validator";

export class StockAdjustmentDto implements StockAdjustmentInput {
  @ApiProperty()
  @IsString()
  warehouseId!: string;

  @ApiProperty({ example: "CCN-BLK-M" })
  @IsString()
  variantSku!: string;

  @ApiProperty({ example: 10, description: "Positive to increase on-hand, negative to decrease" })
  @IsInt()
  @NotEquals(0)
  delta!: number;

  @ApiPropertyOptional({ example: "Cycle count correction" })
  @IsOptional()
  @IsString()
  @Length(1, 300)
  note?: string;
}
