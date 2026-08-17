import { PERMISSIONS } from "@ecom/types";
import { Body, Controller, Get, Param, Patch, Post, Put, Query } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";

import type { AuthenticatedUser } from "../auth/types/authenticated-user";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { Permissions } from "../common/decorators/permissions.decorator";

import { CreatePriceListDto } from "./dto/create-price-list.dto";
import { ListPricesQueryDto } from "./dto/list-prices-query.dto";
import { PriceSimulationDto } from "./dto/price-simulation.dto";
import { UpsertProductPriceDto } from "./dto/upsert-product-price.dto";
import { UpdateTaxRuleDto, UpsertTaxRuleDto } from "./dto/upsert-tax-rule.dto";
import { PricingService } from "./pricing.service";

@ApiTags("admin-pricing")
@Controller("admin")
export class PricingAdminController {
  constructor(private readonly pricingService: PricingService) {}

  @Get("price-lists")
  @Permissions(PERMISSIONS.PRICING_READ)
  listPriceLists() {
    return this.pricingService.listPriceLists();
  }

  @Post("price-lists")
  @Permissions(PERMISSIONS.PRICING_WRITE)
  createPriceList(@CurrentUser() admin: AuthenticatedUser, @Body() dto: CreatePriceListDto) {
    return this.pricingService.createPriceList(dto, admin.id);
  }

  @Get("prices")
  @Permissions(PERMISSIONS.PRICING_READ)
  listPrices(@Query() query: ListPricesQueryDto) {
    return this.pricingService.listPrices(query);
  }

  @Put("prices/:variantSku")
  @Permissions(PERMISSIONS.PRICING_WRITE)
  upsertPrice(
    @Param("variantSku") variantSku: string,
    @CurrentUser() admin: AuthenticatedUser,
    @Body() dto: UpsertProductPriceDto,
  ) {
    return this.pricingService.upsertPrice(variantSku, dto, admin.id);
  }

  @Get("prices/:variantSku/history")
  @Permissions(PERMISSIONS.PRICING_READ)
  getPriceHistory(@Param("variantSku") variantSku: string) {
    return this.pricingService.getPriceHistory(variantSku);
  }

  @Post("prices/simulate")
  @Permissions(PERMISSIONS.PRICING_READ)
  simulate(@Body() dto: PriceSimulationDto) {
    return this.pricingService.simulate(dto);
  }

  @Get("tax-rules")
  @Permissions(PERMISSIONS.PRICING_READ)
  listTaxRules() {
    return this.pricingService.listTaxRules();
  }

  @Post("tax-rules")
  @Permissions(PERMISSIONS.PRICING_WRITE)
  createTaxRule(@CurrentUser() admin: AuthenticatedUser, @Body() dto: UpsertTaxRuleDto) {
    return this.pricingService.createTaxRule(dto, admin.id);
  }

  @Patch("tax-rules/:id")
  @Permissions(PERMISSIONS.PRICING_WRITE)
  updateTaxRule(
    @Param("id") id: string,
    @CurrentUser() admin: AuthenticatedUser,
    @Body() dto: UpdateTaxRuleDto,
  ) {
    return this.pricingService.updateTaxRule(id, dto, admin.id);
  }
}
