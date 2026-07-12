import { MiddlewareConsumer, Module, NestModule } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";

import { AdminModule } from "./admin/admin.module";
import { AuditModule } from "./audit/audit.module";
import { AuthModule } from "./auth/auth.module";
import { CartModule } from "./cart/cart.module";
import { CatalogModule } from "./catalog/catalog.module";
import { DiscoveryModule } from "./discovery/discovery.module";
import { ProductModule } from "./product/product.module";
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
    CatalogModule,
    DiscoveryModule,
    ProductModule,
    StorefrontModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestIdMiddleware).forRoutes("*");
  }
}
