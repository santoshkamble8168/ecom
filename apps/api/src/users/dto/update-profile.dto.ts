import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsBoolean, IsObject, IsOptional, IsString, Length } from "class-validator";

export class UpdateProfileDto {
  @ApiPropertyOptional({ example: "Jane Doe" })
  @IsOptional()
  @IsString()
  @Length(1, 120)
  displayName?: string;

  @ApiPropertyOptional({ example: { newsletter: true, sizePreference: "M" } })
  @IsOptional()
  @IsObject()
  preferences?: Record<string, unknown>;
}
