import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsBoolean, IsEmail, IsOptional, IsString, Length } from "class-validator";

export class CreateSupplierDto {
  @ApiProperty({ example: "Fabrico Textiles Pvt Ltd" })
  @IsString()
  @Length(1, 150)
  name!: string;

  @ApiPropertyOptional({ example: "orders@fabrico.example" })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ example: "+91-9876543210" })
  @IsOptional()
  @IsString()
  @Length(1, 30)
  phone?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
