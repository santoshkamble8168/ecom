import { ApiProperty } from "@nestjs/swagger";
import { IsInt, IsNumberString, IsPositive, IsString } from "class-validator";

export class PurchaseOrderItemInputDto {
  @ApiProperty({ example: "CCN-BLK-M" })
  @IsString()
  variantSku!: string;

  @ApiProperty({ example: 50 })
  @IsInt()
  @IsPositive()
  quantityOrdered!: number;

  @ApiProperty({ example: "299.00" })
  @IsNumberString()
  unitCost!: string;
}
