import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Post,
  Query,
  Req,
} from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { SkipThrottle } from "@nestjs/throttler";
import { IsOptional, IsString, Length } from "class-validator";

import type { AuthenticatedUser } from "../auth/types/authenticated-user";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { Public } from "../common/decorators/public.decorator";

import { PaymentsService } from "./payments.service";

class InitiatePaymentDto {
  @IsString()
  checkoutId!: string;

  @IsOptional()
  @IsString()
  @Length(8, 64)
  sessionId?: string;
}

class ConfirmRazorpayDto {
  @IsString()
  razorpayOrderId!: string;

  @IsString()
  razorpayPaymentId!: string;

  @IsString()
  razorpaySignature!: string;

  @IsOptional()
  @IsString()
  @Length(8, 64)
  sessionId?: string;
}

@ApiTags("payments")
@SkipThrottle()
@Controller()
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post("payments")
  initiate(@CurrentUser() user: AuthenticatedUser, @Body() dto: InitiatePaymentDto) {
    return this.paymentsService.initiate(dto.checkoutId, user.id, dto.sessionId);
  }

  @Public()
  @Get("payments/:id")
  getById(
    @Param("id") id: string,
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Query("sessionId") sessionId?: string,
  ) {
    return this.paymentsService.getById(id, user?.id, sessionId);
  }

  @Post("payments/:id/retry")
  retry(
    @Param("id") id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Query("sessionId") sessionId?: string,
  ) {
    return this.paymentsService.retry(id, user.id, sessionId);
  }

  @Post("payments/:id/mock-capture")
  mockCapture(
    @Param("id") id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Query("sessionId") sessionId?: string,
  ) {
    return this.paymentsService.mockCapture(id, user.id, sessionId);
  }

  @Post("payments/:id/confirm")
  confirmRazorpay(
    @Param("id") id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ConfirmRazorpayDto,
  ) {
    return this.paymentsService.confirmRazorpayClient(
      id,
      {
        razorpayOrderId: dto.razorpayOrderId,
        razorpayPaymentId: dto.razorpayPaymentId,
        razorpaySignature: dto.razorpaySignature,
      },
      user.id,
      dto.sessionId,
    );
  }

  @Public()
  @Post("payments/webhooks/razorpay")
  razorpayWebhook(
    @Req() req: { rawBody?: Buffer; body?: unknown },
    @Headers("x-razorpay-signature") signature?: string,
  ) {
    const rawBody =
      req.rawBody?.toString("utf8") ??
      (typeof req.body === "string" ? req.body : JSON.stringify(req.body ?? {}));
    return this.paymentsService.handleRazorpayWebhook(rawBody, signature);
  }

  @Public()
  @Post("checkout/:id/cod")
  confirmCod(
    @Param("id") id: string,
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Query("sessionId") sessionId?: string,
    @Body() body?: { sessionId?: string },
  ) {
    return this.paymentsService.confirmCod(id, user?.id, sessionId ?? body?.sessionId);
  }

  @Public()
  @Get("orders/:orderNumber")
  getOrder(
    @Param("orderNumber") orderNumber: string,
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Query("sessionId") sessionId?: string,
  ) {
    return this.paymentsService.getOrderConfirmation(orderNumber, user?.id, sessionId);
  }
}
