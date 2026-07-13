import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Patch,
  Post,
  Query,
} from "@nestjs/common";
import { ApiHeader, ApiTags } from "@nestjs/swagger";
import { SkipThrottle } from "@nestjs/throttler";
import { Type } from "class-transformer";
import {
  IsEnum,
  IsOptional,
  IsString,
  Length,
  ValidateNested,
} from "class-validator";

import { CurrentUser } from "../common/decorators/current-user.decorator";
import { Public } from "../common/decorators/public.decorator";
import type { AuthenticatedUser } from "../auth/types/authenticated-user";
import { CreateAddressDto } from "../users/dto/create-address.dto";

import { CheckoutService } from "./checkout.service";

class CreateCheckoutDto {
  @IsOptional()
  @IsString()
  @Length(8, 64)
  sessionId?: string;
}

class UpdateCheckoutAddressDto {
  @IsOptional()
  @IsString()
  addressId?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => CreateAddressDto)
  guestAddress?: CreateAddressDto;

  @IsOptional()
  @IsString()
  @Length(8, 64)
  sessionId?: string;
}

class UpdateShippingDto {
  @IsString()
  shippingMethodCode!: string;

  @IsOptional()
  @IsString()
  @Length(8, 64)
  sessionId?: string;
}

class UpdatePaymentMethodDto {
  @IsEnum(["razorpay", "cod"])
  paymentMethod!: "razorpay" | "cod";

  @IsOptional()
  @IsString()
  @Length(8, 64)
  sessionId?: string;
}

@ApiTags("checkout")
@SkipThrottle()
@Controller("checkout")
export class CheckoutController {
  constructor(private readonly checkoutService: CheckoutService) {}

  @Public()
  @Post()
  create(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Body() dto: CreateCheckoutDto,
  ) {
    return this.checkoutService.create(user?.id, dto.sessionId);
  }

  @Public()
  @Get(":id")
  getById(
    @Param("id") id: string,
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Query("sessionId") sessionId?: string,
  ) {
    return this.checkoutService.getById(id, user?.id, sessionId);
  }

  @Public()
  @Get(":id/shipping-options")
  listShippingOptions(
    @Param("id") id: string,
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Query("sessionId") sessionId?: string,
  ) {
    return this.checkoutService.listShippingOptions(id, user?.id, sessionId);
  }

  @Public()
  @Patch(":id/address")
  updateAddress(
    @Param("id") id: string,
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Body() dto: UpdateCheckoutAddressDto,
  ) {
    return this.checkoutService.updateAddress(
      id,
      {
        addressId: dto.addressId,
        guestAddress: dto.guestAddress
          ? {
              label: dto.guestAddress.label ?? null,
              fullName: dto.guestAddress.fullName,
              phone: dto.guestAddress.phone,
              line1: dto.guestAddress.line1,
              line2: dto.guestAddress.line2 ?? null,
              city: dto.guestAddress.city,
              state: dto.guestAddress.state,
              postalCode: dto.guestAddress.postalCode,
              country: dto.guestAddress.country ?? "IN",
              isDefault: dto.guestAddress.isDefault ?? false,
            }
          : undefined,
        sessionId: dto.sessionId,
      },
      user?.id,
    );
  }

  @Public()
  @Patch(":id/shipping")
  updateShipping(
    @Param("id") id: string,
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Body() dto: UpdateShippingDto,
  ) {
    return this.checkoutService.updateShipping(
      id,
      dto.shippingMethodCode,
      user?.id,
      dto.sessionId,
    );
  }

  @Public()
  @Patch(":id/payment-method")
  updatePaymentMethod(
    @Param("id") id: string,
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Body() dto: UpdatePaymentMethodDto,
  ) {
    return this.checkoutService.updatePaymentMethod(
      id,
      dto.paymentMethod,
      user?.id,
      dto.sessionId,
    );
  }

  @Public()
  @Post(":id/review")
  review(
    @Param("id") id: string,
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Query("sessionId") sessionId?: string,
  ) {
    return this.checkoutService.review(id, user?.id, sessionId);
  }

  @Public()
  @Post(":id/place-order")
  @ApiHeader({ name: "Idempotency-Key", required: true })
  placeOrder(
    @Param("id") id: string,
    @Headers("idempotency-key") idempotencyKey: string,
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Query("sessionId") sessionId?: string,
  ) {
    return this.checkoutService.placeOrder(id, idempotencyKey, user?.id, sessionId);
  }
}
