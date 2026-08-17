import type { CreatePurchaseOrderInput } from "@ecom/types";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { ArrayMinSize, IsArray, IsDateString, IsOptional, IsString, Length, ValidateNested } from "class-validator";

import { PurchaseOrderItemInputDto } from "./purchase-order-item-input.dto";

export class CreatePurchaseOrderDto implements CreatePurchaseOrderInput {
  @ApiProperty()
  @IsString()
  supplierId!: string;

  @ApiProperty()
  @IsString()
  warehouseId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  expectedAt?: string;

  @ApiPropertyOptional({ example: "Restock ahead of festive season" })
  @IsOptional()
  @IsString()
  @Length(1, 300)
  note?: string;

  @ApiProperty({ type: [PurchaseOrderItemInputDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => PurchaseOrderItemInputDto)
  items!: PurchaseOrderItemInputDto[];
}
