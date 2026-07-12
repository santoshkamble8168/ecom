import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { SkipThrottle } from "@nestjs/throttler";
import { IsInt, IsOptional, IsString, Length, Max, Min } from "class-validator";
import { Type } from "class-transformer";

import { CurrentUser } from "../common/decorators/current-user.decorator";
import { Public } from "../common/decorators/public.decorator";
import type { AuthenticatedUser } from "../auth/types/authenticated-user";

import { CartService } from "./cart.service";

class AddCartItemDto {
  @IsString()
  productSlug!: string;

  @IsString()
  variantSku!: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(10)
  quantity?: number = 1;

  @IsOptional()
  @IsString()
  @Length(8, 64)
  sessionId?: string;
}

class UpdateCartItemDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(10)
  quantity!: number;
}

class ApplyCouponDto {
  @IsString()
  @Length(2, 32)
  code!: string;

  @IsOptional()
  @IsString()
  @Length(8, 64)
  sessionId?: string;
}

class CartMergeDto {
  @IsString()
  @Length(8, 64)
  sessionId!: string;
}

class SaveForLaterDto {
  @IsString()
  itemId!: string;

  @IsOptional()
  @IsString()
  @Length(8, 64)
  sessionId?: string;
}

@ApiTags("cart")
@SkipThrottle()
@Controller("cart")
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Public()
  @Get()
  getCart(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Query("sessionId") sessionId?: string,
  ) {
    return this.cartService.getCart(user?.id, sessionId);
  }

  @Public()
  @Post("items")
  addItem(@CurrentUser() user: AuthenticatedUser | undefined, @Body() dto: AddCartItemDto) {
    return this.cartService.addItem({
      productSlug: dto.productSlug,
      variantSku: dto.variantSku,
      quantity: dto.quantity ?? 1,
      userId: user?.id,
      sessionId: dto.sessionId,
    });
  }

  @Public()
  @Patch("items/:id")
  updateItem(
    @Param("id") id: string,
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Body() dto: UpdateCartItemDto,
    @Query("sessionId") sessionId?: string,
  ) {
    return this.cartService.updateItem(id, dto.quantity, user?.id, sessionId);
  }

  @Public()
  @Delete("items/:id")
  removeItem(
    @Param("id") id: string,
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Query("sessionId") sessionId?: string,
  ) {
    return this.cartService.removeItem(id, user?.id, sessionId);
  }

  @Public()
  @Post("coupons")
  applyCoupon(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Body() dto: ApplyCouponDto,
  ) {
    return this.cartService.applyCoupon(dto.code, user?.id, dto.sessionId);
  }

  @Public()
  @Delete("coupons/:code")
  removeCoupon(
    @Param("code") code: string,
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Query("sessionId") sessionId?: string,
  ) {
    return this.cartService.removeCoupon(code, user?.id, sessionId);
  }

  @Public()
  @Post("save-for-later")
  saveForLater(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Body() dto: SaveForLaterDto,
  ) {
    return this.cartService.saveForLater(dto.itemId, user?.id, dto.sessionId);
  }

  @Public()
  @Post("items/:id/move-to-cart")
  moveToCart(
    @Param("id") id: string,
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Query("sessionId") sessionId?: string,
  ) {
    return this.cartService.moveToCart(id, user?.id, sessionId);
  }

  @Post("merge")
  merge(@CurrentUser() user: AuthenticatedUser, @Body() dto: CartMergeDto) {
    return this.cartService.merge(dto.sessionId, user.id);
  }

  @Public()
  @Post("wishlist/:id/move-to-cart")
  moveWishlistToCart(
    @Param("id") id: string,
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Query("sessionId") sessionId?: string,
  ) {
    return this.cartService.moveWishlistToCart(id, user?.id, sessionId);
  }
}
