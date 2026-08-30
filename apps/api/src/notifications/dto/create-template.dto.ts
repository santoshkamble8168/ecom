import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { ArrayMaxSize, IsArray, IsIn, IsOptional, IsString, Matches, MaxLength } from "class-validator";

import { TEMPLATE_KEY_PATTERN } from "../notifications.constants";

const CHANNELS = ["email", "sms"] as const;
const CATEGORIES = ["transactional", "marketing", "operational"] as const;

export class CreateNotificationTemplateDto {
  @ApiProperty({ example: "order.confirmed.email" })
  @IsString()
  @Matches(TEMPLATE_KEY_PATTERN, { message: "key must be lowercase alphanumeric with dots or underscores" })
  @MaxLength(80)
  key!: string;

  @ApiProperty()
  @IsString()
  @MaxLength(120)
  name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiProperty({ enum: CHANNELS })
  @IsIn(CHANNELS)
  channel!: (typeof CHANNELS)[number];

  @ApiProperty({ enum: CATEGORIES })
  @IsIn(CATEGORIES)
  category!: (typeof CATEGORIES)[number];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(40)
  @IsString({ each: true })
  requiredVariables?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  subject?: string;

  @ApiProperty()
  @IsString()
  @MaxLength(50_000)
  body!: string;
}
