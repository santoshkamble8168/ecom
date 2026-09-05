import { ApiPropertyOptional, PartialType } from "@nestjs/swagger";
import { IsBoolean, IsOptional } from "class-validator";

import { CreateCollectionDto } from "./create-collection.dto";

export class UpdateCollectionDto extends PartialType(CreateCollectionDto) {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
