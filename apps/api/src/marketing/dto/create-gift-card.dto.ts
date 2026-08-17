import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsDateString, IsOptional, IsString, Matches } from "class-validator";

export class CreateGiftCardDto {
  @ApiProperty({ example: "500.00" })
  @IsString()
  @Matches(/^\d+(\.\d{1,2})?$/)
  initialValue!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  expiresAt?: string | null;
}
