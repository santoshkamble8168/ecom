import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsNumberString, IsOptional, IsString, Length } from "class-validator";

export class CreateRefundDto {
  @ApiPropertyOptional({ example: "499.00", description: "Defaults to the full captured amount" })
  @IsOptional()
  @IsNumberString()
  amount?: string;

  @ApiProperty({ example: "Goodwill refund — delayed shipment" })
  @IsString()
  @Length(1, 300)
  reason!: string;
}
