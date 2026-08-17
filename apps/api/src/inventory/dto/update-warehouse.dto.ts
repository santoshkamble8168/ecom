import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsBoolean, IsOptional, IsString, Length } from "class-validator";

export class UpdateWarehouseDto {
  @ApiPropertyOptional({ example: "Mumbai Fulfillment Center" })
  @IsOptional()
  @IsString()
  @Length(1, 120)
  name?: string;

  @ApiPropertyOptional({ example: "Plot 12, MIDC Industrial Area" })
  @IsOptional()
  @IsString()
  @Length(1, 200)
  line1?: string;

  @ApiPropertyOptional({ example: "Near Andheri East" })
  @IsOptional()
  @IsString()
  @Length(1, 200)
  line2?: string;

  @ApiPropertyOptional({ example: "Mumbai" })
  @IsOptional()
  @IsString()
  @Length(1, 100)
  city?: string;

  @ApiPropertyOptional({ example: "Maharashtra" })
  @IsOptional()
  @IsString()
  @Length(1, 100)
  state?: string;

  @ApiPropertyOptional({ example: "400059" })
  @IsOptional()
  @IsString()
  @Length(1, 20)
  postalCode?: string;

  @ApiPropertyOptional({ example: "IN" })
  @IsOptional()
  @IsString()
  @Length(2, 2)
  country?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
