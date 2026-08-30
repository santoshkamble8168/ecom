import { Module } from "@nestjs/common";

import { AnalyticsModule } from "../analytics/analytics.module";
import { CatalogModule } from "../catalog/catalog.module";
import { PricingModule } from "../pricing/pricing.module";

import { DeliveryService } from "./delivery.service";
import { ProductController } from "./product.controller";
import { ProductService } from "./product.service";
import { RecentlyViewedService, WishlistService } from "./wishlist.service";

@Module({
  imports: [CatalogModule, PricingModule, AnalyticsModule],
  controllers: [ProductController],
  providers: [ProductService, DeliveryService, WishlistService, RecentlyViewedService],
})
export class ProductModule {}
