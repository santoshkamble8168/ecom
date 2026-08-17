import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsEnum, IsNumberString, IsOptional, IsString, Length } from "class-validator";

const RETURN_ACTIONS = ["approve", "reject", "receive", "refund"] as const;

export class ResolveReturnDto {
  @ApiProperty({ enum: RETURN_ACTIONS })
  @IsEnum(RETURN_ACTIONS)
  action!: (typeof RETURN_ACTIONS)[number];

  @ApiPropertyOptional({ example: "499.00", description: "Required when action is 'approve' or 'refund'" })
  @IsOptional()
  @IsNumberString()
  refundAmount?: string;

  @ApiPropertyOptional({ example: "Approved — courier pickup scheduled" })
  @IsOptional()
  @IsString()
  @Length(1, 300)
  note?: string;
}
