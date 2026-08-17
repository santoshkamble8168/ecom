import type { ReceivePurchaseOrderItemInput } from "@ecom/types";
import { ApiProperty } from "@nestjs/swagger";
import { IsInt, IsPositive, IsString } from "class-validator";

export class ReceivePurchaseOrderItemDto implements ReceivePurchaseOrderItemInput {
  @ApiProperty({ example: "CCN-BLK-M" })
  @IsString()
  variantSku!: string;

  @ApiProperty({ example: 25 })
  @IsInt()
  @IsPositive()
  quantityReceived!: number;
}
