import { ApiProperty } from "@nestjs/swagger";
import { IsObject } from "class-validator";

export class PatchSettingsDto {
  @ApiProperty({ type: "object", additionalProperties: true })
  @IsObject()
  settings!: Record<string, unknown>;
}
