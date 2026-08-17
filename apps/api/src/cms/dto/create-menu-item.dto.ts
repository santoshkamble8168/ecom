import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsBoolean, IsInt, IsOptional, IsString, Min } from "class-validator";

export class CreateMenuItemDto {
  @ApiProperty({ example: "Men" })
  @IsString()
  label!: string;

  @ApiProperty({ example: "/men" })
  @IsString()
  url!: string;

  @ApiPropertyOptional({ description: "Parent menu item id — omit/null for a top-level item" })
  @IsOptional()
  @IsString()
  parentId?: string | null;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  opensInNewTab?: boolean;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
