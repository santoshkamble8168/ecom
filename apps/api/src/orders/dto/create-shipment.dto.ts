import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsOptional,
  IsString,
  Length,
  ValidateNested,
} from "class-validator";

import { OrderItemDto } from "./order-item.dto";

export class CreateShipmentDto {
  @ApiPropertyOptional({ example: "delhivery" })
  @IsOptional()
  @IsString()
  @Length(1, 64)
  courierCode?: string;

  @ApiPropertyOptional({ example: "DL123456789IN" })
  @IsOptional()
  @IsString()
  @Length(1, 64)
  trackingNumber?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  estimatedDeliveryAt?: string;

  @ApiProperty({ type: [OrderItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items!: OrderItemDto[];
}
