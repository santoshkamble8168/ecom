import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString, MinLength } from "class-validator";

export class RefreshTokenDto {
  /** Non-browser clients only. Browser apps send `X-Ecom-Client` and use the httpOnly cookie instead. */
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(10)
  refreshToken?: string;
}
