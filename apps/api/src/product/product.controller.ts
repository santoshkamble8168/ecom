import { Body, Controller, Delete, Get, Param, Post, Query } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { SkipThrottle } from "@nestjs/throttler";
import { IsInt, IsOptional, IsString, Length, Matches, Min } from "class-validator";
import { Type } from "class-transformer";

import { CurrentUser } from "../common/decorators/current-user.decorator";
import { Public } from "../common/decorators/public.decorator";
import type { AuthenticatedUser } from "../auth/types/authenticated-user";

import { DeliveryService } from "./delivery.service";
import { ProductService } from "./product.service";
import { RecentlyViewedService, WishlistService } from "./wishlist.service";

class DeliveryEstimateDto {
  @IsString()
  @Length(6, 6)
  @Matches(/^\d{6}$/)
  pincode!: string;

  @IsOptional()
  @IsString()
  productSlug?: string;
}

class WishlistAddDto {
  @IsString()
  productSlug!: string;

  @IsOptional()
  @IsString()
  variantSku?: string;

  @IsOptional()
  @IsString()
  @Length(8, 64)
  sessionId?: string;
}

class RecentlyViewedDto {
  @IsString()
  productSlug!: string;

  @IsOptional()
  @IsString()
  @Length(8, 64)
  sessionId?: string;
}

class ReviewsQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  pageSize?: number = 10;
}

@ApiTags("products")
@SkipThrottle()
@Controller()
export class ProductController {
  constructor(
    private readonly productService: ProductService,
    private readonly deliveryService: DeliveryService,
    private readonly wishlistService: WishlistService,
    private readonly recentlyViewedService: RecentlyViewedService,
  ) {}

  @Public()
  @Get("products/:slug")
  getProduct(@Param("slug") slug: string) {
    return this.productService.getPdp(slug);
  }

  @Public()
  @Get("products/:slug/reviews")
  getReviews(@Param("slug") slug: string, @Query() query: ReviewsQueryDto) {
    return this.productService.listReviews(slug, query.page, query.pageSize);
  }

  @Public()
  @Post("delivery/estimate")
  estimateDelivery(@Body() dto: DeliveryEstimateDto) {
    return this.deliveryService.estimate(dto.pincode, dto.productSlug);
  }

  @Public()
  @Get("wishlist")
  listWishlist(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Query("sessionId") sessionId?: string,
  ) {
    return this.wishlistService.list(user?.id, sessionId);
  }

  @Public()
  @Post("wishlist/items")
  addWishlist(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Body() dto: WishlistAddDto,
  ) {
    return this.wishlistService.add({
      productSlug: dto.productSlug,
      variantSku: dto.variantSku,
      userId: user?.id,
      sessionId: dto.sessionId,
    });
  }

  @Public()
  @Delete("wishlist/items/:id")
  removeWishlist(
    @Param("id") id: string,
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Query("sessionId") sessionId?: string,
  ) {
    return this.wishlistService.remove(id, user?.id, sessionId);
  }

  @Public()
  @Post("recently-viewed")
  trackRecentlyViewed(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Body() dto: RecentlyViewedDto,
  ) {
    return this.recentlyViewedService.track(dto.productSlug, user?.id, dto.sessionId);
  }

  @Public()
  @Get("recently-viewed")
  listRecentlyViewed(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Query("sessionId") sessionId?: string,
  ) {
    return this.recentlyViewedService.list(user?.id, sessionId);
  }
}
