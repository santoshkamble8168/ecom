import { ApiProperty } from "@nestjs/swagger";
import { IsEnum, IsString, Length } from "class-validator";

export enum OtpChannelDto {
  email = "email",
  sms = "sms",
}

export class RequestOtpDto {
  @ApiProperty({ enum: OtpChannelDto })
  @IsEnum(OtpChannelDto)
  channel!: OtpChannelDto;

  @ApiProperty({ example: "customer@example.com" })
  @IsString()
  @Length(3, 255)
  destination!: string;
}
