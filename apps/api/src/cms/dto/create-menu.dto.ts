import { ApiProperty } from "@nestjs/swagger";
import { IsString, Matches, MaxLength, MinLength } from "class-validator";

export class CreateMenuDto {
  @ApiProperty({ example: "main-nav" })
  @IsString()
  @Matches(/^[a-z0-9]+(-[a-z0-9]+)*$/, {
    message: "code must be lowercase alphanumeric with single hyphens (e.g. \"main-nav\")",
  })
  @MaxLength(50)
  code!: string;

  @ApiProperty({ example: "Main Navigation" })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name!: string;
}
