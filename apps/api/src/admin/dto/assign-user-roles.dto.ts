import { ApiProperty } from "@nestjs/swagger";
import { IsArray, IsString, MinLength } from "class-validator";

export class AssignUserRolesDto {
  @ApiProperty({ example: ["catalog_manager"] })
  @IsArray()
  @IsString({ each: true })
  @MinLength(1, { each: true })
  roleNames!: string[];
}
