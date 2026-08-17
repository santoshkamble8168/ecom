import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsEnum, IsISO8601, IsOptional, IsString, Length } from "class-validator";

const SHIPMENT_STATUSES = [
  "pending",
  "in_transit",
  "out_for_delivery",
  "delivered",
  "failed",
  "returned",
] as const;

export class AddTrackingEventDto {
  @ApiProperty({ enum: SHIPMENT_STATUSES })
  @IsEnum(SHIPMENT_STATUSES)
  status!: (typeof SHIPMENT_STATUSES)[number];

  @ApiProperty({ example: "Package out for delivery" })
  @IsString()
  @Length(1, 300)
  description!: string;

  @ApiPropertyOptional({ example: "Bengaluru Hub" })
  @IsOptional()
  @IsString()
  @Length(1, 200)
  location?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsISO8601()
  occurredAt?: string;
}
