import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsEmail, IsObject, IsOptional, IsString, Length, Matches } from "class-validator";

export class UpdateProfileDto {
  @ApiPropertyOptional({ example: "Jane Doe" })
  @IsOptional()
  @IsString()
  @Length(1, 120)
  displayName?: string;

  @ApiPropertyOptional({ example: "jane@example.com" })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ example: "9876543210" })
  @IsOptional()
  @IsString()
  @Matches(/^\d{10}$/, { message: "Mobile number must be 10 digits" })
  phone?: string;

  @ApiPropertyOptional({ example: { newsletter: true, firstName: "Jane", lastName: "Doe", gender: "female" } })
  @IsOptional()
  @IsObject()
  preferences?: Record<string, unknown>;
}
