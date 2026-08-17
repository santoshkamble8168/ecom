import { ApiProperty } from "@nestjs/swagger";
import { IsString } from "class-validator";

export class PreviewPageQueryDto {
  @ApiProperty({ description: "Preview token — must match CMS_PREVIEW_TOKEN" })
  @IsString()
  token!: string;
}
