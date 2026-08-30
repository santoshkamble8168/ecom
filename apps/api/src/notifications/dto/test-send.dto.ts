import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsObject, IsOptional, IsString, MaxLength } from "class-validator";

export class TestSendDto {
  @ApiProperty({ example: "ops@ecom.local" })
  @IsString()
  @MaxLength(320)
  destination!: string;

  @ApiPropertyOptional({ type: Object })
  @IsOptional()
  @IsObject()
  variables?: Record<string, unknown>;
}
