import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsEnum, IsOptional, IsString, Length } from "class-validator";

const EXCHANGE_ACTIONS = ["approve", "reject", "receive", "complete"] as const;

export class ResolveExchangeDto {
  @ApiProperty({ enum: EXCHANGE_ACTIONS })
  @IsEnum(EXCHANGE_ACTIONS)
  action!: (typeof EXCHANGE_ACTIONS)[number];

  @ApiPropertyOptional({ example: "Replacement dispatched" })
  @IsOptional()
  @IsString()
  @Length(1, 300)
  note?: string;
}
