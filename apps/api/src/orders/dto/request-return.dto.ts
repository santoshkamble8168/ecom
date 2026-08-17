import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { ArrayMinSize, IsArray, IsOptional, IsString, Length, ValidateNested } from "class-validator";

import { OrderItemDto } from "./order-item.dto";

export class RequestReturnDto {
  @ApiProperty({ example: "size_issue" })
  @IsString()
  @Length(1, 64)
  reasonCode!: string;

  @ApiProperty({ type: [OrderItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items!: OrderItemDto[];

  @ApiPropertyOptional({ example: "The size runs too small" })
  @IsOptional()
  @IsString()
  @Length(1, 1000)
  comments?: string;

  @ApiPropertyOptional({ type: [String], description: "Uploaded evidence photo URLs" })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  evidenceUrls?: string[];
}
