import { Module } from "@nestjs/common";

import { CatalogModule } from "../catalog/catalog.module";

import { DeliveryService } from "./delivery.service";
import { ProductController } from "./product.controller";
import { ProductService } from "./product.service";
import { RecentlyViewedService, WishlistService } from "./wishlist.service";

@Module({
  imports: [CatalogModule],
  controllers: [ProductController],
  providers: [ProductService, DeliveryService, WishlistService, RecentlyViewedService],
})
export class ProductModule {}
