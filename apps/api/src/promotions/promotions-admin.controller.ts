import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { PERMISSIONS } from "@ecom/types";

import { CurrentUser } from "../common/decorators/current-user.decorator";
import { Permissions } from "../common/decorators/permissions.decorator";
import type { AuthenticatedUser } from "../auth/types/authenticated-user";

import { AttachCampaignCollectionsDto } from "./dto/attach-campaign-collections.dto";
import { AttachCampaignProductsDto } from "./dto/attach-campaign-products.dto";
import { ListCampaignsQueryDto } from "./dto/list-campaigns-query.dto";
import { ListCouponsQueryDto } from "./dto/list-coupons-query.dto";
import { UpdateCampaignDto } from "./dto/update-campaign.dto";
import { UpdateCouponDto } from "./dto/update-coupon.dto";
import { UpsertCampaignDto } from "./dto/upsert-campaign.dto";
import { UpsertCouponDto } from "./dto/upsert-coupon.dto";
import { PromotionsService } from "./promotions.service";

@ApiTags("admin-promotions")
@Controller("admin")
export class PromotionsAdminController {
  constructor(private readonly promotionsService: PromotionsService) {}

  @Get("coupons")
  @Permissions(PERMISSIONS.PROMOTION_READ)
  listCoupons(@Query() query: ListCouponsQueryDto) {
    return this.promotionsService.listCoupons(query);
  }

  @Post("coupons")
  @Permissions(PERMISSIONS.PROMOTION_WRITE)
  createCoupon(@Body() dto: UpsertCouponDto, @CurrentUser() admin: AuthenticatedUser) {
    return this.promotionsService.createCoupon(dto, admin.id);
  }

  @Get("coupons/:id")
  @Permissions(PERMISSIONS.PROMOTION_READ)
  getCoupon(@Param("id") id: string) {
    return this.promotionsService.getCoupon(id);
  }

  @Patch("coupons/:id")
  @Permissions(PERMISSIONS.PROMOTION_WRITE)
  updateCoupon(
    @Param("id") id: string,
    @Body() dto: UpdateCouponDto,
    @CurrentUser() admin: AuthenticatedUser,
  ) {
    return this.promotionsService.updateCoupon(id, dto, admin.id);
  }

  @Get("coupons/:id/usages")
  @Permissions(PERMISSIONS.PROMOTION_READ)
  listCouponUsages(@Param("id") id: string) {
    return this.promotionsService.listCouponUsages(id);
  }

  @Get("campaigns")
  @Permissions(PERMISSIONS.PROMOTION_READ)
  listCampaigns(@Query() query: ListCampaignsQueryDto) {
    return this.promotionsService.listCampaigns(query);
  }

  @Post("campaigns")
  @Permissions(PERMISSIONS.PROMOTION_WRITE)
  createCampaign(@Body() dto: UpsertCampaignDto, @CurrentUser() admin: AuthenticatedUser) {
    return this.promotionsService.createCampaign(dto, admin.id);
  }

  @Get("campaigns/:id")
  @Permissions(PERMISSIONS.PROMOTION_READ)
  getCampaign(@Param("id") id: string) {
    return this.promotionsService.getCampaign(id);
  }

  @Patch("campaigns/:id")
  @Permissions(PERMISSIONS.PROMOTION_WRITE)
  updateCampaign(
    @Param("id") id: string,
    @Body() dto: UpdateCampaignDto,
    @CurrentUser() admin: AuthenticatedUser,
  ) {
    return this.promotionsService.updateCampaign(id, dto, admin.id);
  }

  @Post("campaigns/:id/products")
  @Permissions(PERMISSIONS.PROMOTION_WRITE)
  attachCampaignProducts(
    @Param("id") id: string,
    @Body() dto: AttachCampaignProductsDto,
    @CurrentUser() admin: AuthenticatedUser,
  ) {
    return this.promotionsService.attachCampaignProducts(id, dto, admin.id);
  }

  @Delete("campaigns/:id/products/:variantSku")
  @Permissions(PERMISSIONS.PROMOTION_WRITE)
  detachCampaignProduct(
    @Param("id") id: string,
    @Param("variantSku") variantSku: string,
    @CurrentUser() admin: AuthenticatedUser,
  ) {
    return this.promotionsService.detachCampaignProduct(id, variantSku, admin.id);
  }

  @Post("campaigns/:id/collections")
  @Permissions(PERMISSIONS.PROMOTION_WRITE)
  attachCampaignCollections(
    @Param("id") id: string,
    @Body() dto: AttachCampaignCollectionsDto,
    @CurrentUser() admin: AuthenticatedUser,
  ) {
    return this.promotionsService.attachCampaignCollections(id, dto, admin.id);
  }

  @Delete("campaigns/:id/collections/:collectionId")
  @Permissions(PERMISSIONS.PROMOTION_WRITE)
  detachCampaignCollection(
    @Param("id") id: string,
    @Param("collectionId") collectionId: string,
    @CurrentUser() admin: AuthenticatedUser,
  ) {
    return this.promotionsService.detachCampaignCollection(id, collectionId, admin.id);
  }
}
