import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsBoolean, IsOptional, IsString, Length, Matches } from "class-validator";

export class CreateAddressDto {
  @ApiPropertyOptional({ example: "Home" })
  @IsOptional()
  @IsString()
  @Length(1, 50)
  label?: string;

  @ApiProperty({ example: "Jane Doe" })
  @IsString()
  @Length(2, 120)
  fullName!: string;

  @ApiProperty({ example: "9876543210" })
  @IsString()
  @Length(10, 15)
  @Matches(/^\d+$/)
  phone!: string;

  @ApiProperty({ example: "42 MG Road" })
  @IsString()
  @Length(3, 200)
  line1!: string;

  @ApiPropertyOptional({ example: "Apt 4B" })
  @IsOptional()
  @IsString()
  @Length(1, 200)
  line2?: string;

  @ApiProperty({ example: "Bengaluru" })
  @IsString()
  @Length(2, 100)
  city!: string;

  @ApiProperty({ example: "Karnataka" })
  @IsString()
  @Length(2, 100)
  state!: string;

  @ApiProperty({ example: "560001" })
  @IsString()
  @Length(4, 10)
  @Matches(/^\d+$/)
  postalCode!: string;

  @ApiPropertyOptional({ example: "IN", default: "IN" })
  @IsOptional()
  @IsString()
  @Length(2, 2)
  country?: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}
