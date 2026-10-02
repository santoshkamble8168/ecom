import { UnauthorizedError } from "@ecom/shared";
import { Body, Controller, Get, HttpCode, HttpStatus, Post, Req, Res } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";
import type { Request, Response } from "express";

import { CurrentUser } from "../common/decorators/current-user.decorator";
import { Public } from "../common/decorators/public.decorator";
import { UsersService } from "../users/users.service";

import {
  authClientFrom,
  clearRefreshCookie,
  readRefreshCookie,
  setRefreshCookie,
} from "./auth-cookie";
import { AuthService, type IssuedTokens } from "./auth.service";
import { GoogleAuthDto } from "./dto/google-auth.dto";
import { RefreshTokenDto } from "./dto/refresh-token.dto";
import { RequestOtpDto } from "./dto/request-otp.dto";
import { VerifyOtpDto } from "./dto/verify-otp.dto";
import type { AuthenticatedUser } from "./types/authenticated-user";

// Unauthenticated endpoints have no other abuse protection, so they get a
// much stricter per-IP limit than the app-wide default (see AppModule).
const OTP_REQUEST_THROTTLE = { default: { limit: 5, ttl: 600_000 } };
const OTP_VERIFY_THROTTLE = { default: { limit: 10, ttl: 600_000 } };

type BrowserTokens = Omit<IssuedTokens, "refreshToken">;

@ApiTags("auth")
@Controller("auth")
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly usersService: UsersService,
  ) {}

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
  async verifyOtp(
    @Body() dto: VerifyOtpDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const tokens = await this.authService.verifyOtp(dto.channel, dto.destination, dto.code);
    return this.deliverTokens(tokens, request, response);
  }

  @Public()
  @Post("refresh")
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Body() dto: RefreshTokenDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const client = authClientFrom(request);
    const refreshToken = (client && readRefreshCookie(request, client)) || dto.refreshToken;
    if (!refreshToken) {
      throw new UnauthorizedError("Refresh token is missing");
    }
    try {
      const tokens = await this.authService.refresh(refreshToken);
      return this.deliverTokens(tokens, request, response);
    } catch (error) {
      if (client) clearRefreshCookie(response, client);
      throw error;
    }
  }

  @Public()
  @Post("google")
  @HttpCode(HttpStatus.OK)
  async googleAuth(
    @Body() dto: GoogleAuthDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const tokens = await this.authService.googleAuth(dto.idToken);
    return this.deliverTokens(tokens, request, response);
  }

  /** Public so an expired access token still lets the browser revoke and clear its refresh cookie. */
  @Public()
  @Post("logout")
  @HttpCode(HttpStatus.OK)
  async logout(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Body() dto: RefreshTokenDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const client = authClientFrom(request);
    const refreshToken = (client && readRefreshCookie(request, client)) || dto.refreshToken;
    if (client) clearRefreshCookie(response, client);
    if (refreshToken) {
      await this.authService.logout(refreshToken, user?.id);
    }
  }

  /** @deprecated Use GET /me instead */
  @Get("me")
  me(@CurrentUser() user: AuthenticatedUser) {
    return this.usersService.getProfile(user.id);
  }

  private deliverTokens(
    tokens: IssuedTokens,
    request: Request,
    response: Response,
  ): IssuedTokens | BrowserTokens {
    const client = authClientFrom(request);
    if (!client) return tokens;
    setRefreshCookie(response, client, tokens.refreshToken);
    return { accessToken: tokens.accessToken, expiresIn: tokens.expiresIn };
  }
}
