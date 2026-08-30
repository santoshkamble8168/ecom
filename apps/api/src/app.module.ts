import { BullModule } from "@nestjs/bullmq";
import { MiddlewareConsumer, Module, NestModule } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";

import { AdminModule } from "./admin/admin.module";
import { AnalyticsModule } from "./analytics/analytics.module";
import { AuditModule } from "./audit/audit.module";
import { AuthModule } from "./auth/auth.module";
import { BlogModule } from "./blog/blog.module";
import { CartModule } from "./cart/cart.module";
import { CatalogModule } from "./catalog/catalog.module";
import { CheckoutModule } from "./checkout/checkout.module";
import { CmsModule } from "./cms/cms.module";
import { CustomersModule } from "./customers/customers.module";
import { DashboardModule } from "./dashboard/dashboard.module";
import { DiscoveryModule } from "./discovery/discovery.module";
import { InventoryModule } from "./inventory/inventory.module";
import { MarketingModule } from "./marketing/marketing.module";
import { NotificationsModule } from "./notifications/notifications.module";
import { OrdersModule } from "./orders/orders.module";
import { PaymentsModule } from "./payments/payments.module";
import { PricingModule } from "./pricing/pricing.module";
import { ProductModule } from "./product/product.module";
import { PromotionsModule } from "./promotions/promotions.module";
import { PlatformModule } from "./platform/platform.module";
import { RecommendationsModule } from "./recommendations/recommendations.module";
import { ReportsModule } from "./reports/reports.module";
import { SeoModule } from "./seo/seo.module";
import { StorefrontModule } from "./storefront/storefront.module";
import { UsersModule } from "./users/users.module";
import { RequestIdMiddleware } from "./common/middleware/request-id.middleware";
import { AppConfigModule } from "./config/config.module";
import { HealthModule } from "./health/health.module";
import { AppLoggerModule } from "./logger/logger.module";
import { PrismaModule } from "./prisma/prisma.module";
import { RedisModule } from "./redis/redis.module";

@Module({
  imports: [
    AppConfigModule,
    AppLoggerModule,
    PrismaModule,
    RedisModule,
    BullModule.forRoot({
      connection: {
        host: process.env.REDIS_HOST ?? "127.0.0.1",
        port: Number(process.env.REDIS_PORT ?? 6379),
      },
    }),
    // Global default: 60 requests/minute per IP in production. Auth OTP
    // endpoints apply stricter @Throttle() overrides. Public catalog,
    // discovery, and storefront reads use @SkipThrottle() — they are
    // high-volume, cacheable GETs and SSR triggers many calls in dev.
    ThrottlerModule.forRoot({
      throttlers: [{ ttl: 60_000, limit: process.env.NODE_ENV === "production" ? 60 : 600 }],
    }),
    HealthModule,
    AuditModule,
    AuthModule,
    UsersModule,
    AdminModule,
    CartModule,
    CheckoutModule,
    PaymentsModule,
    OrdersModule,
    CatalogModule,
    DiscoveryModule,
    ProductModule,
    StorefrontModule,
    InventoryModule,
    PricingModule,
    PromotionsModule,
    CmsModule,
    BlogModule,
    MarketingModule,
    DashboardModule,
    CustomersModule,
    PlatformModule,
    ReportsModule,
    NotificationsModule,
    AnalyticsModule,
    SeoModule,
    RecommendationsModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestIdMiddleware).forRoutes("*");
  }
}
