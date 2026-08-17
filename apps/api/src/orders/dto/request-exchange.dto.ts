import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { ArrayMinSize, IsArray, IsOptional, IsString, Length, ValidateNested } from "class-validator";

import { OrderItemDto } from "./order-item.dto";

export class RequestExchangeDto {
  @ApiProperty({ example: "size_too_small" })
  @IsString()
  @Length(1, 64)
  reasonCode!: string;

  @ApiProperty({ type: [OrderItemDto], description: "Items from the order being exchanged" })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  originalItems!: OrderItemDto[];

  @ApiProperty({ type: [OrderItemDto], description: "Desired replacement variants" })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  desiredItems!: OrderItemDto[];

  @ApiPropertyOptional({ example: "Need a size up" })
  @IsOptional()
  @IsString()
  @Length(1, 1000)
  comments?: string;
}
