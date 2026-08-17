import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString, Length } from "class-validator";

export class CancelOrderDto {
  @ApiPropertyOptional({ example: "Ordered by mistake" })
  @IsOptional()
  @IsString()
  @Length(1, 300)
  reason?: string;
}
