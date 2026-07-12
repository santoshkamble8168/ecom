import { Body, Controller, Get, HttpCode, HttpStatus, Post } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";

import { CurrentUser } from "../common/decorators/current-user.decorator";
import { Public } from "../common/decorators/public.decorator";

import { AuthService } from "./auth.service";
import { RefreshTokenDto } from "./dto/refresh-token.dto";
import { RequestOtpDto } from "./dto/request-otp.dto";
import { VerifyOtpDto } from "./dto/verify-otp.dto";
import type { AuthenticatedUser } from "./types/authenticated-user";

// Unauthenticated endpoints have no other abuse protection, so they get a
// much stricter per-IP limit than the app-wide default (see AppModule).
const OTP_REQUEST_THROTTLE = { default: { limit: 5, ttl: 600_000 } };
const OTP_VERIFY_THROTTLE = { default: { limit: 10, ttl: 600_000 } };

@ApiTags("auth")
@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Throttle(OTP_REQUEST_THROTTLE)
  @Post("otp/request")
  @HttpCode(HttpStatus.OK)
  requestOtp(@Body() dto: RequestOtpDto) {
    return this.authService.requestOtp(dto.channel, dto.destination);
  }

  @Public()
  @Throttle(OTP_VERIFY_THROTTLE)
  @Post("otp/verify")
  @HttpCode(HttpStatus.OK)
  verifyOtp(@Body() dto: VerifyOtpDto) {
    return this.authService.verifyOtp(dto.channel, dto.destination, dto.code);
  }

  @Public()
  @Post("refresh")
  @HttpCode(HttpStatus.OK)
  refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refresh(dto.refreshToken);
  }

  @Get("me")
  me(@CurrentUser() user: AuthenticatedUser) {
    return user;
  }
}
