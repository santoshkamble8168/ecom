import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsBoolean, IsOptional, IsString, Length } from "class-validator";

export class CreateWarehouseDto {
  @ApiProperty({ example: "MUM1" })
  @IsString()
  @Length(1, 20)
  code!: string;

  @ApiProperty({ example: "Mumbai Fulfillment Center" })
  @IsString()
  @Length(1, 120)
  name!: string;

  @ApiProperty({ example: "Plot 12, MIDC Industrial Area" })
  @IsString()
  @Length(1, 200)
  line1!: string;

  @ApiPropertyOptional({ example: "Near Andheri East" })
  @IsOptional()
  @IsString()
  @Length(1, 200)
  line2?: string;

  @ApiProperty({ example: "Mumbai" })
  @IsString()
  @Length(1, 100)
  city!: string;

  @ApiProperty({ example: "Maharashtra" })
  @IsString()
  @Length(1, 100)
  state!: string;

  @ApiProperty({ example: "400059" })
  @IsString()
  @Length(1, 20)
  postalCode!: string;

  @ApiPropertyOptional({ default: "IN" })
  @IsOptional()
  @IsString()
  @Length(2, 2)
  country?: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
