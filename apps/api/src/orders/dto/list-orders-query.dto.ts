import { ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from "class-validator";

const ADMIN_FILTER_STATUSES = [
  "pending_payment",
  "confirmed",
  "processing",
  "shipped",
  "delivered",
  "return_requested",
  "returned",
  "exchange_requested",
  "exchanged",
  "cancelled",
  "failed",
] as const;

export class ListOrdersQueryDto {
  @ApiPropertyOptional({ enum: ADMIN_FILTER_STATUSES })
  @IsOptional()
  @IsIn(ADMIN_FILTER_STATUSES)
  status?: (typeof ADMIN_FILTER_STATUSES)[number];

  @ApiPropertyOptional({ description: "Search by order number, customer email, or SKU" })
  @IsOptional()
  @IsString()
  q?: string;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number;
}
