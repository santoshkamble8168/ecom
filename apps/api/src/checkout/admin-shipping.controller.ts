import { Body, Controller, Get, Param, Patch } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { PERMISSIONS } from "@ecom/types";
import { Type } from "class-transformer";
import { IsNumber, Min } from "class-validator";

import type { AuthenticatedUser } from "../auth/types/authenticated-user";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { Permissions } from "../common/decorators/permissions.decorator";

import { CheckoutService } from "./checkout.service";

class UpdateShippingFeeDto {
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  baseFee!: number;
}

@ApiTags("admin-shipping")
@Controller("admin/shipping-methods")
export class AdminShippingController {
  constructor(private readonly checkoutService: CheckoutService) {}

  @Get()
  @Permissions(PERMISSIONS.SETTINGS_READ)
  list() {
    return this.checkoutService.listShippingMethodsForAdmin();
  }

  @Patch(":code")
  @Permissions(PERMISSIONS.SETTINGS_WRITE)
  update(
    @CurrentUser() actor: AuthenticatedUser,
    @Param("code") code: string,
    @Body() dto: UpdateShippingFeeDto,
  ) {
    return this.checkoutService.updateShippingFee(code, dto.baseFee, actor.id);
  }
}
