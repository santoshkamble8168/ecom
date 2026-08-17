import type { StockTransferInput } from "@ecom/types";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsInt, IsOptional, IsPositive, IsString, Length } from "class-validator";

export class StockTransferDto implements StockTransferInput {
  @ApiProperty()
  @IsString()
  fromWarehouseId!: string;

  @ApiProperty()
  @IsString()
  toWarehouseId!: string;

  @ApiProperty({ example: "CCN-BLK-M" })
  @IsString()
  variantSku!: string;

  @ApiProperty({ example: 5 })
  @IsInt()
  @IsPositive()
  quantity!: number;

  @ApiPropertyOptional({ example: "Rebalancing stock ahead of a sale" })
  @IsOptional()
  @IsString()
  @Length(1, 300)
  note?: string;
}
