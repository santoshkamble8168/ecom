import { ApiProperty } from "@nestjs/swagger";
import { IsInt, IsString, Length, Min } from "class-validator";

export class OrderItemDto {
  @ApiProperty({ example: "CCN-BLK-M" })
  @IsString()
  @Length(1, 64)
  variantSku!: string;

  @ApiProperty({ example: 1 })
  @IsInt()
  @Min(1)
  quantity!: number;
}
