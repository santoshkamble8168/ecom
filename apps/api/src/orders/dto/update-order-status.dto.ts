import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsEnum, IsOptional, IsString, Length } from "class-validator";

const ADMIN_SETTABLE_STATUSES = ["processing", "shipped", "delivered", "cancelled"] as const;

export class UpdateOrderStatusDto {
  @ApiProperty({ enum: ADMIN_SETTABLE_STATUSES })
  @IsEnum(ADMIN_SETTABLE_STATUSES)
  status!: (typeof ADMIN_SETTABLE_STATUSES)[number];

  @ApiPropertyOptional({ example: "Fulfilled from Bengaluru warehouse" })
  @IsOptional()
  @IsString()
  @Length(1, 300)
  note?: string;
}
