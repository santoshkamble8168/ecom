import { MiddlewareConsumer, Module, NestModule } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";

import { AuthModule } from "./auth/auth.module";
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
    // Global default: 60 requests/minute per IP. Individual public,
    // unauthenticated endpoints (OTP request/verify) apply a stricter
    // @Throttle() override since they have no other abuse protection.
    ThrottlerModule.forRoot({
      throttlers: [{ ttl: 60_000, limit: 60 }],
    }),
    HealthModule,
    AuthModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestIdMiddleware).forRoutes("*");
  }
}
