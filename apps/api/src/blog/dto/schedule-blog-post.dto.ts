import { ApiProperty } from "@nestjs/swagger";
import { IsDateString } from "class-validator";

export class ScheduleBlogPostDto {
  @ApiProperty({ example: "2026-09-01T09:00:00.000Z" })
  @IsDateString()
  scheduledAt!: string;
}
