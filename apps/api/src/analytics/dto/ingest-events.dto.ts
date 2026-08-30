import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { ANALYTICS_EVENT_NAMES, type AnalyticsEventName } from "@ecom/types";
import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsISO8601,
  IsObject,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  ValidateNested,
} from "class-validator";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export class AnalyticsEventInputDto {
  @ApiProperty()
  @IsString()
  @Matches(UUID_RE, { message: "clientEventId must be a UUID" })
  clientEventId!: string;

  @ApiProperty({ enum: ANALYTICS_EVENT_NAMES })
  @IsIn([...ANALYTICS_EVENT_NAMES])
  name!: AnalyticsEventName;

  @ApiProperty()
  @IsString()
  @MaxLength(80)
  sessionId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  path?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsISO8601()
  occurredAt?: string;

  @ApiPropertyOptional({ type: Object })
  @IsOptional()
  @IsObject()
  properties?: Record<string, unknown>;
}

export class IngestAnalyticsEventsDto {
  @ApiProperty({ type: [AnalyticsEventInputDto] })
  @IsArray()
  @ArrayMaxSize(25)
  @ValidateNested({ each: true })
  @Type(() => AnalyticsEventInputDto)
  events!: AnalyticsEventInputDto[];
}
