import { ApiProperty } from "@nestjs/swagger";
import { IsEnum, IsString, Length, Matches } from "class-validator";

import { OtpChannelDto } from "./request-otp.dto";

export class VerifyOtpDto {
  @ApiProperty({ enum: OtpChannelDto })
  @IsEnum(OtpChannelDto)
  channel!: OtpChannelDto;

  @ApiProperty({ example: "customer@example.com" })
  @IsString()
  @Length(3, 255)
  destination!: string;

  @ApiProperty({ example: "123456" })
  @IsString()
  @Length(6, 6)
  @Matches(/^\d{6}$/, { message: "OTP must be 6 digits" })
  code!: string;
}
